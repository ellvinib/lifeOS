'use client';

import { useState, useEffect } from 'react';
import { X, AlertCircle, CheckCircle, TrendingDown, Lightbulb } from 'lucide-react';
import { financeAPI } from '@/lib/api/finance';

interface PrePurchaseCheckProps {
  isOpen: boolean;
  onClose: () => void;
  onProceedToLog: (amount: number, category?: string) => void;
  currentDailyRemaining: number;
  envelopes: Array<{
    name: string;
    emoji: string;
    current: number;
    total: number;
  }>;
}

interface ImpactAnalysis {
  canAfford: boolean;
  severity: 'safe' | 'warning' | 'danger';
  dailyImpact: {
    remainingAfter: number;
    percentageUsed: number;
  };
  envelopeImpacts: Array<{
    name: string;
    emoji: string;
    newPercentage: number;
    status: 'safe' | 'warning' | 'danger';
  }>;
  recommendations: string[];
  alternatives: Array<{
    suggestion: string;
    savings: number;
  }>;
}

export function PrePurchaseCheck({
  isOpen,
  onClose,
  onProceedToLog,
  currentDailyRemaining,
  envelopes,
}: PrePurchaseCheckProps) {
  const [amount, setAmount] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [analysis, setAnalysis] = useState<ImpactAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Categories matching the envelopes
  const categories = envelopes.map(env => ({
    value: env.name.toLowerCase(),
    label: env.name,
    emoji: env.emoji,
  }));

  useEffect(() => {
    if (!amount || parseFloat(amount) <= 0 || !selectedCategory) {
      setAnalysis(null);
      return;
    }

    const fetchAffordability = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const purchaseAmount = parseFloat(amount);
        const response = await financeAPI.budget.checkAffordability(
          purchaseAmount,
          selectedCategory as any
        );

        // Transform API response to ImpactAnalysis format
        const envelopeImpacts = response.envelopeImpact
          ? [{
              name: response.envelopeImpact.envelopeName,
              emoji: envelopes.find(e => e.name === response.envelopeImpact?.envelopeName)?.emoji || '📦',
              newPercentage: response.envelopeImpact.newPercentage,
              status: response.envelopeImpact.exceedsEnvelope ? 'danger' as const :
                      response.envelopeImpact.newPercentage >= 85 ? 'warning' as const :
                      'safe' as const,
            }]
          : [];

        const recommendations: string[] = [];
        if (!response.canAfford) {
          const overage = Math.abs(response.remainingDaily);
          recommendations.push(`Je overschrijdt je dagelijkse limiet met €${overage.toFixed(2)}`);
        }
        if (response.envelopeImpact?.exceedsEnvelope) {
          const overage = response.envelopeImpact.newPercentage - 100;
          recommendations.push(`${response.envelopeImpact.envelopeName} envelope zal ${overage.toFixed(0)}% overschreden zijn`);
        } else if (response.envelopeImpact && response.envelopeImpact.newPercentage >= 85) {
          recommendations.push(`${response.envelopeImpact.envelopeName} envelope zal ${response.envelopeImpact.newPercentage.toFixed(0)}% vol zijn`);
        }

        // Generate alternatives
        const alternatives: Array<{ suggestion: string; savings: number }> = [];
        if (purchaseAmount > 30) {
          alternatives.push({
            suggestion: 'Wacht tot volgende week voor deze aankoop',
            savings: purchaseAmount,
          });
        }
        if (purchaseAmount > 20) {
          alternatives.push({
            suggestion: 'Zoek naar een goedkoper alternatief',
            savings: purchaseAmount * 0.3,
          });
        }
        if (selectedCategory === 'dining' || selectedCategory === 'uit eten') {
          alternatives.push({
            suggestion: 'Kook thuis en bespaar',
            savings: purchaseAmount * 0.7,
          });
        }

        const severity: 'safe' | 'warning' | 'danger' =
          !response.canAfford || recommendations.length > 1 ? 'danger' :
          recommendations.length > 0 ? 'warning' :
          'safe';

        setAnalysis({
          canAfford: response.canAfford,
          severity,
          dailyImpact: {
            remainingAfter: response.remainingDaily,
            percentageUsed: ((purchaseAmount / (currentDailyRemaining + purchaseAmount)) * 100),
          },
          envelopeImpacts,
          recommendations,
          alternatives,
        });
      } catch (err) {
        console.error('Failed to check affordability:', err);
        setError('Kon affordability niet controleren. Probeer het later opnieuw.');
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimeout = setTimeout(fetchAffordability, 500);
    return () => clearTimeout(debounceTimeout);
  }, [amount, selectedCategory, currentDailyRemaining, envelopes]);

  const getSeverityStyles = () => {
    if (!analysis) return { bg: 'bg-gray-50 dark:bg-gray-900/20', border: 'border-gray-200 dark:border-gray-700', text: 'text-gray-700 dark:text-gray-300' };

    switch (analysis.severity) {
      case 'safe':
        return {
          bg: 'bg-emerald-50 dark:bg-emerald-900/20',
          border: 'border-emerald-200 dark:border-emerald-700',
          text: 'text-emerald-800 dark:text-emerald-300',
          icon: CheckCircle,
          iconColor: 'text-emerald-600',
        };
      case 'warning':
        return {
          bg: 'bg-orange-50 dark:bg-orange-900/20',
          border: 'border-orange-200 dark:border-orange-700',
          text: 'text-orange-800 dark:text-orange-300',
          icon: AlertCircle,
          iconColor: 'text-orange-600',
        };
      case 'danger':
        return {
          bg: 'bg-red-50 dark:bg-red-900/20',
          border: 'border-red-200 dark:border-red-700',
          text: 'text-red-800 dark:text-red-300',
          icon: AlertCircle,
          iconColor: 'text-red-600',
        };
    }
  };

  const styles = getSeverityStyles();
  const StatusIcon = styles.icon || CheckCircle;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl max-w-2xl w-full shadow-2xl border border-white/50 dark:border-gray-700/50 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50 p-6 rounded-t-3xl">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Kan ik dit betalen?
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
            >
              <X className="w-6 h-6 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Check de impact op je budget voordat je een aankoop doet
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Amount Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Bedrag
            </label>
            <div className="relative">
              <span className="absolute left-6 top-1/2 -translate-y-1/2 text-3xl font-bold text-gray-400">
                €
              </span>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-14 pr-6 py-4 text-4xl font-bold border-2 border-gray-300 dark:border-gray-600 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all"
                autoFocus
              />
            </div>
          </div>

          {/* Category Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Categorie
            </label>
            <div className="grid grid-cols-2 gap-3">
              {categories.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setSelectedCategory(cat.value)}
                  className={`p-4 rounded-xl border-2 text-left font-medium transition-all ${
                    selectedCategory === cat.value
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 scale-[1.02]'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <span className="text-2xl mr-2">{cat.emoji}</span>
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Error State */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-2xl p-4">
              <p className="text-red-800 dark:text-red-300 text-sm">{error}</p>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-700 rounded-2xl p-6">
              <div className="flex items-center justify-center gap-3">
                <div className="w-5 h-5 border-2 border-gray-300 dark:border-gray-600 border-t-purple-600 rounded-full animate-spin"></div>
                <p className="text-gray-600 dark:text-gray-400">Berekenen...</p>
              </div>
            </div>
          )}

          {/* Impact Analysis */}
          {analysis && !isLoading && (
            <div className={`${styles.bg} border ${styles.border} rounded-2xl p-6 space-y-4 animate-in slide-in-from-bottom duration-300`}>
              <div className="flex items-start gap-3">
                <StatusIcon className={`w-6 h-6 ${styles.iconColor} mt-1 flex-shrink-0`} />
                <div className="flex-1">
                  <p className={`font-semibold text-lg ${styles.text} mb-2`}>
                    {analysis.canAfford ? '✅ JA! Dit gebeurt er:' : '❌ LET OP! Budget overschrijding:'}
                  </p>

                  {/* Daily Impact */}
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between items-center text-sm">
                      <span className={styles.text}>Vandaag na aankoop:</span>
                      <span className={`font-bold text-lg ${analysis.dailyImpact.remainingAfter < 0 ? 'text-red-600 dark:text-red-400' : styles.text}`}>
                        €{Math.abs(analysis.dailyImpact.remainingAfter).toFixed(2)} {analysis.dailyImpact.remainingAfter < 0 ? 'OVER' : 'over'}
                      </span>
                    </div>
                  </div>

                  {/* Envelope Impacts */}
                  {selectedCategory && analysis.envelopeImpacts.length > 0 && (
                    <div className="space-y-2">
                      <p className={`text-sm font-medium ${styles.text} mb-2`}>Impact op enveloppen:</p>
                      {analysis.envelopeImpacts
                        .filter(env => env.name.toLowerCase() === selectedCategory)
                        .map((impact, idx) => (
                          <div key={idx} className="flex items-center justify-between text-sm bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg p-3">
                            <span className={styles.text}>
                              {impact.emoji} {impact.name}
                            </span>
                            <span className={`font-bold ${
                              impact.status === 'danger' ? 'text-red-600 dark:text-red-400' :
                              impact.status === 'warning' ? 'text-orange-600 dark:text-orange-400' :
                              'text-emerald-600 dark:text-emerald-400'
                            }`}>
                              {impact.newPercentage.toFixed(0)}% gebruikt
                            </span>
                          </div>
                        ))}
                    </div>
                  )}

                  {/* Recommendations */}
                  {analysis.recommendations.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-300/50 dark:border-gray-600/50">
                      <p className={`text-sm font-medium ${styles.text} mb-2`}>Waarschuwingen:</p>
                      <ul className="space-y-1">
                        {analysis.recommendations.map((rec, idx) => (
                          <li key={idx} className={`text-sm ${styles.text} flex items-start gap-2`}>
                            <span className="mt-1">•</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Alternatives */}
          {analysis && analysis.alternatives.length > 0 && analysis.severity !== 'safe' && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-2xl p-6 animate-in slide-in-from-bottom duration-300 delay-150">
              <div className="flex items-start gap-3">
                <Lightbulb className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-blue-800 dark:text-blue-300 mb-3">
                    💡 Slimme alternatieven:
                  </p>
                  <ul className="space-y-2">
                    {analysis.alternatives.map((alt, idx) => (
                      <li key={idx} className="flex justify-between items-center text-sm bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg p-3">
                        <span className="text-blue-700 dark:text-blue-400">{alt.suggestion}</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          Bespaar €{alt.savings.toFixed(2)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Annuleren
            </button>
            <button
              onClick={() => {
                const purchaseAmount = parseFloat(amount);
                if (!isNaN(purchaseAmount) && purchaseAmount > 0) {
                  onProceedToLog(purchaseAmount, selectedCategory);
                }
              }}
              disabled={!amount || parseFloat(amount) <= 0}
              className={`flex-1 px-6 py-3 rounded-xl font-medium transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                analysis?.severity === 'safe'
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white'
                  : 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white'
              }`}
            >
              {analysis?.canAfford ? 'Log deze uitgave ✅' : 'Toch doorgaan ⚠️'}
            </button>
          </div>

          {/* Additional Info */}
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center pt-2">
            💡 Tip: Deze check helpt je bewust te blijven van je uitgaven
          </p>
        </div>
      </div>
    </div>
  );
}
