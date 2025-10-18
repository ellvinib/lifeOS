/**
 * IEncryptionService
 *
 * Interface for encryption/decryption service.
 * Used to encrypt sensitive data like OAuth tokens before database storage.
 */

export interface IEncryptionService {
  /**
   * Encrypt a string value
   */
  encrypt(plainText: string): string;

  /**
   * Decrypt an encrypted string
   */
  decrypt(encryptedText: string): string;

  /**
   * Encrypt an object (serializes to JSON first)
   */
  encryptObject<T>(obj: T): string;

  /**
   * Decrypt to an object (deserializes from JSON)
   */
  decryptObject<T>(encryptedText: string): T;
}
