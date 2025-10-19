/**
 * LifeOS Core
 *
 * Core framework for the LifeOS modular monolith.
 * Provides:
 * - Module system (plugin architecture)
 * - Event bus (event-driven communication)
 * - Job queue (background processing)
 * - Shared utilities (Result type, errors, etc.)
 */

// Module System
export * from './module-system';

// Event Bus
export * from './events';

// Job Queue
export * from './jobs';

// Shared Utilities
export * from './shared/result';
export * from './shared/errors';
