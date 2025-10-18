import { Result } from '@lifeOS/core/shared/result';
import { BaseError } from '@lifeOS/core/shared/errors';

/**
 * File metadata
 */
export interface FileMetadata {
  path: string;
  size: number;
  mimeType: string;
  uploadedAt: Date;
}

/**
 * File upload options
 */
export interface FileUploadOptions {
  filename?: string; // Override filename
  folder?: string; // Subfolder path
  metadata?: Record<string, unknown>; // Custom metadata
}

/**
 * File Storage Interface
 *
 * Abstraction for file storage operations (local filesystem or cloud storage).
 * Supports storing invoice PDFs and other document attachments.
 */
export interface IFileStorage {
  /**
   * Store a file from buffer
   *
   * @param buffer File content as buffer
   * @param filename Original filename
   * @param options Upload options
   * @returns Result with stored file path
   */
  store(
    buffer: Buffer,
    filename: string,
    options?: FileUploadOptions
  ): Promise<Result<string, BaseError>>;

  /**
   * Store a file from local file path
   *
   * @param sourcePath Local file system path
   * @param options Upload options
   * @returns Result with stored file path
   */
  storeFromPath(
    sourcePath: string,
    options?: FileUploadOptions
  ): Promise<Result<string, BaseError>>;

  /**
   * Retrieve file as buffer
   *
   * @param path Stored file path
   * @returns Result with file buffer
   */
  retrieve(path: string): Promise<Result<Buffer, BaseError>>;

  /**
   * Get file stream (for large files)
   *
   * @param path Stored file path
   * @returns Result with readable stream
   */
  getStream(path: string): Promise<Result<NodeJS.ReadableStream, BaseError>>;

  /**
   * Get file URL (signed URL for downloads)
   *
   * @param path Stored file path
   * @param expiresInSeconds URL expiration time
   * @returns Result with file URL
   */
  getUrl(path: string, expiresInSeconds?: number): Promise<Result<string, BaseError>>;

  /**
   * Delete a file
   *
   * @param path Stored file path
   * @returns Result indicating success or failure
   */
  delete(path: string): Promise<Result<void, BaseError>>;

  /**
   * Check if file exists
   *
   * @param path Stored file path
   * @returns Result with existence boolean
   */
  exists(path: string): Promise<Result<boolean, BaseError>>;

  /**
   * Get file metadata (size, type, etc.)
   *
   * @param path Stored file path
   * @returns Result with file metadata
   */
  getMetadata(path: string): Promise<Result<FileMetadata, BaseError>>;

  /**
   * Move/rename a file
   *
   * @param sourcePath Current file path
   * @param destinationPath New file path
   * @returns Result with new path
   */
  move(sourcePath: string, destinationPath: string): Promise<Result<string, BaseError>>;

  /**
   * Copy a file
   *
   * @param sourcePath Source file path
   * @param destinationPath Destination file path
   * @returns Result with new path
   */
  copy(sourcePath: string, destinationPath: string): Promise<Result<string, BaseError>>;

  /**
   * List files in a directory
   *
   * @param folder Folder path
   * @returns Result with array of file paths
   */
  list(folder: string): Promise<Result<string[], BaseError>>;

  /**
   * Get total storage size used
   *
   * @param folder Optional folder to check (or root)
   * @returns Result with size in bytes
   */
  getStorageSize(folder?: string): Promise<Result<number, BaseError>>;
}
