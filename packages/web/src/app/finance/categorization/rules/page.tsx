'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Sparkles,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  Filter,
  Search,
  AlertCircle,
  CheckCircle,
  Download,
} from 'lucide-react';
import { financeAPI, ExpenseCategory, CategorizationRule } from '@/lib/api/finance';
import { exportRulesToCSV } from '@/lib/utils/export';

type PatternType = 'exact' | 'contains' | 'regex' | 'iban';

export default function CategorizationRulesPage() {
  const queryClient = useQueryClient();

  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<CategorizationRule>>({});
  const [showNewRuleModal, setShowNewRuleModal] = useState(false);
  const [newRuleForm, setNewRuleForm] = useState({
    pattern: '',
    patternType: 'contains' as PatternType,
    category: '' as ExpenseCategory | '',
    confidence: 90,
    priority: 1,
  });
  const [testPattern, setTestPattern] = useState('');
  const [testResult, setTestResult] = useState<{
    matches: boolean;
    message: string;
  } | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Fetch all rules
  const { data: rules, isLoading } = useQuery({
    queryKey: ['categorization', 'rules'],
    queryFn: () => financeAPI.categorization.getAllRules(),
  });

  // Create rule mutation
  const createRuleMutation = useMutation({
    mutationFn: (params: typeof newRuleForm) =>
      financeAPI.categorization.createRule(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorization', 'rules'] });
      setShowNewRuleModal(false);
      setNewRuleForm({
        pattern: '',
        patternType: 'contains',
        category: '',
        confidence: 90,
        priority: 1,
      });
    },
  });

  // Update rule mutation
  const updateRuleMutation = useMutation({
    mutationFn: ({ id, ...params }: { id: string } & Partial<CategorizationRule>) =>
      financeAPI.categorization.updateRule(id, params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorization', 'rules'] });
      setEditingRuleId(null);
      setEditForm({});
    },
  });

  // Delete rule mutation
  const deleteRuleMutation = useMutation({
    mutationFn: (id: string) => financeAPI.categorization.deleteRule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorization', 'rules'] });
      setDeleteConfirmId(null);
    },
  });

  // Filter rules
  const filteredRules = (rules || []).filter((rule) => {
    if (searchTerm) {
      const query = searchTerm.toLowerCase();
      if (
        !rule.pattern.toLowerCase().includes(query) &&
        !rule.category.toLowerCase().includes(query)
      ) {
        return false;
      }
    }

    if (filterCategory !== 'all' && rule.category !== filterCategory) {
      return false;
    }

    if (filterType !== 'all' && rule.patternType !== filterType) {
      return false;
    }

    if (filterSource !== 'all' && rule.source !== filterSource) {
      return false;
    }

    return true;
  });

  // Test pattern against sample text
  const handleTestPattern = (pattern: string, patternType: PatternType, testText: string) => {
    try {
      let matches = false;

      switch (patternType) {
        case 'exact':
          matches = testText.toLowerCase() === pattern.toLowerCase();
          break;
        case 'contains':
          matches = testText.toLowerCase().includes(pattern.toLowerCase());
          break;
        case 'regex':
          const regex = new RegExp(pattern, 'i');
          matches = regex.test(testText);
          break;
        case 'iban':
          matches = testText.replace(/\s/g, '').includes(pattern.replace(/\s/g, ''));
          break;
      }

      setTestResult({
        matches,
        message: matches ? 'Pattern matches!' : 'Pattern does not match',
      });
    } catch (error) {
      setTestResult({
        matches: false,
        message: 'Invalid pattern (check regex syntax)',
      });
    }
  };

  // Start editing a rule
  const handleStartEdit = (rule: CategorizationRule) => {
    setEditingRuleId(rule.id);
    setEditForm({
      pattern: rule.pattern,
      patternType: rule.patternType,
      category: rule.category,
      confidence: rule.confidence,
      priority: rule.priority,
    });
  };

  // Save edited rule
  const handleSaveEdit = () => {
    if (!editingRuleId) return;
    updateRuleMutation.mutate({ id: editingRuleId, ...editForm });
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingRuleId(null);
    setEditForm({});
  };

  // Create new rule
  const handleCreateRule = () => {
    if (!newRuleForm.pattern || !newRuleForm.category) {
      return;
    }
    createRuleMutation.mutate(newRuleForm);
  };

  // Get pattern type badge
  const getPatternTypeBadge = (type: PatternType) => {
    const colors = {
      exact: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
      contains: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
      regex: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400',
      iban: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
    };

    return (
      <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${colors[type]}`}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </span>
    );
  };

  // Get source badge
  const getSourceBadge = (source?: string) => {
    if (!source) return null;

    const colors = {
      manual: 'bg-gray-50 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
      feedback: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
      ml: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
    };

    return (
      <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${colors[source as keyof typeof colors]}`}>
        {source === 'ml' ? 'AI Generated' : source.charAt(0).toUpperCase() + source.slice(1)}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/finance/bank/reconcile"
                className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />
              <Sparkles className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Categorization Rules
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => exportRulesToCSV(filteredRules)}
                disabled={filteredRules.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                title="Export to CSV"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export</span>
              </button>
              <button
                onClick={() => setShowNewRuleModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl font-semibold hover:from-purple-600 hover:to-purple-700 transition-all shadow-lg"
              >
                <Plus className="w-4 h-4" />
                New Rule
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Search and Filters */}
        <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 border border-white/50 dark:border-gray-700/50 shadow-lg mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search patterns or categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Filter by category */}
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">All Categories</option>
              {Object.values(ExpenseCategory).map((category) => (
                <option key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1).replace(/_/g, ' ')}
                </option>
              ))}
            </select>

            {/* Filter by pattern type */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="exact">Exact</option>
              <option value="contains">Contains</option>
              <option value="regex">Regex</option>
              <option value="iban">IBAN</option>
            </select>

            {/* Filter by source */}
            <select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value)}
              className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">All Sources</option>
              <option value="manual">Manual</option>
              <option value="feedback">From Feedback</option>
              <option value="ml">AI Generated</option>
            </select>
          </div>
        </div>

        {/* Rules List */}
        {isLoading ? (
          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-12 border border-white/50 dark:border-gray-700/50 shadow-lg text-center">
            <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Loading rules...</p>
          </div>
        ) : filteredRules.length === 0 ? (
          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-12 border border-white/50 dark:border-gray-700/50 shadow-lg text-center">
            <Sparkles className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              No rules found
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {searchTerm || filterCategory !== 'all' || filterType !== 'all' || filterSource !== 'all'
                ? 'Try adjusting your filters'
                : 'Create your first categorization rule to get started'}
            </p>
            <button
              onClick={() => setShowNewRuleModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl font-semibold hover:from-purple-600 hover:to-purple-700 transition-all shadow-lg"
            >
              Create First Rule
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRules.map((rule) => (
              <div
                key={rule.id}
                className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 border border-white/50 dark:border-gray-700/50 shadow-lg hover:shadow-xl transition-shadow"
              >
                {editingRuleId === rule.id ? (
                  // Edit mode
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Pattern
                        </label>
                        <input
                          type="text"
                          value={editForm.pattern || ''}
                          onChange={(e) => setEditForm({ ...editForm, pattern: e.target.value })}
                          className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Pattern Type
                        </label>
                        <select
                          value={editForm.patternType || 'contains'}
                          onChange={(e) =>
                            setEditForm({ ...editForm, patternType: e.target.value as PatternType })
                          }
                          className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        >
                          <option value="exact">Exact</option>
                          <option value="contains">Contains</option>
                          <option value="regex">Regex</option>
                          <option value="iban">IBAN</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Category
                        </label>
                        <select
                          value={editForm.category || ''}
                          onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                          className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        >
                          {Object.values(ExpenseCategory).map((category) => (
                            <option key={category} value={category}>
                              {category.charAt(0).toUpperCase() + category.slice(1).replace(/_/g, ' ')}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Confidence (%)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={editForm.confidence || 90}
                          onChange={(e) =>
                            setEditForm({ ...editForm, confidence: parseInt(e.target.value) })
                          }
                          className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Priority
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={editForm.priority || 1}
                          onChange={(e) =>
                            setEditForm({ ...editForm, priority: parseInt(e.target.value) })
                          }
                          className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-3">
                      <button
                        onClick={handleCancelEdit}
                        className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleSaveEdit}
                        disabled={updateRuleMutation.isPending}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all disabled:opacity-50"
                      >
                        <Save className="w-4 h-4" />
                        {updateRuleMutation.isPending ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>
                ) : (
                  // View mode
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                          {rule.pattern}
                        </h3>
                        {getPatternTypeBadge(rule.patternType)}
                        {getSourceBadge(rule.source)}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Category:</span>
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {rule.category.charAt(0).toUpperCase() +
                              rule.category.slice(1).replace(/_/g, ' ')}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Confidence:</span>
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {rule.confidence}%
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Priority:</span>
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {rule.priority}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Created:</span>
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {new Date(rule.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => handleStartEdit(rule)}
                        className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        title="Edit rule"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(rule.id)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Delete rule"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Rule Modal */}
      {showNewRuleModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Create New Rule
              </h2>
              <button
                onClick={() => setShowNewRuleModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Pattern *
                </label>
                <input
                  type="text"
                  value={newRuleForm.pattern}
                  onChange={(e) => setNewRuleForm({ ...newRuleForm, pattern: e.target.value })}
                  placeholder="e.g., 'UBER', 'DELIVEROO', 'BE12345678901234'"
                  className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Pattern Type *
                </label>
                <select
                  value={newRuleForm.patternType}
                  onChange={(e) =>
                    setNewRuleForm({ ...newRuleForm, patternType: e.target.value as PatternType })
                  }
                  className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="exact">Exact - Match exact text</option>
                  <option value="contains">Contains - Match if text contains pattern</option>
                  <option value="regex">Regex - Use regular expression</option>
                  <option value="iban">IBAN - Match IBAN number</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Category *
                </label>
                <select
                  value={newRuleForm.category}
                  onChange={(e) =>
                    setNewRuleForm({ ...newRuleForm, category: e.target.value as ExpenseCategory })
                  }
                  className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">-- Select Category --</option>
                  {Object.values(ExpenseCategory).map((category) => (
                    <option key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1).replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Confidence (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newRuleForm.confidence}
                    onChange={(e) =>
                      setNewRuleForm({ ...newRuleForm, confidence: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Priority (lower = higher priority)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newRuleForm.priority}
                    onChange={(e) =>
                      setNewRuleForm({ ...newRuleForm, priority: parseInt(e.target.value) || 1 })
                    }
                    className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Test Pattern */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Test Pattern (optional)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={testPattern}
                    onChange={(e) => setTestPattern(e.target.value)}
                    placeholder="e.g., 'UBER TRIP TO AMSTERDAM'"
                    className="flex-1 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <button
                    onClick={() =>
                      handleTestPattern(
                        newRuleForm.pattern,
                        newRuleForm.patternType,
                        testPattern
                      )
                    }
                    disabled={!newRuleForm.pattern || !testPattern}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Test
                  </button>
                </div>

                {testResult && (
                  <div
                    className={`mt-3 p-3 rounded-lg flex items-center gap-2 ${
                      testResult.matches
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                        : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                    }`}
                  >
                    {testResult.matches ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <AlertCircle className="w-5 h-5" />
                    )}
                    <span className="font-semibold">{testResult.message}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowNewRuleModal(false)}
                className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateRule}
                disabled={
                  !newRuleForm.pattern || !newRuleForm.category || createRuleMutation.isPending
                }
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl font-semibold hover:from-purple-600 hover:to-purple-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createRuleMutation.isPending ? 'Creating...' : 'Create Rule'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Delete Rule?</h2>
            </div>

            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete this categorization rule? This action cannot be
              undone.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteRuleMutation.mutate(deleteConfirmId)}
                disabled={deleteRuleMutation.isPending}
                className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-semibold hover:from-red-600 hover:to-red-700 transition-all shadow-lg disabled:opacity-50"
              >
                {deleteRuleMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
