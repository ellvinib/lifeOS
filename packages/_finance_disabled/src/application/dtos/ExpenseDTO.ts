import { Expense, ExpenseCategory, PaymentMethod } from '../../domain/entities';

/**
 * Expense Request DTO
 *
 * Used for creating and updating expenses via API
 */
export interface ExpenseRequestDTO {
  description: string;
  amount: number;
  category: ExpenseCategory;
  date: string; // ISO 8601 format
  paymentMethod: PaymentMethod;
  isRecurring?: boolean;
  recurrenceIntervalDays?: number;
  merchantName?: string;
  notes?: string;
  tags?: string[];
  receiptUrl?: string;
}

/**
 * Expense Response DTO
 *
 * Used for returning expense data via API
 */
export interface ExpenseResponseDTO {
  id: string;
  description: string;
  amount: number;
  category: ExpenseCategory;
  date: string; // ISO 8601 format
  paymentMethod: PaymentMethod;
  isRecurring: boolean;
  recurrenceIntervalDays?: number;
  merchantName?: string;
  notes?: string;
  tags: string[];
  receiptUrl?: string;
  createdAt: string; // ISO 8601 format
  updatedAt: string; // ISO 8601 format
}

/**
 * Expense List Query Parameters
 */
export interface ExpenseQueryDTO {
  category?: ExpenseCategory;
  startDate?: string;
  endDate?: string;
  merchantName?: string;
  tags?: string;
  isRecurring?: boolean;
  minAmount?: number;
  maxAmount?: number;
  paymentMethod?: PaymentMethod;
  page?: number;
  limit?: number;
}

/**
 * Expense DTO Mapper
 *
 * Maps between domain entities and DTOs
 */
export class ExpenseDTOMapper {
  /**
   * Convert domain entity to response DTO
   */
  public static toResponseDTO(expense: Expense): ExpenseResponseDTO {
    return {
      id: expense.id,
      description: expense.description,
      amount: expense.amount,
      category: expense.category,
      date: expense.date.toISOString(),
      paymentMethod: expense.paymentMethod,
      isRecurring: expense.isRecurring,
      recurrenceIntervalDays: expense.recurrenceIntervalDays,
      merchantName: expense.merchantName,
      notes: expense.notes,
      tags: expense.tags,
      receiptUrl: expense.receiptUrl,
      createdAt: expense.createdAt.toISOString(),
      updatedAt: expense.updatedAt.toISOString(),
    };
  }

  /**
   * Convert request DTO to use case input
   */
  public static fromRequestDTO(dto: ExpenseRequestDTO) {
    return {
      description: dto.description,
      amount: dto.amount,
      category: dto.category,
      date: new Date(dto.date),
      paymentMethod: dto.paymentMethod,
      isRecurring: dto.isRecurring,
      recurrenceIntervalDays: dto.recurrenceIntervalDays,
      merchantName: dto.merchantName,
      notes: dto.notes,
      tags: dto.tags,
      receiptUrl: dto.receiptUrl,
    };
  }

  /**
   * Convert query DTO to repository query options
   */
  public static fromQueryDTO(dto: ExpenseQueryDTO) {
    return {
      category: dto.category,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      merchantName: dto.merchantName,
      tags: dto.tags ? dto.tags.split(',').map(t => t.trim()) : undefined,
      isRecurring: dto.isRecurring,
      minAmount: dto.minAmount,
      maxAmount: dto.maxAmount,
      paymentMethod: dto.paymentMethod,
      page: dto.page,
      limit: dto.limit,
    };
  }
}
