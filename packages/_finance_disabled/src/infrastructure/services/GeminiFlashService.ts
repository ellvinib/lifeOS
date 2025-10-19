import { Result } from '@lifeOS/core/shared/result';
import { BaseError, DatabaseError } from '@lifeOS/core/shared/errors';
import { ExtractedInvoiceData } from '../../domain/entities';

/**
 * Gemini Flash AI Service for Invoice Extraction
 *
 * Uses Google's Gemini Flash model to extract structured data from invoice PDFs.
 * Gemini Flash is free for up to 1,500 requests per day.
 *
 * API Documentation: https://ai.google.dev/gemini-api/docs
 *
 * Features:
 * - Multimodal input (PDF documents)
 * - Structured JSON output
 * - Free tier: 1,500 requests/day
 * - Fast response times (~2-3 seconds)
 * - Supports multiple languages
 */
export class GeminiFlashService {
  private readonly apiKey: string;
  private readonly model: string = 'gemini-2.0-flash-exp';
  private readonly apiEndpoint: string = 'https://generativelanguage.googleapis.com/v1beta/models';

  /**
   * Initialize Gemini Flash service
   * @param apiKey Google AI API key (get from https://makersuite.google.com/app/apikey)
   */
  constructor(apiKey: string) {
    if (!apiKey || apiKey.trim().length === 0) {
      throw new Error('Gemini API key is required');
    }
    this.apiKey = apiKey;
  }

  /**
   * Extract invoice data from PDF
   *
   * @param pdfBuffer PDF file as buffer
   * @param filename Original filename (for context)
   * @returns Extracted invoice data
   */
  async extractInvoiceData(
    pdfBuffer: Buffer,
    filename?: string
  ): Promise<Result<ExtractedInvoiceData, BaseError>> {
    try {
      // Convert PDF to base64
      const base64Pdf = pdfBuffer.toString('base64');

      // Prepare prompt for structured extraction
      const prompt = this.buildExtractionPrompt(filename);

      // Call Gemini API
      const response = await this.callGeminiAPI(prompt, base64Pdf);

      // Parse response to ExtractedInvoiceData
      const extractedData = this.parseGeminiResponse(response);

      return Result.ok(extractedData);
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to extract invoice data with Gemini Flash', error)
      );
    }
  }

  /**
   * Test API connection
   * @returns True if API key is valid
   */
  async testConnection(): Promise<Result<boolean, BaseError>> {
    try {
      const testPrompt = 'Reply with "OK" if you can read this message.';
      const response = await this.callGeminiAPI(testPrompt);

      return Result.ok(response.toLowerCase().includes('ok'));
    } catch (error) {
      return Result.fail(new DatabaseError('Gemini API connection test failed', error));
    }
  }

  // ==================== Private Methods ====================

  /**
   * Build extraction prompt for Gemini
   */
  private buildExtractionPrompt(filename?: string): string {
    return `You are an AI assistant specialized in extracting structured data from invoices.

${filename ? `Analyzing invoice file: ${filename}\n` : ''}
Please extract the following information from this invoice PDF and return it as a JSON object:

{
  "invoiceNumber": "string (invoice/reference number)",
  "issueDate": "ISO 8601 date string (YYYY-MM-DD)",
  "dueDate": "ISO 8601 date string (YYYY-MM-DD)",
  "vendorName": "string (supplier/vendor name)",
  "vendorVAT": "string (VAT/tax identification number)",
  "vendorAddress": "string (full address)",
  "vendorEmail": "string (email address)",
  "vendorPhone": "string (phone number)",
  "clientName": "string (customer/client name)",
  "clientAddress": "string (full address)",
  "currency": "string (3-letter currency code, e.g., EUR, USD)",
  "subtotal": "number (amount before VAT)",
  "vatAmount": "number (total VAT/tax amount)",
  "total": "number (final total amount)",
  "vatRate": "number (VAT percentage, e.g., 21 for 21%)",
  "paymentReference": "string (structured payment reference)",
  "bankAccount": "string (IBAN or account number)",
  "lineItems": [
    {
      "description": "string (item description)",
      "quantity": "number",
      "unitPrice": "number",
      "vatRate": "number (percentage)",
      "amount": "number (total for this line)"
    }
  ],
  "notes": "string (any additional notes or payment terms)",
  "language": "string (detected language code: en, fr, nl, de, etc.)"
}

IMPORTANT RULES:
1. Extract all amounts as decimal numbers (e.g., 1234.56, not "€1,234.56")
2. Convert dates to ISO 8601 format (YYYY-MM-DD)
3. If a field is not found or unclear, use null instead of guessing
4. For VAT rate, use just the number (21, not "21%" or 0.21)
5. Ensure subtotal + vatAmount = total (validate arithmetic)
6. Extract ALL line items if present
7. Return ONLY valid JSON, no additional text or markdown
8. Use null for missing optional fields, not empty strings

Extract data from the attached PDF document:`;
  }

  /**
   * Call Gemini API
   */
  private async callGeminiAPI(prompt: string, base64Pdf?: string): Promise<string> {
    const url = `${this.apiEndpoint}/${this.model}:generateContent?key=${this.apiKey}`;

    // Build request body
    const parts: any[] = [{ text: prompt }];

    // Add PDF document if provided
    if (base64Pdf) {
      parts.push({
        inlineData: {
          mimeType: 'application/pdf',
          data: base64Pdf,
        },
      });
    }

    const requestBody = {
      contents: [
        {
          parts,
        },
      ],
      generationConfig: {
        temperature: 0.1, // Low temperature for consistent extraction
        topK: 1,
        topP: 1,
        maxOutputTokens: 2048,
      },
    };

    // Make request
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Gemini API request failed: ${response.status} ${response.statusText}\n${errorText}`
      );
    }

    const data = await response.json();

    // Extract text from response
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error('No text response from Gemini API');
    }

    return text;
  }

  /**
   * Parse Gemini response to ExtractedInvoiceData
   */
  private parseGeminiResponse(response: string): ExtractedInvoiceData {
    // Remove markdown code blocks if present
    let jsonText = response.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '');
    }

    // Parse JSON
    const parsed = JSON.parse(jsonText);

    // Convert date strings to Date objects
    const extractedData: ExtractedInvoiceData = {
      invoiceNumber: parsed.invoiceNumber || undefined,
      issueDate: parsed.issueDate ? new Date(parsed.issueDate) : undefined,
      dueDate: parsed.dueDate ? new Date(parsed.dueDate) : undefined,
      vendorName: parsed.vendorName || undefined,
      vendorVAT: parsed.vendorVAT || undefined,
      vendorAddress: parsed.vendorAddress || undefined,
      vendorEmail: parsed.vendorEmail || undefined,
      vendorPhone: parsed.vendorPhone || undefined,
      clientName: parsed.clientName || undefined,
      clientAddress: parsed.clientAddress || undefined,
      currency: parsed.currency || 'EUR',
      subtotal: typeof parsed.subtotal === 'number' ? parsed.subtotal : undefined,
      vatAmount: typeof parsed.vatAmount === 'number' ? parsed.vatAmount : undefined,
      total: typeof parsed.total === 'number' ? parsed.total : undefined,
      vatRate: typeof parsed.vatRate === 'number' ? parsed.vatRate : undefined,
      paymentReference: parsed.paymentReference || undefined,
      bankAccount: parsed.bankAccount || undefined,
      lineItems:
        Array.isArray(parsed.lineItems) && parsed.lineItems.length > 0
          ? parsed.lineItems.map((item: any) => ({
              description: item.description || '',
              quantity: item.quantity || 1,
              unitPrice: item.unitPrice || 0,
              vatRate: item.vatRate || 0,
              amount: item.amount || 0,
            }))
          : undefined,
      notes: parsed.notes || undefined,
      language: parsed.language || 'en',
    };

    // Validate arithmetic: subtotal + vatAmount should equal total (with tolerance)
    if (
      extractedData.subtotal !== undefined &&
      extractedData.vatAmount !== undefined &&
      extractedData.total !== undefined
    ) {
      const calculatedTotal = extractedData.subtotal + extractedData.vatAmount;
      const difference = Math.abs(calculatedTotal - extractedData.total);

      // If difference is more than 2 cents, log warning
      if (difference > 0.02) {
        console.warn(
          `Invoice arithmetic mismatch: subtotal (${extractedData.subtotal}) + VAT (${extractedData.vatAmount}) = ${calculatedTotal}, but total is ${extractedData.total}`
        );
      }
    }

    return extractedData;
  }

  /**
   * Get usage statistics for current API key
   * Note: Google AI doesn't provide usage API, this is a placeholder
   */
  async getUsageStats(): Promise<
    Result<{ requestsToday: number; limit: number }, BaseError>
  > {
    // Gemini Flash free tier: 1,500 requests/day
    // No official API to check usage, would need to track locally
    return Result.ok({
      requestsToday: 0, // Would track in database
      limit: 1500,
    });
  }
}
