/**
 * Email Provider Enum
 *
 * Defines supported email providers.
 * Each provider has different authentication and sync mechanisms.
 */
export enum EmailProvider {
  GMAIL = 'gmail',
  OUTLOOK = 'outlook',
  SMTP = 'smtp',
}

/**
 * Provider-specific configuration helpers
 */
export class EmailProviderHelper {
  static isWebhookSupported(provider: EmailProvider): boolean {
    return provider === EmailProvider.GMAIL || provider === EmailProvider.OUTLOOK;
  }

  static requiresPolling(provider: EmailProvider): boolean {
    return provider === EmailProvider.SMTP;
  }

  static getDisplayName(provider: EmailProvider): string {
    switch (provider) {
      case EmailProvider.GMAIL:
        return 'Gmail';
      case EmailProvider.OUTLOOK:
        return 'Outlook / Office 365';
      case EmailProvider.SMTP:
        return 'SMTP / IMAP';
      default:
        return 'Unknown';
    }
  }

  static getWebhookPath(provider: EmailProvider): string | null {
    switch (provider) {
      case EmailProvider.GMAIL:
        return '/api/email/webhooks/gmail';
      case EmailProvider.OUTLOOK:
        return '/api/email/webhooks/outlook';
      default:
        return null;
    }
  }
}
