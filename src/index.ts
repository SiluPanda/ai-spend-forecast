// ai-spend-forecast - Predict future AI API spending from historical usage

// Core functions
export { forecast } from './forecast.js';
export { detectTrend } from './trend.js';
export { alertOnBudget } from './budget.js';
export { createForecaster } from './forecaster.js';
export { normalizeHistory } from './normalize.js';
export { toChartData } from './chart.js';

// Types
export type {
  UsageRecord,
  SimpleCostHistory,
  ObjectCostHistory,
  DateCostMap,
  HistoryInput,
  ForecastMethod,
  ForecastOptions,
  TrendOptions,
  ForecastResult,
  ForecastPoint,
  ConfidenceBound,
  ForecastSummary,
  RegressionFit,
  TrendResult,
  BudgetConfig,
  BudgetAlert,
  ForecasterConfig,
  Forecaster,
  ChartPoint,
  ChartDataOptions,
} from './types.js';

// Errors
export { ForecastError } from './errors.js';
export type { ForecastErrorCode } from './errors.js';
