import type {
  BudgetAlert,
  BudgetConfig,
  ForecastOptions,
  HistoryInput,
} from './types.js';
import { ForecastError } from './errors.js';
import { normalizeHistory, formatDateOnly } from './normalize.js';
import { forecast } from './forecast.js';

/**
 * Evaluate whether projected spend will exceed a budget.
 */
export function alertOnBudget(
  history: HistoryInput,
  budget: BudgetConfig,
  options?: ForecastOptions,
): BudgetAlert {
  if (!budget || budget.amount <= 0) {
    throw new ForecastError('INVALID_BUDGET', 'Budget amount must be a positive number');
  }

  const records = normalizeHistory(history);

  // Determine budget period
  const now = new Date();
  const periodStart = budget.periodStart ?? formatDateOnly(new Date(now.getFullYear(), now.getMonth(), 1));
  const periodEnd = budget.periodEnd ?? formatDateOnly(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  const warningThreshold = budget.warningThreshold ?? 0.8;
  const criticalThreshold = budget.criticalThreshold ?? 1.0;

  // Calculate actual spend within the budget period
  const periodRecords = records.filter(r => r.date >= periodStart && r.date <= periodEnd);
  const actualSpend = periodRecords.reduce((sum, r) => sum + (r.cost ?? 0), 0);

  // Calculate days elapsed and remaining
  const startDate = new Date(periodStart);
  const endDate = new Date(periodEnd);
  const today = new Date(budget.referenceDate ?? formatDateOnly(now));

  const effectiveToday = today > endDate ? endDate : today < startDate ? startDate : today;
  const daysElapsed = Math.max(1, Math.ceil((effectiveToday.getTime() - startDate.getTime()) / (86400000)) + 1);
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000) + 1;
  const daysRemaining = Math.max(0, totalDays - daysElapsed);

  // Daily burn rate
  const dailyBurnRate = daysElapsed > 0 ? actualSpend / daysElapsed : 0;

  // Required daily rate to stay within budget
  const remainingBudget = budget.amount - actualSpend;
  const requiredDailyRate = daysRemaining > 0 ? remainingBudget / daysRemaining : 0;

  // Forecast remaining spend
  let forecastedRemainingSpend = 0;
  let forecastResult;

  if (daysRemaining > 0 && records.length >= 3) {
    forecastResult = forecast(history, {
      ...options,
      horizon: daysRemaining,
    });
    forecastedRemainingSpend = forecastResult.summary.totalPredicted;
  } else {
    // If period ended or insufficient data, use burn rate extrapolation
    forecastedRemainingSpend = dailyBurnRate * daysRemaining;
    forecastResult = forecast(history, {
      ...options,
      horizon: Math.max(1, daysRemaining),
    });
  }

  const projectedTotal = actualSpend + forecastedRemainingSpend;
  const projectedVariance = projectedTotal - budget.amount;
  const projectedBudgetRatio = budget.amount === 0 ? 0 : projectedTotal / budget.amount;

  // Determine status
  let status: 'on_track' | 'warning' | 'critical';
  if (projectedTotal >= budget.amount * criticalThreshold) {
    status = 'critical';
  } else if (projectedTotal >= budget.amount * warningThreshold) {
    status = 'warning';
  } else {
    status = 'on_track';
  }

  // Calculate exhaustion date
  let exhaustionDate: string | undefined;
  if (projectedTotal > budget.amount && forecastResult && daysRemaining > 0) {
    let cumulative = actualSpend;
    for (const prediction of forecastResult.predictions) {
      cumulative += prediction.predicted;
      if (cumulative >= budget.amount) {
        exhaustionDate = prediction.date;
        break;
      }
    }
  }

  // Confidence level
  const confidenceLevels = options?.confidenceLevels ?? [0.80, 0.95];
  const confidenceLevel = Math.max(...confidenceLevels);

  return {
    status,
    budgetAmount: budget.amount,
    actualSpend,
    forecastedRemainingSpend,
    projectedTotal,
    projectedVariance,
    projectedBudgetRatio,
    exhaustionDate,
    daysRemaining,
    dailyBurnRate,
    requiredDailyRate,
    forecast: forecastResult,
    confidenceLevel,
  };
}
