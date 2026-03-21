import type {
  BudgetAlert,
  BudgetConfig,
  Forecaster,
  ForecasterConfig,
  ForecastOptions,
  ForecastResult,
  HistoryInput,
  TrendOptions,
  TrendResult,
  UsageRecord,
} from './types.js';
import { ForecastError } from './errors.js';
import { normalizeHistory } from './normalize.js';
import { forecast } from './forecast.js';
import { detectTrend } from './trend.js';
import { alertOnBudget } from './budget.js';

/**
 * Factory function that returns a stateful forecaster instance
 * with pre-configured settings.
 */
export function createForecaster(config: ForecasterConfig): Forecaster {
  let history: UsageRecord[] = [];
  const defaultOptions: ForecastOptions = {
    method: config.method,
    horizon: config.horizon,
    window: config.window,
    confidenceLevels: config.confidenceLevels,
    alpha: config.alpha,
    weights: config.weights,
    decay: config.decay,
    dayOfWeekWeights: config.dayOfWeekWeights,
    floor: config.floor,
  };

  return {
    load(input: HistoryInput): void {
      history = normalizeHistory(input);
    },

    append(records: UsageRecord | UsageRecord[]): void {
      const toAppend = Array.isArray(records) ? records : [records];
      history = [...history, ...toAppend];
    },

    forecast(overrides?: Partial<ForecastOptions>): ForecastResult {
      if (history.length === 0) {
        throw new ForecastError('INVALID_HISTORY', 'No history loaded. Call load() first.');
      }
      return forecast(history, { ...defaultOptions, ...overrides });
    },

    detectTrend(overrides?: Partial<TrendOptions>): TrendResult {
      if (history.length === 0) {
        throw new ForecastError('INVALID_HISTORY', 'No history loaded. Call load() first.');
      }
      return detectTrend(history, overrides);
    },

    checkBudget(overrides?: Partial<BudgetConfig>): BudgetAlert {
      if (history.length === 0) {
        throw new ForecastError('INVALID_HISTORY', 'No history loaded. Call load() first.');
      }
      const budgetConfig = { ...config.budget, ...overrides } as BudgetConfig;
      if (!budgetConfig || !budgetConfig.amount) {
        throw new ForecastError('INVALID_BUDGET', 'No budget configured. Provide budget in config or overrides.');
      }
      return alertOnBudget(history, budgetConfig, defaultOptions);
    },

    getHistory(): UsageRecord[] {
      return [...history];
    },

    reset(): void {
      history = [];
    },
  };
}
