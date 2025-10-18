import { EmailProvider } from '../../domain/value-objects/EmailProvider';
import { EmailAccount } from '../../domain/entities/EmailAccount';

/**
 * Connect Account DTO
 *
 * Input for connecting a new email account.
 */
export interface ConnectAccountDTO {
  userId: string;
  provider: EmailProvider;
  email: string;
  emailName?: string;
  credentials: OutlookCredentials | GmailCredentials | SmtpCredentials;
}

/**
 * Outlook/Office 365 OAuth Credentials
 */
export interface OutlookCredentials {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

/**
 * Gmail OAuth Credentials
 */
export interface GmailCredentials {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

/**
 * SMTP/IMAP Username/Password Credentials
 */
export interface SmtpCredentials {
  username: string;
  password: string;
  imapHost: string;
  imapPort: number;
  smtpHost?: string;
  smtpPort?: number;
}

/**
 * Email Account Response DTO
 *
 * Returned when account is created or fetched.
 */
export interface EmailAccountResponseDTO {
  id: string;
  userId: string;
  provider: EmailProvider;
  email: string;
  emailName?: string;
  isActive: boolean;
  lastSyncedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Mapper: EmailAccount Entity → Response DTO
 */
export class EmailAccountMapper {
  static toResponseDTO(account: EmailAccount): EmailAccountResponseDTO {
    return {
      id: account.id,
      userId: account.userId,
      provider: account.provider,
      email: account.email,
      emailName: account.emailAddress.name || undefined,
      isActive: account.isActive,
      lastSyncedAt: account.lastSyncedAt,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    };
  }

  static toResponseDTOList(accounts: EmailAccount[]): EmailAccountResponseDTO[] {
    return accounts.map((account) => this.toResponseDTO(account));
  }
}
