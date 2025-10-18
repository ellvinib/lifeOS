/**
 * Export utilities for generating CSV files
 */

/**
 * Convert array of objects to CSV string
 */
function arrayToCSV(data: Record<string, any>[], headers: string[]): string {
  const rows = [headers.join(',')];

  data.forEach((item) => {
    const values = headers.map((header) => {
      const value = item[header];

      // Handle null/undefined
      if (value === null || value === undefined) {
        return '';
      }

      // Convert to string and escape quotes
      const stringValue = String(value).replace(/"/g, '""');

      // Wrap in quotes if contains comma, newline, or quote
      if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
        return `"${stringValue}"`;
      }

      return stringValue;
    });

    rows.push(values.join(','));
  });

  return rows.join('\n');
}

/**
 * Download CSV file
 */
function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Export expenses to CSV
 */
export function exportExpensesToCSV(
  expenses: Array<{
    id: string;
    description: string;
    amount: number;
    category: string;
    date: string;
    paymentMethod: string;
    notes?: string;
    createdAt: string;
  }>
): void {
  const data = expenses.map((expense) => ({
    Date: new Date(expense.date).toLocaleDateString(),
    Description: expense.description,
    Amount: expense.amount.toFixed(2),
    Category: expense.category.charAt(0).toUpperCase() + expense.category.slice(1).replace(/_/g, ' '),
    'Payment Method': expense.paymentMethod.charAt(0).toUpperCase() + expense.paymentMethod.slice(1).replace(/_/g, ' '),
    Notes: expense.notes || '',
    'Created At': new Date(expense.createdAt).toLocaleDateString(),
  }));

  const headers = ['Date', 'Description', 'Amount', 'Category', 'Payment Method', 'Notes', 'Created At'];
  const csv = arrayToCSV(data, headers);
  const filename = `expenses-${new Date().toISOString().split('T')[0]}.csv`;

  downloadCSV(csv, filename);
}

/**
 * Export bank transactions to CSV
 */
export function exportTransactionsToCSV(
  transactions: Array<{
    id: string;
    description: string;
    amount: number;
    currency: string;
    counterPartyName?: string;
    counterPartyIban?: string;
    executionDate: string;
    reconciliationStatus: string;
    suggestedCategory?: string;
    isExpense: boolean;
    isIncome: boolean;
  }>
): void {
  const data = transactions.map((tx) => ({
    Date: new Date(tx.executionDate).toLocaleDateString(),
    Description: tx.description,
    'Counterparty': tx.counterPartyName || '',
    'Counterparty IBAN': tx.counterPartyIban || '',
    Amount: tx.amount.toFixed(2),
    Currency: tx.currency,
    Type: tx.isExpense ? 'Expense' : tx.isIncome ? 'Income' : 'Other',
    Status: tx.reconciliationStatus.charAt(0).toUpperCase() + tx.reconciliationStatus.slice(1),
    'Suggested Category': tx.suggestedCategory || '',
  }));

  const headers = ['Date', 'Description', 'Counterparty', 'Counterparty IBAN', 'Amount', 'Currency', 'Type', 'Status', 'Suggested Category'];
  const csv = arrayToCSV(data, headers);
  const filename = `bank-transactions-${new Date().toISOString().split('T')[0]}.csv`;

  downloadCSV(csv, filename);
}

/**
 * Export categorization rules to CSV
 */
export function exportRulesToCSV(
  rules: Array<{
    id: string;
    pattern: string;
    patternType: string;
    category: string;
    confidence: number;
    priority: number;
    source?: string;
    createdAt: string;
  }>
): void {
  const data = rules.map((rule) => ({
    Pattern: rule.pattern,
    'Pattern Type': rule.patternType.charAt(0).toUpperCase() + rule.patternType.slice(1),
    Category: rule.category.charAt(0).toUpperCase() + rule.category.slice(1).replace(/_/g, ' '),
    'Confidence (%)': rule.confidence,
    Priority: rule.priority,
    Source: rule.source ? rule.source.charAt(0).toUpperCase() + rule.source.slice(1) : 'Unknown',
    'Created At': new Date(rule.createdAt).toLocaleDateString(),
  }));

  const headers = ['Pattern', 'Pattern Type', 'Category', 'Confidence (%)', 'Priority', 'Source', 'Created At'];
  const csv = arrayToCSV(data, headers);
  const filename = `categorization-rules-${new Date().toISOString().split('T')[0]}.csv`;

  downloadCSV(csv, filename);
}
