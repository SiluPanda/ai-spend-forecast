// ── Input Types ──────────────────────────────────────────────────────

/** A single time period's usage data. */
export interface UsageRecord {
  /** ISO 8601 date string (YYYY-MM-DD) or datetime string for hourly data. */
  date: string;

  /** Total cost in USD for this period. */
  cost?: number;

  /** Token usage breakdown for cost resolution via model-price-registry. */
  tokenUsage?: {
    provider: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    cachedInputTokens?: number;
  };

  /** Number of API requests made in this period. */
  requests?: number;

  /** Arbitrary metadata tags for filtering and grouping. */
  metadata?: Record<string, string>;
}

/** Simple cost-only array: [date, cost] tuples. */
export type SimpleCostHistory = Array<[string, number]>;

/** Object array with at least date and cost fields. */
export type ObjectCostHistory = Array<UsageRecord>;

/** Pre-aggregated daily totals keyed by date. */
export type DateCostMap = Record<string, number>;

/** Union type accepted by all top-level functions. */
export type HistoryInput = SimpleCostHistory | ObjectCostHistory | DateCostMap;

// ── Forecast Options ────────────────────────────────────────────────

export type ForecastMethod = 'sma' | 'ema' | 'wma' | 'ols' | 'wls';

export interface ForecastOptions {
  /** Forecasting method. Default: 'ema'. */
  method?: ForecastMethod;

  /** Number of future periods to forecast. Default: 14. */
  horizon?: number;

  /** Number of historical periods to use for the forecast. Default: 7 for MA, all for regression. */
  window?: number;

  /** Confidence levels for prediction intervals. Default: [0.80, 0.95]. */
  confidenceLevels?: number[];

  /** EMA smoothing factor. Default: 2 / (window + 1). */
  alpha?: number;

  /** Custom weights for WMA or WLS. */
  weights?: number[];

  /** Decay factor for automatic WLS weight generation. Default: 0.95. */
  decay?: number;

  /** Day-of-week weight multipliers for WMA forecasts. Keys: 0 (Sun) - 6 (Sat). */
  dayOfWeekWeights?: Partial<Record<number, number>>;

  /** Minimum predicted cost per period. Default: 0. */
  floor?: number;
}

export interface TrendOptions {
  /** Number of historical periods to include in the trend analysis. Default: all data. */
  window?: number;

  /** Significance level for the t-test. Default: 0.05. */
  significanceLevel?: number;
}

// ── Forecast Result ─────────────────────────────────────────────────

export interface ForecastResult {
  /** The forecasting method used. */
  method: ForecastMethod;

  /** The horizon (number of forecasted periods). */
  horizon: number;

  /** The window size used. */
  window: number;

  /** Predicted values for each future period. */
  predictions: ForecastPoint[];

  /** Summary statistics of the forecast. */
  summary: ForecastSummary;

  /** The historical data used, in normalized form. */
  history: UsageRecord[];

  /** Model fit statistics (for regression methods only). */
  fit?: RegressionFit;
}

export interface ForecastPoint {
  /** ISO 8601 date string for this forecasted period. */
  date: string;

  /** Point forecast: best estimate for this period's cost. */
  predicted: number;

  /** Confidence interval bounds at each configured level. */
  bounds: ConfidenceBound[];
}

export interface ConfidenceBound {
  /** Confidence level (e.g., 0.80, 0.95). */
  level: number;

  /** Lower bound of the prediction interval. */
  lower: number;

  /** Upper bound of the prediction interval. */
  upper: number;
}

export interface ForecastSummary {
  /** Sum of all predicted values over the horizon. */
  totalPredicted: number;

  /** Average predicted daily cost over the horizon. */
  averagePredicted: number;

  /** Minimum predicted daily cost in the horizon. */
  minPredicted: number;

  /** Maximum predicted daily cost in the horizon. */
  maxPredicted: number;

  /** Sum of upper bound values at the highest confidence level. */
  totalUpperBound: number;

  /** Sum of lower bound values at the highest confidence level. */
  totalLowerBound: number;
}

export interface RegressionFit {
  /** Intercept of the regression line. */
  intercept: number;

  /** Slope of the regression line (cost change per period). */
  slope: number;

  /** R-squared (coefficient of determination). */
  rSquared: number;

  /** Standard error of the regression. */
  standardError: number;

  /** Standard error of the slope coefficient. */
  slopeStandardError: number;

  /** Number of data points used in the fit. */
  dataPoints: number;

  /** Degrees of freedom (n - 2). */
  degreesOfFreedom: number;
}

// ── Trend Result ────────────────────────────────────────────────────

export interface TrendResult {
  /** Trend direction. */
  direction: 'increasing' | 'decreasing' | 'stable';

  /** Slope of the regression line: cost change per period. */
  slopePerPeriod: number;

  /** Slope as percentage change per period, relative to mean cost. */
  slopePercentPerPeriod: number;

  /** Projected cost change over the next 30 periods. */
  projected30PeriodChange: number;

  /** True if the slope is statistically significant. */
  significant: boolean;

  /** The p-value of the slope coefficient's t-test. */
  pValue: number;

  /** R-squared: proportion of variance explained by the linear trend. */
  rSquared: number;

  /** Number of data points used in the regression. */
  dataPoints: number;
}

// ── Budget Types ────────────────────────────────────────────────────

export interface BudgetConfig {
  /** Budget amount in USD. */
  amount: number;

  /** Budget period start date (ISO 8601). Default: first day of current month. */
  periodStart?: string;

  /** Budget period end date (ISO 8601). Default: last day of current month. */
  periodEnd?: string;

  /** Threshold (0-1) at which to trigger 'warning'. Default: 0.8. */
  warningThreshold?: number;

  /** Threshold (0-1) at which to trigger 'critical'. Default: 1.0. */
  criticalThreshold?: number;

  /** Override the current date for budget calculations (ISO 8601 YYYY-MM-DD). */
  referenceDate?: string;
}

export interface BudgetAlert {
  /** Alert status. */
  status: 'on_track' | 'warning' | 'critical';

  /** Budget amount in USD. */
  budgetAmount: number;

  /** Total spend already incurred in the budget period. */
  actualSpend: number;

  /** Forecasted spend for the remaining days in the budget period. */
  forecastedRemainingSpend: number;

  /** Projected total: actualSpend + forecastedRemainingSpend. */
  projectedTotal: number;

  /** Projected amount over (positive) or under (negative) budget. */
  projectedVariance: number;

  /** Ratio of projected total to budget. */
  projectedBudgetRatio: number;

  /** Date on which budget is projected to be exhausted. */
  exhaustionDate?: string;

  /** Number of days remaining in the budget period. */
  daysRemaining: number;

  /** Daily burn rate: actualSpend / daysElapsed. */
  dailyBurnRate: number;

  /** Required daily burn rate to stay within budget. */
  requiredDailyRate: number;

  /** The underlying forecast result. */
  forecast: ForecastResult;

  /** Confidence level used for the projection. */
  confidenceLevel: number;
}

// ── Forecaster Factory ──────────────────────────────────────────────

export interface ForecasterConfig extends ForecastOptions {
  /** Budget configuration for alertOnBudget. */
  budget?: BudgetConfig;
}

export interface Forecaster {
  /** Load a complete history, replacing any previously loaded data. */
  load(history: HistoryInput): void;

  /** Append one or more records to the loaded history. */
  append(records: UsageRecord | UsageRecord[]): void;

  /** Run the forecast with the pre-configured options. */
  forecast(overrides?: Partial<ForecastOptions>): ForecastResult;

  /** Run trend detection on the loaded history. */
  detectTrend(overrides?: Partial<TrendOptions>): TrendResult;

  /** Run budget alert evaluation. Requires budget in config. */
  checkBudget(overrides?: Partial<BudgetConfig>): BudgetAlert;

  /** Return the currently loaded history as a normalized UsageRecord array. */
  getHistory(): UsageRecord[];

  /** Clear all loaded data. */
  reset(): void;
}

// ── Chart Types ─────────────────────────────────────────────────────

export interface ChartPoint {
  /** ISO 8601 date string. */
  date: string;

  /** Actual cost from history. Null for forecasted periods. */
  actual: number | null;

  /** Predicted cost from forecast. Null for historical periods. */
  predicted: number | null;

  /** Upper confidence bound. Null for historical periods. */
  upperBound: number | null;

  /** Lower confidence bound. Null for historical periods. */
  lowerBound: number | null;
}

export interface ChartDataOptions {
  /** Which confidence level to use for the bounds. Default: highest in result. */
  confidenceLevel?: number;

  /** Include historical data in the output. Default: true. */
  includeHistory?: boolean;
}
