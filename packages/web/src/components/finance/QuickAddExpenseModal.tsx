'use client';

import { useState } from 'react';
import { X, DollarSign, Calendar, Tag, FileText } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

interface QuickAddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (expense: ExpenseInput) => void;
  isLoading?: boolean;
}

interface ExpenseInput {
  amount: number;
  category: string;
  description: string;
  date: string;
  paymentMethod: string;
  tags?: string[];
}

const EXPENSE_CATEGORIES = [
  { value: 'groceries', label: '🛒 Groceries', suggested: true },
  { value: 'dining', label: '🍽️ Dining', suggested: true },
  { value: 'transportation', label: '🚗 Transportation', suggested: true },
  { value: 'entertainment', label: '🎬 Entertainment' },
  { value: 'shopping', label: '🛍️ Shopping' },
  { value: 'utilities', label: '💡 Utilities' },
  { value: 'healthcare', label: '🏥 Healthcare' },
  { value: 'housing', label: '🏠 Housing' },
  { value: 'insurance', label: '🛡️ Insurance' },
  { value: 'education', label: '📚 Education' },
  { value: 'gifts', label: '🎁 Gifts' },
  { value: 'other', label: '📦 Other' },
];

const PAYMENT_METHODS = [
  { value: 'credit_card', label: '💳 Credit Card' },
  { value: 'debit_card', label: '💳 Debit Card' },
  { value: 'cash', label: '💵 Cash' },
  { value: 'bank_transfer', label: '🏦 Bank Transfer' },
  { value: 'mobile_payment', label: '📱 Mobile Payment' },
];

export function QuickAddExpenseModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
}: QuickAddExpenseModalProps) {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('credit_card');
  const [showAllCategories, setShowAllCategories] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (!category) {
      alert('Please select a category');
      return;
    }

    onSubmit({
      amount: numAmount,
      category,
      description: description || 'Quick expense',
      date,
      paymentMethod,
    });

    // Reset form
    setAmount('');
    setCategory('');
    setDescription('');
    setDate(new Date().toISOString().split('T')[0]);
    setPaymentMethod('credit_card');
  };

  const suggestedCategories = EXPENSE_CATEGORIES.filter(cat => cat.suggested);
  const displayedCategories = showAllCategories ? EXPENSE_CATEGORIES : suggestedCategories;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Quick Add Expense"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Amount - Largest, most prominent */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <DollarSign className="w-4 h-4 inline mr-1" />
            Amount *
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-gray-400">
              $
            </span>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full pl-10 pr-4 py-4 text-3xl font-bold border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="0.00"
              autoFocus
              required
            />
          </div>
        </div>

        {/* Category - Quick select with AI suggestions */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <Tag className="w-4 h-4 inline mr-1" />
            Category *
          </label>
          <div className="grid grid-cols-3 gap-2 mb-2">
            {displayedCategories.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => setCategory(cat.value)}
                className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                  category === cat.value
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
          {!showAllCategories && (
            <button
              type="button"
              onClick={() => setShowAllCategories(true)}
              className="text-sm text-green-600 dark:text-green-400 hover:underline"
            >
              Show all categories →
            </button>
          )}
        </div>

        {/* Description - Optional, smaller */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <FileText className="w-4 h-4 inline mr-1" />
            Description (optional)
          </label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="E.g., Lunch with team"
          />
        </div>

        {/* Date & Payment Method - Side by side */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Date
            </label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              💳 Payment
            </label>
            <Select
              value={paymentMethod}
              options={PAYMENT_METHODS}
              onChange={(e) => setPaymentMethod(e.target.value)}
              required
            /> 
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
            disabled={isLoading || !amount || !category}
            className="flex-1"
          >
            Add Expense
          </Button>
        </div>

        {/* Quick tip */}
        <div className="text-xs text-gray-500 dark:text-gray-400 text-center pt-2">
          💡 Tip: Press Enter to submit quickly
        </div>
      </form>
    </Modal>
  );
}
