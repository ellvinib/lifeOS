/**
 * EncryptionService
 *
 * AES-256-GCM encryption for sensitive data like OAuth tokens.
 * Uses Node.js crypto module for secure encryption.
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { IEncryptionService } from '../../domain/interfaces/IEncryptionService';

export class EncryptionService implements IEncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16; // 128 bits
  private readonly saltLength = 64;
  private readonly tagLength = 16;
  private readonly key: Buffer;

  constructor(encryptionKey: string) {
    if (!encryptionKey || encryptionKey.length < 32) {
      throw new Error('Encryption key must be at least 32 characters');
    }
    // Derive a key from the password using scrypt
    const salt = Buffer.from('lifeOS-finance-encryption-salt'); // In production, store this securely
    this.key = scryptSync(encryptionKey, salt, this.keyLength);
  }

  /**
   * Encrypt a string value
   * Returns format: iv:encrypted:authTag
   */
  public encrypt(plainText: string): string {
    try {
      const iv = randomBytes(this.ivLength);
      const cipher = createCipheriv(this.algorithm, this.key, iv);

      let encrypted = cipher.update(plainText, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const authTag = cipher.getAuthTag();

      // Return format: iv:encrypted:authTag (all hex encoded)
      return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
    } catch (error) {
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Decrypt an encrypted string
   */
  public decrypt(encryptedText: string): string {
    try {
      const parts = encryptedText.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted text format');
      }

      const [ivHex, encrypted, authTagHex] = parts;
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');

      const decipher = createDecipheriv(this.algorithm, this.key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Encrypt an object (serializes to JSON first)
   */
  public encryptObject<T>(obj: T): string {
    const json = JSON.stringify(obj);
    return this.encrypt(json);
  }

  /**
   * Decrypt to an object (deserializes from JSON)
   */
  public decryptObject<T>(encryptedText: string): T {
    const json = this.decrypt(encryptedText);
    return JSON.parse(json) as T;
  }
}
