import { Result } from '@lifeOS/core/shared/result';
import { ValidationError } from '@lifeOS/core/shared/errors';

/**
 * EmailAddress Value Object
 *
 * Represents an email address with optional display name.
 * Immutable and self-validating.
 *
 * Examples:
 * - john@example.com
 * - "John Doe" <john@example.com>
 */
export class EmailAddress {
  private constructor(
    private readonly _address: string,
    private readonly _name: string | null
  ) {}

  /**
   * Create EmailAddress from string
   *
   * @param address - Email address (e.g., "john@example.com")
   * @param name - Optional display name (e.g., "John Doe")
   * @returns Result containing EmailAddress or ValidationError
   */
  static create(
    address: string,
    name?: string | null
  ): Result<EmailAddress, ValidationError> {
    if (!address || address.trim().length === 0) {
      return Result.fail(
        new ValidationError('Email address cannot be empty', [
          { field: 'address', message: 'Email address is required' },
        ])
      );
    }

    const trimmedAddress = address.trim().toLowerCase();

    if (!this.isValidEmail(trimmedAddress)) {
      return Result.fail(
        new ValidationError('Invalid email format', [
          { field: 'address', message: 'Must be a valid email address' },
        ])
      );
    }

    return Result.ok(new EmailAddress(trimmedAddress, name?.trim() || null));
  }

  /**
   * Parse email from RFC 5322 format
   *
   * Examples:
   * - "john@example.com" → EmailAddress("john@example.com", null)
   * - "John Doe <john@example.com>" → EmailAddress("john@example.com", "John Doe")
   */
  static parse(emailString: string): Result<EmailAddress, ValidationError> {
    const trimmed = emailString.trim();

    // Check for name + email format: "Name" <email@example.com>
    const nameEmailMatch = trimmed.match(/^"?([^"]+)"?\s*<(.+)>$/);
    if (nameEmailMatch) {
      const [, name, address] = nameEmailMatch;
      return this.create(address, name);
    }

    // Plain email address
    return this.create(trimmed);
  }

  /**
   * Get the email address (without display name)
   */
  get address(): string {
    return this._address;
  }

  /**
   * Get the display name (null if not set)
   */
  get name(): string | null {
    return this._name;
  }

  /**
   * Get the domain part of the email
   */
  get domain(): string {
    const parts = this._address.split('@');
    return parts[1] || '';
  }

  /**
   * Get the local part of the email (before @)
   */
  get localPart(): string {
    const parts = this._address.split('@');
    return parts[0] || '';
  }

  /**
   * Check if email is from a specific domain
   */
  isFromDomain(domain: string): boolean {
    return this.domain === domain.toLowerCase();
  }

  /**
   * Convert to RFC 5322 format
   *
   * @returns Formatted email string
   * Examples:
   * - "john@example.com"
   * - "John Doe <john@example.com>"
   */
  toString(): string {
    if (this._name) {
      return `"${this._name}" <${this._address}>`;
    }
    return this._address;
  }

  /**
   * Convert to simple address (no display name)
   */
  toSimpleString(): string {
    return this._address;
  }

  /**
   * Validate email format using regex
   */
  private static isValidEmail(email: string): boolean {
    // RFC 5322 simplified regex
    const emailRegex =
      /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

    return emailRegex.test(email);
  }

  /**
   * Equality comparison
   */
  equals(other: EmailAddress): boolean {
    return this._address === other._address;
  }
}
