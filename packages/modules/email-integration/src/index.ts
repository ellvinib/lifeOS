/**
 * Email Integration Module
 *
 * Main entry point for the email integration module.
 *
 * Exports:
 * - Domain entities
 * - Use cases
 * - DTOs
 * - Infrastructure components
 * - Module initialization
 */

// Domain Layer
export * from './domain/entities/EmailAccount';
export * from './domain/entities/Email';
export * from './domain/value-objects/EmailProvider';
export * from './domain/value-objects/EmailAddress';
export * from './domain/interfaces/IEmailAccountRepository';
export * from './domain/interfaces/IEmailRepository';
export * from './domain/interfaces/IEmailProvider';
export * from './domain/interfaces/IEmailConnectionManager';

// Application Layer
export * from './application/dtos/EmailAccountDTO';
export * from './application/dtos/EmailDTO';
export * from './application/use-cases/ConnectAccountUseCase';
export * from './application/use-cases/DisconnectAccountUseCase';
export * from './application/use-cases/SyncEmailsUseCase';
export * from './application/use-cases/GetEmailUseCase';
export * from './application/use-cases/GmailHistorySyncUseCase';

// Infrastructure Layer
export * from './infrastructure/repositories/EmailAccountRepository';
export * from './infrastructure/repositories/EmailRepository';
export * from './infrastructure/mappers/EmailAccountPrismaMapper';
export * from './infrastructure/mappers/EmailPrismaMapper';
export * from './infrastructure/connections/OutlookConnectionManager';
export * from './infrastructure/connections/SmtpConnectionManager';
export * from './infrastructure/connections/GmailConnectionManager';
export * from './infrastructure/providers/OutlookProvider';
export * from './infrastructure/providers/SmtpProvider';
export * from './infrastructure/providers/GmailProvider';
export * from './infrastructure/webhooks/OutlookWebhookHandler';
export * from './infrastructure/webhooks/GmailWebhookHandler';
export * from './infrastructure/monitors/SmtpIdleMonitor';
export * from './infrastructure/jobs/SubscriptionRenewalJob';
export * from './infrastructure/jobs/EmailSyncJob';
export * from './infrastructure/queues/EmailSyncQueue';

// Presentation Layer
export * from './presentation/controllers/EmailAccountController';
export * from './presentation/controllers/WebhookController';
export * from './presentation/routes';
