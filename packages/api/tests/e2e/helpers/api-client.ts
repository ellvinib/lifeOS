import { APIRequestContext } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * API Client Helper
 *
 * Type-safe wrapper around Playwright's API request context.
 * Provides helpers for Finance module endpoints.
 */

export class FinanceAPIClient {
  private baseURL: string;

  constructor(private request: APIRequestContext, baseURL?: string) {
    this.baseURL = baseURL || process.env.API_URL || 'http://localhost:3000';
  }

  /**
   * Upload invoice
   */
  async uploadInvoice(filePath: string, source: string = 'MANUAL') {
    const fileBuffer = fs.readFileSync(filePath);
    
    const response = await this.request.post(`${this.baseURL}/api/finance/invoices/upload`, {
      multipart: {
        file: {
          name: path.basename(filePath),
          mimeType: 'application/pdf',
          buffer: fileBuffer,
        },
        source,
      },
    });

    return {
      status: response.status(),
      body: await response.json(),
    };
  }

  /**
   * Get invoice by ID
   */
  async getInvoice(invoiceId: string) {
    const response = await this.request.get(`${this.baseURL}/api/finance/invoices/${invoiceId}`);

    return {
      status: response.status(),
      body: await response.json(),
    };
  }

  /**
   * List invoices
   */
  async listInvoices(params?: Record<string, string>) {
    const queryString = params ? new URLSearchParams(params).toString() : '';
    const url = `${this.baseURL}/api/finance/invoices${queryString ? '?' + queryString : ''}`;
    
    const response = await this.request.get(url);

    return {
      status: response.status(),
      body: await response.json(),
    };
  }

  /**
   * Trigger invoice extraction
   */
  async extractInvoice(invoiceId: string) {
    const response = await this.request.post(
      `${this.baseURL}/api/finance/invoices/${invoiceId}/extract`
    );

    return {
      status: response.status(),
      body: await response.json(),
    };
  }

  /**
   * Import transactions from CSV
   */
  async importTransactions(csvFilePath: string, bankAccountId: string) {
    const fileBuffer = fs.readFileSync(csvFilePath);
    
    const response = await this.request.post(`${this.baseURL}/api/finance/transactions/import`, {
      multipart: {
        file: {
          name: path.basename(csvFilePath),
          mimeType: 'text/csv',
          buffer: fileBuffer,
        },
        bankAccountId,
      },
    });

    return {
      status: response.status(),
      body: await response.json(),
    };
  }

  /**
   * Get transaction by ID
   */
  async getTransaction(transactionId: string) {
    const response = await this.request.get(
      `${this.baseURL}/api/finance/transactions/${transactionId}`
    );

    return {
      status: response.status(),
      body: await response.json(),
    };
  }

  /**
   * List transactions
   */
  async listTransactions(params?: Record<string, string>) {
    const queryString = params ? new URLSearchParams(params).toString() : '';
    const url = `${this.baseURL}/api/finance/transactions${queryString ? '?' + queryString : ''}`;
    
    const response = await this.request.get(url);

    return {
      status: response.status(),
      body: await response.json(),
    };
  }

  /**
   * Suggest matches for invoice
   */
  async suggestMatches(invoiceId: string, params?: Record<string, string>) {
    const queryString = params ? new URLSearchParams(params).toString() : '';
    const url = `${this.baseURL}/api/finance/matches/suggest/${invoiceId}${queryString ? '?' + queryString : ''}`;
    
    const response = await this.request.get(url);

    return {
      status: response.status(),
      body: await response.json(),
    };
  }

  /**
   * Confirm match
   */
  async confirmMatch(invoiceId: string, transactionId: string, notes?: string) {
    const response = await this.request.post(`${this.baseURL}/api/finance/matches/confirm`, {
      data: {
        invoiceId,
        transactionId,
        notes,
      },
    });

    return {
      status: response.status(),
      body: await response.json(),
    };
  }

  /**
   * Unmatch invoice and transaction
   */
  async unmatch(invoiceId: string, transactionId: string) {
    const response = await this.request.post(`${this.baseURL}/api/finance/matches/unmatch`, {
      data: {
        invoiceId,
        transactionId,
      },
    });

    return {
      status: response.status(),
      body: await response.json(),
    };
  }

  /**
   * Health check
   */
  async healthCheck() {
    const response = await this.request.get(`${this.baseURL}/health`);

    return {
      status: response.status(),
      body: await response.json(),
    };
  }

  /**
   * Finance module health check
   */
  async financeHealthCheck() {
    const response = await this.request.get(`${this.baseURL}/api/finance/health`);

    return {
      status: response.status(),
      body: await response.json(),
    };
  }
}
