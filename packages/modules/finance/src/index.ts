/**
 * Finance Module - Main Export
 *
 * Personal finance management module for LifeOS.
 * Provides comprehensive financial tracking and management capabilities.
 */

export { FinanceModule } from './FinanceModule';

// Export domain entities for use by other modules
export * from './domain/entities';

// Export repository interfaces for testing
export * from './domain/interfaces';

// Export use cases for direct usage if needed
export * from './application/use-cases';

// Export DTOs for API consumers
export * from './application/dtos';
