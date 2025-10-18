'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Save, Trash2, Calendar, DollarSign, Tag,
  CreditCard, FileText, Image as ImageIcon, AlertCircle
} from 'lucide-react';
import { financeAPI, ExpenseCategory, PaymentMethod } from '@/lib/api/finance';

export default function ExpenseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const expenseId = params.id as string;

  // Fetch expense
  const { data: expense, isLoading, error } = useQuery({
    queryKey: ['expense', expenseId],
    queryFn: () => financeAPI.expenses.getById(expenseId),
    enabled: !!expenseId,
  });

  // Form state
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>(ExpenseCategory.OTHER);
  const [date, setDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.DEBIT_CARD);
  const [merchantName, setMerchantName] = useState('');
  const [notes, setNotes] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Initialize form when expense loads
  useState(() => {
    if (expense) {
      setDescription(expense.description);
      setAmount(expense.amount.toString());
      setCategory(expense.category as ExpenseCategory);
      setDate(expense.date.split('T')[0]);
      setPaymentMethod(expense.paymentMethod as PaymentMethod);
      setMerchantName(expense.merchantName || '');
      setNotes(expense.notes || '');
      setReceiptUrl(expense.receiptUrl || '');
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: any) => financeAPI.expenses.update(expenseId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense', expenseId] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['budget'] });
      setIsEditing(false);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: () => financeAPI.expenses.delete(expenseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['budget'] });
      router.push('/finance/expenses');
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      description,
      amount: parseFloat(amount),
      category,
      date: new Date(date).toISOString(),
      paymentMethod,
      merchantName: merchantName || undefined,
      notes: notes || undefined,
      receiptUrl: receiptUrl || undefined,
    });
  };

  const handleDelete = () => {
    if (confirm(`Weet je zeker dat je "${expense?.description}" wilt verwijderen?`)) {
      deleteMutation.mutate();
    }
  };

  const handleCancel = () => {
    if (expense) {
      setDescription(expense.description);
      setAmount(expense.amount.toString());
      setCategory(expense.category as ExpenseCategory);
      setDate(expense.date.split('T')[0]);
      setPaymentMethod(expense.paymentMethod as PaymentMethod);
      setMerchantName(expense.merchantName || '');
      setNotes(expense.notes || '');
      setReceiptUrl(expense.receiptUrl || '');
    }
    setIsEditing(false);
  };

  // Category labels
  const categoryLabels: Record<ExpenseCategory, { label: string; emoji: string }> = {
    [ExpenseCategory.GROCERIES]: { label: 'Boodschappen', emoji: '🛒' },
    [ExpenseCategory.DINING]: { label: 'Restaurants', emoji: '🍽️' },
    [ExpenseCategory.TRANSPORTATION]: { label: 'Vervoer', emoji: '🚗' },
    [ExpenseCategory.ENTERTAINMENT]: { label: 'Entertainment', emoji: '🎮' },
    [ExpenseCategory.SHOPPING]: { label: 'Winkelen', emoji: '🛍️' },
    [ExpenseCategory.UTILITIES]: { label: 'Nutsvoorzieningen', emoji: '💡' },
    [ExpenseCategory.HOUSING]: { label: 'Huisvesting', emoji: '🏠' },
    [ExpenseCategory.HEALTHCARE]: { label: 'Gezondheidszorg', emoji: '⚕️' },
    [ExpenseCategory.OTHER]: { label: 'Overig', emoji: '📦' },
  };

  const paymentMethodLabels: Record<PaymentMethod, string> = {
    [PaymentMethod.CASH]: 'Contant',
    [PaymentMethod.DEBIT_CARD]: 'Pinpas',
    [PaymentMethod.CREDIT_CARD]: 'Creditcard',
    [PaymentMethod.BANK_TRANSFER]: 'Overboeking',
    [PaymentMethod.OTHER]: 'Overig',
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
        <div className="container mx-auto px-4 py-8 max-w-3xl">
          <div className="animate-pulse">
            <div className="h-96 bg-white/60 dark:bg-gray-800/60 rounded-3xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !expense) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
        <div className="container mx-auto px-4 py-8 max-w-3xl">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-600 dark:text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-red-800 dark:text-red-300 mb-2">
              Uitgave niet gevonden
            </h2>
            <p className="text-red-600 dark:text-red-400 mb-6">
              Deze uitgave bestaat niet of is verwijderd.
            </p>
            <Link
              href="/finance/expenses"
              className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Terug naar overzicht
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-700/50 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 max-w-3xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/finance/expenses"
                className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Terug</span>
              </Link>
              <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                {isEditing ? 'Uitgave bewerken' : 'Uitgave details'}
              </h1>
            </div>

            <div className="flex items-center gap-2">
              {!isEditing ? (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Bewerken</span>
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleteMutation.isPending}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Verwijderen</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleCancel}
                    className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    Annuleren
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={updateMutation.isPending}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>Opslaan</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Main Card */}
        <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-3xl p-8 border border-white/50 dark:border-gray-700/50 shadow-2xl">
          {/* Amount Display */}
          <div className="text-center mb-8 pb-8 border-b border-gray-200 dark:border-gray-700">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <DollarSign className="w-8 h-8 text-white" />
            </div>
            {isEditing ? (
              <div className="max-w-xs mx-auto">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Bedrag
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-gray-900 dark:text-white">
                    €
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 text-3xl font-bold text-center bg-white/50 dark:bg-gray-700/50 border-2 border-emerald-300 dark:border-emerald-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            ) : (
              <p className="text-5xl font-bold bg-gradient-to-br from-emerald-600 to-blue-600 bg-clip-text text-transparent">
                €{expense.amount.toFixed(2)}
              </p>
            )}
          </div>

          {/* Form Fields */}
          <div className="space-y-6">
            {/* Description */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <FileText className="w-4 h-4" />
                Beschrijving
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-3 bg-white/50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Bijv. Boodschappen Albert Heijn"
                />
              ) : (
                <p className="text-lg text-gray-900 dark:text-white font-medium">
                  {expense.description}
                </p>
              )}
            </div>

            {/* Merchant Name */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Tag className="w-4 h-4" />
                Winkel/Bedrijf
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={merchantName}
                  onChange={(e) => setMerchantName(e.target.value)}
                  className="w-full px-4 py-3 bg-white/50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Optioneel"
                />
              ) : (
                <p className="text-gray-700 dark:text-gray-300">
                  {expense.merchantName || '-'}
                </p>
              )}
            </div>

            {/* Category */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Tag className="w-4 h-4" />
                Categorie
              </label>
              {isEditing ? (
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                  className="w-full px-4 py-3 bg-white/50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Object.entries(categoryLabels).map(([key, { label, emoji }]) => (
                    <option key={key} value={key}>
                      {emoji} {label}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/70 dark:bg-gray-700/70 rounded-xl text-gray-900 dark:text-white font-medium">
                  {categoryLabels[expense.category as ExpenseCategory].emoji}
                  {categoryLabels[expense.category as ExpenseCategory].label}
                </span>
              )}
            </div>

            {/* Date */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Calendar className="w-4 h-4" />
                Datum
              </label>
              {isEditing ? (
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-3 bg-white/50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <p className="text-gray-700 dark:text-gray-300">
                  {new Date(expense.date).toLocaleDateString('nl-NL', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              )}
            </div>

            {/* Payment Method */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <CreditCard className="w-4 h-4" />
                Betaalmethode
              </label>
              {isEditing ? (
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full px-4 py-3 bg-white/50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Object.entries(paymentMethodLabels).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-gray-700 dark:text-gray-300">
                  {paymentMethodLabels[expense.paymentMethod as PaymentMethod]}
                </p>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <FileText className="w-4 h-4" />
                Notities
              </label>
              {isEditing ? (
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-white/50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Extra informatie (optioneel)"
                />
              ) : (
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {expense.notes || '-'}
                </p>
              )}
            </div>

            {/* Receipt URL */}
            {(isEditing || expense.receiptUrl) && (
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <ImageIcon className="w-4 h-4" />
                  Bonnetje URL
                </label>
                {isEditing ? (
                  <input
                    type="url"
                    value={receiptUrl}
                    onChange={(e) => setReceiptUrl(e.target.value)}
                    className="w-full px-4 py-3 bg-white/50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://..."
                  />
                ) : expense.receiptUrl ? (
                  <a
                    href={expense.receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Bekijk bonnetje →
                  </a>
                ) : (
                  <p className="text-gray-700 dark:text-gray-300">-</p>
                )}
              </div>
            )}

            {/* Metadata */}
            <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 mb-1">Aangemaakt</p>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {new Date(expense.createdAt).toLocaleDateString('nl-NL')}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400 mb-1">Laatst gewijzigd</p>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {new Date(expense.updatedAt).toLocaleDateString('nl-NL')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
