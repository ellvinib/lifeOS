'use client';

import { useState } from 'react';
import { X, Plus, Calendar, DollarSign, Tag, Receipt, CreditCard, RefreshCw } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { financeAPI } from '@/lib/api/finance';

/**
 * AddExpenseModal Component
 *
 * Modal for creating new expenses with full form validation.
 * Supports all expense fields including recurring expenses.
 *
 * Features:
 * - Amount, description, category, payment method
 * - Merchant name, date picker
 * - Tags (comma-separated)
 * - Recurring expense support
 * - Form validation
 * - Success/error states
 */

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedCategory?: string;
}

const EXPENSE_CATEGORIES = [
  { value: 'housing', label: 'Wonen', emoji: '🏠' },
  { value: 'utilities', label: 'Utilities', emoji: '💡' },
  { value: 'groceries', label: 'Boodschappen', emoji: '🛒' },
  { value: 'transportation', label: 'Transport', emoji: '🚗' },
  { value: 'healthcare', label: 'Zorgkosten', emoji: '🏥' },
  { value: 'insurance', label: 'Verzekeringen', emoji: '🛡️' },
  { value: 'entertainment', label: 'Vrije tijd', emoji: '🎬' },
  { value: 'dining', label: 'Uit eten', emoji: '🍽️' },
  { value: 'shopping', label: 'Shopping', emoji: '🛍️' },
  { value: 'education', label: 'Educatie', emoji: '📚' },
  { value: 'savings', label: 'Sparen', emoji: '💰' },
  { value: 'debt_payment', label: 'Schulden', emoji: '💳' },
  { value: 'investments', label: 'Beleggen', emoji: '📈' },
  { value: 'gifts', label: 'Cadeaus', emoji: '🎁' },
  { value: 'other', label: 'Overig', emoji: '📦' },
] as const;

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Contant' },
  { value: 'debit_card', label: 'Pinpas' },
  { value: 'credit_card', label: 'Creditcard' },
  { value: 'bank_transfer', label: 'Overschrijving' },
] as const;

export default function AddExpenseModal({ isOpen, onClose, preselectedCategory }: AddExpenseModalProps) {
  const queryClient = useQueryClient();

  // Form state
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(preselectedCategory || '');
  const [paymentMethod, setPaymentMethod] = useState('debit_card');
  const [merchantName, setMerchantName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [tags, setTags] = useState('');
  const [notes, setNotes] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceIntervalDays, setRecurrenceIntervalDays] = useState('30');

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Create expense mutation
  const createExpenseMutation = useMutation({
    mutationFn: async (expenseData: any) => {
      const response = await financeAPI.expenses.create(expenseData);
      return response;
    },
    onSuccess: () => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['budget', 'envelopes'] });
      queryClient.invalidateQueries({ queryKey: ['budget', 'today'] });

      // Reset form and close modal
      resetForm();
      onClose();
    },
  });

  const resetForm = () => {
    setAmount('');
    setDescription('');
    setCategory(preselectedCategory || '');
    setPaymentMethod('debit_card');
    setMerchantName('');
    setDate(new Date().toISOString().split('T')[0]);
    setTags('');
    setNotes('');
    setIsRecurring(false);
    setRecurrenceIntervalDays('30');
    setErrors({});
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!amount || parseFloat(amount) <= 0) {
      newErrors.amount = 'Bedrag moet groter zijn dan 0';
    }

    if (!description.trim()) {
      newErrors.description = 'Omschrijving is verplicht';
    }

    if (!category) {
      newErrors.category = 'Categorie is verplicht';
    }

    if (!paymentMethod) {
      newErrors.paymentMethod = 'Betaalmethode is verplicht';
    }

    if (!date) {
      newErrors.date = 'Datum is verplicht';
    }

    if (isRecurring && (!recurrenceIntervalDays || parseInt(recurrenceIntervalDays) < 1)) {
      newErrors.recurrenceIntervalDays = 'Interval moet minimaal 1 dag zijn';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const expenseData = {
      amount: parseFloat(amount),
      description: description.trim(),
      category,
      paymentMethod,
      date: new Date(date).toISOString(),
      merchantName: merchantName.trim() || undefined,
      notes: notes.trim() || undefined,
      tags: tags.trim() ? tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean) : undefined,
      isRecurring: isRecurring || undefined,
      recurrenceIntervalDays: isRecurring ? parseInt(recurrenceIntervalDays) : undefined,
    };

    createExpenseMutation.mutate(expenseData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
              <Plus className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Nieuwe uitgave
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            data-testid="close-expense-modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Bedrag *
              </div>
            </label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border ${
                errors.amount ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              } rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white text-lg font-semibold`}
              placeholder="0.00"
              data-testid="expense-amount-input"
            />
            {errors.amount && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.amount}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Omschrijving *
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border ${
                errors.description ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              } rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white`}
              placeholder="Bijv. Weekboodschappen"
              maxLength={500}
              data-testid="expense-description-input"
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.description}</p>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Categorie *
              </div>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border ${
                errors.category ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              } rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white`}
              data-testid="expense-category-select"
            >
              <option value="">Selecteer een categorie</option>
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.emoji} {cat.label}
                </option>
              ))}
            </select>
            {errors.category && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.category}</p>
            )}
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Betaalmethode *
              </div>
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border ${
                errors.paymentMethod ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              } rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white`}
              data-testid="expense-payment-method-select"
            >
              {PAYMENT_METHODS.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>
            {errors.paymentMethod && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.paymentMethod}</p>
            )}
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Datum *
              </div>
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border ${
                errors.date ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              } rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white`}
              data-testid="expense-date-input"
            />
            {errors.date && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.date}</p>
            )}
          </div>

          {/* Merchant Name (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4" />
                Winkel/Leverancier
              </div>
            </label>
            <input
              type="text"
              value={merchantName}
              onChange={(e) => setMerchantName(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
              placeholder="Bijv. Albert Heijn"
              data-testid="expense-merchant-input"
            />
          </div>

          {/* Tags (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tags (gescheiden door komma's)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
              placeholder="Bijv. essentieel, luxe"
              data-testid="expense-tags-input"
            />
          </div>

          {/* Notes (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notities
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white resize-none"
              placeholder="Extra opmerkingen..."
              data-testid="expense-notes-input"
            />
          </div>

          {/* Recurring Expense */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                data-testid="expense-recurring-checkbox"
              />
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                <span className="font-medium text-gray-900 dark:text-white">
                  Terugkerende uitgave
                </span>
              </div>
            </label>

            {isRecurring && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Herhaling interval (dagen) *
                </label>
                <input
                  type="number"
                  value={recurrenceIntervalDays}
                  onChange={(e) => setRecurrenceIntervalDays(e.target.value)}
                  min="1"
                  className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border ${
                    errors.recurrenceIntervalDays ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  } rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white`}
                  placeholder="30"
                  data-testid="expense-recurrence-interval-input"
                />
                {errors.recurrenceIntervalDays && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errors.recurrenceIntervalDays}
                  </p>
                )}
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Deze uitgave herhaalt zich elke {recurrenceIntervalDays || '30'} dagen
                </p>
              </div>
            )}
          </div>

          {/* Error Message */}
          {createExpenseMutation.isError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4" data-testid="expense-error-message">
              <p className="text-sm text-red-800 dark:text-red-300">
                {(createExpenseMutation.error as any)?.message || 'Er ging iets mis bij het opslaan van de uitgave.'}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              disabled={createExpenseMutation.isPending}
            >
              Annuleren
            </button>
            <button
              type="submit"
              disabled={createExpenseMutation.isPending}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl font-medium hover:from-purple-600 hover:to-purple-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              data-testid="expense-submit-button"
            >
              {createExpenseMutation.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Opslaan...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Uitgave toevoegen
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
