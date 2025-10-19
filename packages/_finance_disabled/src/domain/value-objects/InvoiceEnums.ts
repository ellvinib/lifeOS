/**
 * Invoice Management Enumerations
 *
 * Enums for invoice, vendor, and invoice-transaction matching
 */

/**
 * Invoice status lifecycle
 */
export enum InvoiceStatus {
  DRAFT = 'draft',           // Invoice created but data extraction incomplete
  PENDING = 'pending',       // Awaiting payment
  PAID = 'paid',             // Payment confirmed (matched to transaction)
  OVERDUE = 'overdue',       // Past due date without payment
  CANCELLED = 'cancelled',   // Invoice cancelled/voided
}

/**
 * Confidence level for invoice-transaction matching
 */
export enum MatchConfidence {
  HIGH = 'high',             // Score >= 90, auto-match
  MEDIUM = 'medium',         // Score 50-89, suggest to user
  LOW = 'low',               // Score < 50, manual review
  MANUAL = 'manual',         // User manually created match
}

/**
 * Transaction category for expense tracking
 */
export enum TransactionCategory {
  // Operating Expenses
  MARKETING = 'marketing',
  ADVERTISING = 'advertising',
  HOSTING = 'hosting',
  SOFTWARE = 'software',
  SAAS = 'saas',
  OFFICE_SUPPLIES = 'office_supplies',
  OFFICE_RENT = 'office_rent',
  UTILITIES = 'utilities',

  // Travel & Transport
  TRAVEL = 'travel',
  FUEL = 'fuel',
  PARKING = 'parking',
  TOLLS = 'tolls',

  // Professional Services
  LEGAL = 'legal',
  ACCOUNTING = 'accounting',
  CONSULTING = 'consulting',
  FREELANCE = 'freelance',

  // Inventory & Supplies
  INVENTORY = 'inventory',
  RAW_MATERIALS = 'raw_materials',
  PACKAGING = 'packaging',

  // Personnel
  SALARY = 'salary',
  BENEFITS = 'benefits',
  TRAINING = 'training',

  // Financial
  BANK_FEES = 'bank_fees',
  INSURANCE = 'insurance',
  TAX = 'tax',
  LOAN_PAYMENT = 'loan_payment',

  // Food & Entertainment
  MEALS = 'meals',
  ENTERTAINMENT = 'entertainment',

  // Other
  EQUIPMENT = 'equipment',
  MAINTENANCE = 'maintenance',
  OTHER = 'other',
  UNCATEGORIZED = 'uncategorized',
}

/**
 * Source of invoice data
 */
export enum InvoiceSource {
  EMAIL_FORWARD = 'email_forward',       // Forwarded from email
  EMAIL_IMAP = 'email_imap',             // Auto-imported via IMAP
  MANUAL_UPLOAD = 'manual_upload',       // User uploaded PDF
  API_INTEGRATION = 'api_integration',   // From accounting software API
}

/**
 * Extraction status for AI data extraction
 */
export enum ExtractionStatus {
  PENDING = 'pending',       // Queued for extraction
  PROCESSING = 'processing', // Currently being processed
  COMPLETED = 'completed',   // Extraction successful
  FAILED = 'failed',         // Extraction failed
  MANUAL = 'manual',         // User entered data manually
}

/**
 * Vendor type for categorization
 */
export enum VendorType {
  SUPPLIER = 'supplier',           // Product/inventory supplier
  SERVICE_PROVIDER = 'service_provider', // Service companies
  UTILITY = 'utility',             // Utility companies
  GOVERNMENT = 'government',       // Government entities (tax, permits)
  FINANCIAL = 'financial',         // Banks, insurance
  PROFESSIONAL = 'professional',   // Lawyers, accountants
  OTHER = 'other',
}
