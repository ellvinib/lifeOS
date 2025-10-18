// Expense Management
export type ExpenseCategory =
  | 'housing'
  | 'utilities'
  | 'groceries'
  | 'transportation'
  | 'healthcare'
  | 'insurance'
  | 'entertainment'
  | 'dining'
  | 'shopping'
  | 'education'
  | 'savings'
  | 'debt_payment'
  | 'investments'
  | 'gifts'
  | 'other';

export type PaymentMethod = 'cash' | 'credit_card' | 'debit_card' | 'bank_transfer' | 'mobile_payment' | 'other';

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: ExpenseCategory;
  date: string;
  paymentMethod: PaymentMethod;
  isRecurring: boolean;
  recurrenceIntervalDays?: number;
  merchantName?: string;
  notes?: string;
  tags: string[];
  receiptUrl?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// Insurance Management
export type InsuranceType =
  | 'life'
  | 'health'
  | 'home'
  | 'auto'
  | 'renters'
  | 'disability'
  | 'pet'
  | 'travel'
  | 'umbrella'
  | 'other';

export type InsuranceStatus = 'active' | 'pending' | 'expired' | 'cancelled';

export interface Insurance {
  id: string;
  type: InsuranceType;
  provider: string;
  policyNumber: string;
  status: InsuranceStatus;
  coverageAmount: number;
  premiumAmount: number;
  premiumFrequency: 'monthly' | 'quarterly' | 'semi_annually' | 'annually';
  startDate: string;
  endDate?: string;
  renewalDate?: string;
  deductible?: number;
  beneficiaries?: string[];
  notes?: string;
  documentUrl?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// Loan/Mortgage Management
export type LoanType = 'mortgage' | 'auto' | 'student' | 'personal' | 'business' | 'other';
export type LoanStatus = 'active' | 'paid_off' | 'defaulted' | 'refinanced';

export interface Loan {
  id: string;
  type: LoanType;
  lenderName: string;
  accountNumber?: string;
  status: LoanStatus;
  principalAmount: number;
  currentBalance: number;
  interestRate: number;
  termMonths: number;
  monthlyPayment: number;
  startDate: string;
  maturityDate: string;
  nextPaymentDate?: string;
  totalInterestPaid: number;
  notes?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface AmortizationScheduleEntry {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
  date: string;
}

// Bill Management & Prediction
export type BillType = 'electricity' | 'water' | 'gas' | 'internet' | 'phone' | 'subscription' | 'other';
export type BillStatus = 'upcoming' | 'paid' | 'overdue' | 'cancelled';

export interface Bill {
  id: string;
  name: string;
  type: BillType;
  provider: string;
  amount: number;
  isPredicted: boolean;
  predictionConfidence?: number;
  dueDate: string;
  status: BillStatus;
  isRecurring: boolean;
  recurrenceIntervalDays?: number;
  accountNumber?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface EnergyUsagePrediction {
  month: string;
  predictedUsageKwh: number;
  predictedCost: number;
  averageRatePerKwh: number;
  confidenceLevel: number;
  factors: {
    temperature?: number;
    seasonalAdjustment: number;
    historicalTrend: number;
  };
}

// Budget Management
export interface BudgetCategory {
  category: ExpenseCategory;
  plannedAmount: number;
  spentAmount: number;
  remaining: number;
  percentageUsed: number;
}

export interface Budget {
  id: string;
  name: string;
  month: string; // YYYY-MM format
  totalIncome: number;
  totalPlanned: number;
  totalSpent: number;
  categories: BudgetCategory[];
  savingsGoal?: number;
  actualSavings: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// Net Worth & Assets
export type AssetType = 'cash' | 'savings' | 'checking' | 'investment' | 'retirement' | 'real_estate' | 'vehicle' | 'other';

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  currentValue: number;
  purchaseValue?: number;
  purchaseDate?: string;
  institution?: string;
  accountNumber?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface NetWorthSnapshot {
  date: string;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  assetBreakdown: Record<AssetType, number>;
  liabilityBreakdown: Record<LoanType, number>;
}

// Financial Health
export interface FinancialHealthScore {
  overallScore: number; // 0-100
  savingsRate: number;
  debtToIncomeRatio: number;
  emergencyFundMonths: number;
  creditUtilization?: number;
  recommendations: string[];
  strengths: string[];
  concerns: string[];
}

// Analytics
export interface ExpenseAnalytics {
  totalExpenses: number;
  categoryBreakdown: Record<ExpenseCategory, number>;
  monthlyTrend: Array<{ month: string; amount: number }>;
  topMerchants: Array<{ name: string; amount: number; count: number }>;
  recurringExpensesTotal: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Create Input Types
export interface CreateExpenseInput {
  description: string;
  amount: number;
  category: ExpenseCategory;
  date: string;
  paymentMethod: PaymentMethod;
  isRecurring?: boolean;
  recurrenceIntervalDays?: number;
  merchantName?: string;
  notes?: string;
  tags?: string[];
}

export interface CreateInsuranceInput {
  type: InsuranceType;
  provider: string;
  policyNumber: string;
  status: InsuranceStatus;
  coverageAmount: number;
  premiumAmount: number;
  premiumFrequency: 'monthly' | 'quarterly' | 'semi_annually' | 'annually';
  startDate: string;
  endDate?: string;
  renewalDate?: string;
  deductible?: number;
  beneficiaries?: string[];
  notes?: string;
}

export interface CreateLoanInput {
  type: LoanType;
  lenderName: string;
  accountNumber?: string;
  status: LoanStatus;
  principalAmount: number;
  interestRate: number;
  termMonths: number;
  startDate: string;
  notes?: string;
}

export interface CreateBillInput {
  name: string;
  type: BillType;
  provider: string;
  amount: number;
  dueDate: string;
  isRecurring?: boolean;
  recurrenceIntervalDays?: number;
  accountNumber?: string;
  notes?: string;
}

export interface CreateAssetInput {
  name: string;
  type: AssetType;
  currentValue: number;
  purchaseValue?: number;
  purchaseDate?: string;
  institution?: string;
  accountNumber?: string;
  notes?: string;
}

export interface CreateBudgetInput {
  name: string;
  month: string;
  totalIncome: number;
  categories: Array<{
    category: ExpenseCategory;
    plannedAmount: number;
  }>;
  savingsGoal?: number;
}
