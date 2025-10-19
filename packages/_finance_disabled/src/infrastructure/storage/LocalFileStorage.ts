import { promises as fs } from 'fs';
import * as path from 'path';
import { Result } from '@lifeOS/core/shared/result';
import { BaseError, NotFoundError, DatabaseError } from '@lifeOS/core/shared/errors';
import { IFileStorage, FileUploadOptions, FileMetadata } from '../../domain/interfaces';

/**
 * Local File Storage Implementation
 *
 * Stores invoice PDFs on the local filesystem with organized directory structure.
 * Files are organized by year/month for easy browsing and management.
 *
 * Directory structure:
 * {baseDir}/
 *   └── invoices/
 *       └── {year}/
 *           └── {month}/
 *               └── {invoiceId}.pdf
 *
 * All operations return Result<T, E> for functional error handling.
 */
export class LocalFileStorage implements IFileStorage {
  private readonly baseDir: string;
  private readonly invoicesDir: string;

  /**
   * Initialize local file storage
   * @param baseDir Base directory for all storage (default: ./data)
   */
  constructor(baseDir: string = './data') {
    this.baseDir = baseDir;
    this.invoicesDir = path.join(baseDir, 'invoices');
  }

  /**
   * Initialize storage directories
   * Creates base directory structure if it doesn't exist
   */
  async initialize(): Promise<Result<void, BaseError>> {
    try {
      await fs.mkdir(this.invoicesDir, { recursive: true });
      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to initialize file storage directories', error)
      );
    }
  }

  /**
   * Store a file
   *
   * @param buffer File contents as buffer
   * @param filename Original filename
   * @param options Upload options (invoiceId, contentType, etc.)
   * @returns Relative path to stored file
   */
  async store(
    buffer: Buffer,
    filename: string,
    options?: FileUploadOptions
  ): Promise<Result<string, BaseError>> {
    try {
      // Generate organized path: invoices/{year}/{month}/{invoiceId or filename}
      const now = new Date();
      const year = now.getFullYear().toString();
      const month = (now.getMonth() + 1).toString().padStart(2, '0');

      // Use invoiceId from options if provided, otherwise use sanitized filename
      const finalFilename = options?.invoiceId
        ? `${options.invoiceId}.pdf`
        : this.sanitizeFilename(filename);

      const relativePath = path.join('invoices', year, month, finalFilename);
      const absolutePath = path.join(this.baseDir, relativePath);

      // Create directory if it doesn't exist
      const directory = path.dirname(absolutePath);
      await fs.mkdir(directory, { recursive: true });

      // Write file
      await fs.writeFile(absolutePath, buffer);

      return Result.ok(relativePath);
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to store file', error));
    }
  }

  /**
   * Retrieve a file
   *
   * @param filePath Relative path to file (returned from store())
   * @returns File contents as buffer
   */
  async retrieve(filePath: string): Promise<Result<Buffer, BaseError>> {
    try {
      const absolutePath = path.join(this.baseDir, filePath);

      // Check if file exists
      const existsResult = await this.exists(filePath);
      if (existsResult.isFail()) {
        return Result.fail(existsResult.error);
      }

      if (!existsResult.value) {
        return Result.fail(new NotFoundError('File', filePath));
      }

      // Read file
      const buffer = await fs.readFile(absolutePath);
      return Result.ok(buffer);
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to retrieve file', error));
    }
  }

  /**
   * Delete a file
   *
   * @param filePath Relative path to file
   */
  async delete(filePath: string): Promise<Result<void, BaseError>> {
    try {
      const absolutePath = path.join(this.baseDir, filePath);

      // Check if file exists
      const existsResult = await this.exists(filePath);
      if (existsResult.isFail()) {
        return Result.fail(existsResult.error);
      }

      if (!existsResult.value) {
        return Result.fail(new NotFoundError('File', filePath));
      }

      // Delete file
      await fs.unlink(absolutePath);

      // Try to clean up empty directories (year/month)
      await this.cleanupEmptyDirectories(absolutePath);

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to delete file', error));
    }
  }

  /**
   * Get URL for file access
   *
   * For local storage, returns a file:// URL or relative path
   * In production with API server, this would return an HTTP URL to download endpoint
   *
   * @param filePath Relative path to file
   * @param expiresInSeconds Not used for local storage (no signed URLs)
   * @returns File URL or path
   */
  async getUrl(
    filePath: string,
    expiresInSeconds?: number
  ): Promise<Result<string, BaseError>> {
    try {
      // Check if file exists
      const existsResult = await this.exists(filePath);
      if (existsResult.isFail()) {
        return Result.fail(existsResult.error);
      }

      if (!existsResult.value) {
        return Result.fail(new NotFoundError('File', filePath));
      }

      // For local storage, return relative path that can be used with API endpoint
      // In production: /api/files/download?path={filePath}
      const url = `/api/files/download?path=${encodeURIComponent(filePath)}`;

      return Result.ok(url);
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to generate file URL', error));
    }
  }

  /**
   * Check if file exists
   *
   * @param filePath Relative path to file
   * @returns True if file exists, false otherwise
   */
  async exists(filePath: string): Promise<Result<boolean, BaseError>> {
    try {
      const absolutePath = path.join(this.baseDir, filePath);

      try {
        await fs.access(absolutePath);
        return Result.ok(true);
      } catch {
        return Result.ok(false);
      }
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to check file existence', error));
    }
  }

  /**
   * Get file metadata
   *
   * @param filePath Relative path to file
   * @returns File metadata (size, created/modified dates, mimetype)
   */
  async getMetadata(filePath: string): Promise<Result<FileMetadata, BaseError>> {
    try {
      const absolutePath = path.join(this.baseDir, filePath);

      // Check if file exists
      const existsResult = await this.exists(filePath);
      if (existsResult.isFail()) {
        return Result.fail(existsResult.error);
      }

      if (!existsResult.value) {
        return Result.fail(new NotFoundError('File', filePath));
      }

      // Get file stats
      const stats = await fs.stat(absolutePath);

      const metadata: FileMetadata = {
        size: stats.size,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime,
        contentType: this.getContentType(filePath),
      };

      return Result.ok(metadata);
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to get file metadata', error));
    }
  }

  /**
   * List all files in a directory
   *
   * @param directoryPath Relative directory path (e.g., 'invoices/2025/01')
   * @returns Array of file paths
   */
  async listFiles(directoryPath: string): Promise<Result<string[], BaseError>> {
    try {
      const absolutePath = path.join(this.baseDir, directoryPath);

      // Check if directory exists
      try {
        const stats = await fs.stat(absolutePath);
        if (!stats.isDirectory()) {
          return Result.fail(
            new DatabaseError(`Path is not a directory: ${directoryPath}`)
          );
        }
      } catch {
        return Result.fail(new NotFoundError('Directory', directoryPath));
      }

      // Read directory contents
      const entries = await fs.readdir(absolutePath, { withFileTypes: true });

      // Filter only files (not subdirectories)
      const files = entries
        .filter((entry) => entry.isFile())
        .map((entry) => path.join(directoryPath, entry.name));

      return Result.ok(files);
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to list files', error));
    }
  }

  /**
   * Get total storage size
   *
   * @returns Total size in bytes
   */
  async getTotalSize(): Promise<Result<number, BaseError>> {
    try {
      let totalSize = 0;

      const calculateSize = async (dirPath: string): Promise<void> => {
        try {
          const entries = await fs.readdir(dirPath, { withFileTypes: true });

          for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);

            if (entry.isDirectory()) {
              await calculateSize(fullPath);
            } else if (entry.isFile()) {
              const stats = await fs.stat(fullPath);
              totalSize += stats.size;
            }
          }
        } catch {
          // Ignore errors for individual files/directories
        }
      };

      await calculateSize(this.invoicesDir);

      return Result.ok(totalSize);
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to calculate storage size', error));
    }
  }

  /**
   * Clean up storage
   * Removes orphaned files, empty directories, etc.
   */
  async cleanup(): Promise<Result<{ deletedFiles: number; freedSpace: number }, BaseError>> {
    try {
      let deletedFiles = 0;
      let freedSpace = 0;

      // In a real implementation, this would:
      // 1. Find files not referenced in database
      // 2. Delete old temporary files
      // 3. Remove empty directories
      // 4. Compress old files

      // For now, just remove empty directories
      await this.cleanupEmptyDirectories(this.invoicesDir);

      return Result.ok({ deletedFiles, freedSpace });
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to cleanup storage', error));
    }
  }

  // ==================== Private Helper Methods ====================

  /**
   * Sanitize filename to prevent directory traversal attacks
   */
  private sanitizeFilename(filename: string): string {
    // Remove any path components
    let sanitized = path.basename(filename);

    // Remove any non-alphanumeric characters except dots, dashes, underscores
    sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '_');

    // Ensure .pdf extension
    if (!sanitized.toLowerCase().endsWith('.pdf')) {
      sanitized += '.pdf';
    }

    return sanitized;
  }

  /**
   * Get content type based on file extension
   */
  private getContentType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();

    const mimeTypes: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.txt': 'text/plain',
      '.json': 'application/json',
    };

    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Clean up empty directories after file deletion
   */
  private async cleanupEmptyDirectories(filePath: string): Promise<void> {
    try {
      // Get directory of the file
      let directory = path.dirname(filePath);

      // Walk up the directory tree and remove empty directories
      while (directory.startsWith(this.invoicesDir)) {
        const entries = await fs.readdir(directory);

        // If directory is empty, delete it
        if (entries.length === 0) {
          await fs.rmdir(directory);
          directory = path.dirname(directory);
        } else {
          // Directory not empty, stop walking up
          break;
        }
      }
    } catch {
      // Ignore errors during cleanup
    }
  }
}
