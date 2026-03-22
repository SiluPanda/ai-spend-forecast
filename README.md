# ai-spend-forecast

Predict future AI API spending from historical usage data using moving averages, linear regression, and confidence intervals.

[![npm version](https://img.shields.io/npm/v/ai-spend-forecast.svg)](https://www.npmjs.com/package/ai-spend-forecast)
[![license](https://img.shields.io/npm/l/ai-spend-forecast.svg)](https://github.com/SiluPanda/ai-spend-forecast/blob/master/LICENSE)
[![node](https://img.shields.io/node/v/ai-spend-forecast.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)

`ai-spend-forecast` is a zero-dependency TypeScript library that answers the question "what will our AI API spend be next week/month?" with a single function call. It accepts historical cost data from any provider -- OpenAI, Anthropic, Google, Mistral, or any combination -- and returns daily predicted costs with upper and lower confidence bounds, trend direction, and budget alert status. The library supports five forecasting methods (SMA, EMA, WMA, OLS, WLS), configurable confidence intervals, budget exhaustion alerts, and chart-ready output. It runs entirely on local data with no network calls.

## Installation

```bash
npm install ai-spend-forecast
```

## Quick Start

```typescript
import { forecast, detectTrend, alertOnBudget } from 'ai-spend-forecast';

// Historical daily costs as [date, cost] tuples
const history = [
  ['2025-01-01', 45.20],
  ['2025-01-02', 52.10],
  ['2025-01-03', 48.90],
  ['2025-01-04', 61.30],
  ['2025-01-05', 55.00],
  ['2025-01-06', 58.70],
  ['2025-01-07', 63.40],
  ['2025-01-08', 59.80],
  ['2025-01-09', 67.20],
  ['2025-01-10', 72.50],
] as Array<[string, number]>;

// Forecast the next 14 days
const result = forecast(history, { method: 'ema', horizon: 14 });

console.log(result.summary.totalPredicted);   // projected total spend
console.log(result.predictions[0].predicted);  // first day's prediction
console.log(result.predictions[0].bounds);     // confidence intervals

// Detect spending trend
const trend = detectTrend(history);
console.log(trend.direction);    // 'increasing' | 'decreasing' | 'stable'
console.log(trend.significant);  // true if statistically significant

// Check against a budget
const alert = alertOnBudget(history, {
  amount: 2000,
  periodStart: '2025-01-01',
  periodEnd: '2025-01-31',
});
console.log(alert.status);          // 'on_track' | 'warning' | 'critical'
console.log(alert.exhaustionDate);  // date budget is projected to run out
```

## Features

- **Five forecasting methods** -- Simple Moving Average (SMA), Exponential Moving Average (EMA), Weighted Moving Average (WMA), Ordinary Least Squares (OLS), and Weighted Least Squares (WLS) linear regression.
- **Configurable confidence intervals** -- Prediction intervals at any confidence level (default: 80% and 95%). Regression intervals widen with forecast distance; moving average intervals use historical volatility.
- **Trend detection** -- Classify spend trajectory as `increasing`, `decreasing`, or `stable` with statistical significance testing via t-test on the regression slope.
- **Budget alerts** -- Project whether spend will exceed a budget within a period. Returns status (`on_track`, `warning`, `critical`), exhaustion date, burn rates, and projected variance.
- **Stateful forecaster** -- Factory function for repeated forecasting on streaming data with pre-configured defaults.
- **Chart-ready output** -- Convert forecast results to `{ date, actual, predicted, upperBound, lowerBound }` arrays consumable by Chart.js, D3, Recharts, or any charting library.
- **Flexible input formats** -- Accepts `[date, cost]` tuples, `{ date, cost }` object arrays, or `Record<string, number>` date-cost maps.
- **Zero runtime dependencies** -- Pure TypeScript targeting Node.js 18+.

## API Reference

### `forecast(history, options?)`

Primary forecasting function. Accepts historical usage data and returns predicted future spending with confidence intervals.

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `history` | `HistoryInput` | Historical cost data in any supported format. |
| `options` | `ForecastOptions` | Optional configuration (see below). |

**`ForecastOptions`:**

| Option | Type | Default | Description |
|---|---|---|---|
| `method` | `ForecastMethod` | `'ema'` | Forecasting method: `'sma'`, `'ema'`, `'wma'`, `'ols'`, or `'wls'`. |
| `horizon` | `number` | `14` | Number of future periods to forecast. |
| `window` | `number` | `7` (MA) / all (regression) | Number of historical periods to use. |
| `confidenceLevels` | `number[]` | `[0.80, 0.95]` | Confidence levels for prediction intervals. |
| `alpha` | `number` | `2 / (window + 1)` | EMA smoothing factor. Must be in (0, 1]. |
| `weights` | `number[]` | Linear (WMA) / Decay (WLS) | Custom weights for WMA or WLS. |
| `decay` | `number` | `0.95` | Decay factor for automatic WLS weight generation. |
| `dayOfWeekWeights` | `Partial<Record<number, number>>` | -- | Day-of-week multipliers for WMA forecasts. Keys: 0 (Sun) - 6 (Sat). |
| `floor` | `number` | `0` | Minimum predicted cost per period. |

**Returns:** `ForecastResult`

```typescript
interface ForecastResult {
  method: ForecastMethod;
  horizon: number;
  window: number;
  predictions: ForecastPoint[];
  summary: ForecastSummary;
  history: UsageRecord[];
  fit?: RegressionFit;  // Only for OLS/WLS methods
}
```

**Example:**

```typescript
import { forecast } from 'ai-spend-forecast';

const history = [
  { date: '2025-01-01', cost: 100 },
  { date: '2025-01-02', cost: 110 },
  { date: '2025-01-03', cost: 105 },
  { date: '2025-01-04', cost: 120 },
  { date: '2025-01-05', cost: 115 },
  { date: '2025-01-06', cost: 125 },
  { date: '2025-01-07', cost: 130 },
  { date: '2025-01-08', cost: 128 },
  { date: '2025-01-09', cost: 135 },
  { date: '2025-01-10', cost: 140 },
];

const result = forecast(history, {
  method: 'ols',
  horizon: 7,
  confidenceLevels: [0.80, 0.95],
});

for (const point of result.predictions) {
  const b95 = point.bounds.find(b => b.level === 0.95)!;
  console.log(`${point.date}: $${point.predicted.toFixed(2)} [${b95.lower.toFixed(2)} - ${b95.upper.toFixed(2)}]`);
}

// Regression fit statistics (OLS/WLS only)
console.log(`R-squared: ${result.fit!.rSquared.toFixed(4)}`);
console.log(`Slope: $${result.fit!.slope.toFixed(2)}/day`);
```

---

### `detectTrend(history, options?)`

Fit OLS regression to historical data and evaluate whether the spend trend is statistically significant.

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `history` | `HistoryInput` | Historical cost data. |
| `options` | `TrendOptions` | Optional configuration (see below). |

**`TrendOptions`:**

| Option | Type | Default | Description |
|---|---|---|---|
| `window` | `number` | All data | Number of recent periods to include in the analysis. |
| `significanceLevel` | `number` | `0.05` | Significance level for the t-test. |

**Returns:** `TrendResult`

```typescript
interface TrendResult {
  direction: 'increasing' | 'decreasing' | 'stable';
  slopePerPeriod: number;
  slopePercentPerPeriod: number;
  projected30PeriodChange: number;
  significant: boolean;
  pValue: number;
  rSquared: number;
  dataPoints: number;
}
```

**Example:**

```typescript
import { detectTrend } from 'ai-spend-forecast';

const history: Record<string, number> = {
  '2025-01-01': 80,
  '2025-01-02': 85,
  '2025-01-03': 92,
  '2025-01-04': 88,
  '2025-01-05': 95,
  '2025-01-06': 100,
  '2025-01-07': 105,
};

const trend = detectTrend(history);

console.log(`Direction: ${trend.direction}`);
console.log(`Rate: $${trend.slopePerPeriod.toFixed(2)}/day (${trend.slopePercentPerPeriod.toFixed(1)}%)`);
console.log(`Significant: ${trend.significant} (p=${trend.pValue.toFixed(4)})`);
console.log(`30-day projection: $${trend.projected30PeriodChange.toFixed(2)} change`);
```

---

### `alertOnBudget(history, budget, options?)`

Evaluate whether projected spend will exceed a budget within a given period.

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `history` | `HistoryInput` | Historical cost data. |
| `budget` | `BudgetConfig` | Budget configuration (see below). |
| `options` | `ForecastOptions` | Optional forecast configuration. |

**`BudgetConfig`:**

| Option | Type | Default | Description |
|---|---|---|---|
| `amount` | `number` | *required* | Budget amount in USD. |
| `periodStart` | `string` | First of current month | Budget period start date (ISO 8601). |
| `periodEnd` | `string` | Last of current month | Budget period end date (ISO 8601). |
| `warningThreshold` | `number` | `0.8` | Ratio (0-1) at which status becomes `'warning'`. |
| `criticalThreshold` | `number` | `1.0` | Ratio (0-1) at which status becomes `'critical'`. |

**Returns:** `BudgetAlert`

```typescript
interface BudgetAlert {
  status: 'on_track' | 'warning' | 'critical';
  budgetAmount: number;
  actualSpend: number;
  forecastedRemainingSpend: number;
  projectedTotal: number;
  projectedVariance: number;
  projectedBudgetRatio: number;
  exhaustionDate?: string;
  daysRemaining: number;
  dailyBurnRate: number;
  requiredDailyRate: number;
  forecast: ForecastResult;
  confidenceLevel: number;
}
```

**Example:**

```typescript
import { alertOnBudget } from 'ai-spend-forecast';

const history = Array.from({ length: 20 }, (_, i) => ({
  date: `2025-03-${String(i + 1).padStart(2, '0')}`,
  cost: 150 + Math.random() * 20,
}));

const alert = alertOnBudget(history, {
  amount: 5000,
  periodStart: '2025-03-01',
  periodEnd: '2025-03-31',
  warningThreshold: 0.8,
  criticalThreshold: 1.0,
});

console.log(`Status: ${alert.status}`);
console.log(`Actual spend: $${alert.actualSpend.toFixed(2)}`);
console.log(`Projected total: $${alert.projectedTotal.toFixed(2)}`);
console.log(`Daily burn rate: $${alert.dailyBurnRate.toFixed(2)}`);
console.log(`Required daily rate to stay on budget: $${alert.requiredDailyRate.toFixed(2)}`);

if (alert.exhaustionDate) {
  console.log(`Budget exhausted by: ${alert.exhaustionDate}`);
}
```

---

### `createForecaster(config)`

Factory function that returns a stateful forecaster instance with pre-configured settings. Suitable for long-running services that repeatedly forecast on streaming data.

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `config` | `ForecasterConfig` | Configuration extending `ForecastOptions` with an optional `budget` field. |

**Returns:** `Forecaster`

```typescript
interface Forecaster {
  load(history: HistoryInput): void;
  append(records: UsageRecord | UsageRecord[]): void;
  forecast(overrides?: Partial<ForecastOptions>): ForecastResult;
  detectTrend(overrides?: Partial<TrendOptions>): TrendResult;
  checkBudget(overrides?: Partial<BudgetConfig>): BudgetAlert;
  getHistory(): UsageRecord[];
  reset(): void;
}
```

**Example:**

```typescript
import { createForecaster } from 'ai-spend-forecast';

const forecaster = createForecaster({
  method: 'ema',
  horizon: 14,
  window: 7,
  budget: { amount: 5000, periodStart: '2025-03-01', periodEnd: '2025-03-31' },
});

// Load initial history
forecaster.load([
  ['2025-03-01', 120],
  ['2025-03-02', 135],
  ['2025-03-03', 128],
  ['2025-03-04', 142],
  ['2025-03-05', 138],
  ['2025-03-06', 155],
  ['2025-03-07', 148],
]);

// Get forecast
const result = forecaster.forecast();
console.log(result.summary.totalPredicted);

// Append new data as it arrives
forecaster.append({ date: '2025-03-08', cost: 160 });

// Re-forecast with updated data
const updated = forecaster.forecast();

// Check budget
const alert = forecaster.checkBudget();
console.log(alert.status);

// Detect trend
const trend = forecaster.detectTrend();
console.log(trend.direction);

// Access loaded history
console.log(forecaster.getHistory().length);

// Reset state
forecaster.reset();
```

---

### `normalizeHistory(input)`

Normalize any supported input format into a validated `UsageRecord[]` array. This function is used internally by all top-level functions but is also exported for direct use.

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `input` | `HistoryInput` | Cost data as tuples, object array, or date-cost map. |

**Returns:** `UsageRecord[]`

**Accepted input formats:**

```typescript
// 1. SimpleCostHistory: [date, cost] tuples
const tuples: Array<[string, number]> = [
  ['2025-01-01', 100],
  ['2025-01-02', 110],
];

// 2. ObjectCostHistory: UsageRecord objects
const objects = [
  { date: '2025-01-01', cost: 100 },
  { date: '2025-01-02', cost: 110, metadata: { team: 'platform' } },
];

// 3. DateCostMap: Record<string, number>
const map = {
  '2025-01-01': 100,
  '2025-01-02': 110,
};
```

All three formats produce identical normalized output when given the same underlying data.

---

### `toChartData(result, options?)`

Convert a `ForecastResult` into chart-ready data points that combine historical actuals and forecasted values.

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `result` | `ForecastResult` | A result returned by `forecast()`. |
| `options` | `ChartDataOptions` | Optional configuration (see below). |

**`ChartDataOptions`:**

| Option | Type | Default | Description |
|---|---|---|---|
| `confidenceLevel` | `number` | Highest in result | Which confidence level's bounds to use. |
| `includeHistory` | `boolean` | `true` | Whether to include historical data points. |

**Returns:** `ChartPoint[]`

```typescript
interface ChartPoint {
  date: string;
  actual: number | null;       // Non-null for historical periods
  predicted: number | null;    // Non-null for forecasted periods
  upperBound: number | null;   // Non-null for forecasted periods
  lowerBound: number | null;   // Non-null for forecasted periods
}
```

**Example:**

```typescript
import { forecast, toChartData } from 'ai-spend-forecast';

const result = forecast(history, { method: 'ols', horizon: 7 });
const chartPoints = toChartData(result, { confidenceLevel: 0.95 });

// Use with any charting library
// Historical points: { date, actual: 120, predicted: null, upperBound: null, lowerBound: null }
// Forecast points:  { date, actual: null, predicted: 135, upperBound: 160, lowerBound: 110 }

// Exclude history for forecast-only charts
const forecastOnly = toChartData(result, { includeHistory: false });
```

## Configuration

### Default Values

| Setting | Default | Description |
|---|---|---|
| Method | `'ema'` | Exponential Moving Average |
| Horizon | `14` | 14 periods ahead |
| Window | `7` (MA methods) | Last 7 periods for moving averages; all data for regression |
| Confidence levels | `[0.80, 0.95]` | 80% and 95% prediction intervals |
| Alpha (EMA) | `2 / (window + 1)` | Standard EMA smoothing factor |
| Decay (WLS) | `0.95` | Exponential decay for automatic WLS weights |
| Floor | `0` | No negative predictions |
| Warning threshold | `0.8` | Budget alert at 80% projected spend |
| Critical threshold | `1.0` | Budget alert at 100% projected spend |
| Significance level | `0.05` | 5% significance for trend detection |

### Forecasting Methods

| Method | Key | Best For |
|---|---|---|
| Simple Moving Average | `'sma'` | Stable, low-variance spend. Produces a flat-line forecast at the arithmetic mean of the window. |
| Exponential Moving Average | `'ema'` | General purpose. Responds to recent changes via exponential smoothing. Default method. |
| Weighted Moving Average | `'wma'` | Seasonal patterns. Supports day-of-week multipliers and custom weight arrays. |
| Ordinary Least Squares | `'ols'` | Growth/decline trends. Fits a linear model and extrapolates. Returns R-squared, slope, and standard error. |
| Weighted Least Squares | `'wls'` | Trend shifts. Like OLS but weights recent data more heavily via exponential decay. |

### Minimum Data Requirements

| Method | Minimum Records |
|---|---|
| SMA | `window` (default: 7) |
| EMA | `window` (default: 7) |
| WMA | `window` (default: 7) |
| OLS | 3 |
| WLS | 3 |

## Error Handling

All errors thrown by the library are instances of `ForecastError`, which extends `Error` with a `code` property for programmatic error handling.

```typescript
import { forecast, ForecastError } from 'ai-spend-forecast';

try {
  const result = forecast(history, { method: 'sma', window: 30 });
} catch (err) {
  if (err instanceof ForecastError) {
    switch (err.code) {
      case 'INSUFFICIENT_DATA':
        console.log('Not enough data points for the configured method/window');
        break;
      case 'INVALID_HISTORY':
        console.log('History is empty, unsorted, or malformed');
        break;
      case 'INVALID_OPTIONS':
        console.log('Invalid forecast options (horizon, confidence, alpha, etc.)');
        break;
      case 'INVALID_BUDGET':
        console.log('Invalid budget configuration');
        break;
      case 'MISSING_COST':
        console.log('A record has neither cost nor tokenUsage');
        break;
      case 'COMPUTATION_ERROR':
        console.log('Numerical computation failed (e.g., degenerate data)');
        break;
    }
  }
}
```

### Error Codes

| Code | Thrown When |
|---|---|
| `INSUFFICIENT_DATA` | History has fewer records than the method requires (e.g., fewer than `window` for MA, fewer than 3 for regression). |
| `INVALID_HISTORY` | History is empty, not sorted chronologically, or in an unsupported format. |
| `INVALID_OPTIONS` | Horizon is less than 1, confidence level is outside (0, 1), alpha is outside (0, 1], or method is unrecognized. |
| `INVALID_BUDGET` | Budget amount is zero or negative, or `periodEnd` precedes `periodStart`. |
| `MISSING_COST` | A `UsageRecord` has neither `cost` nor `tokenUsage` defined. |
| `COMPUTATION_ERROR` | A numerical error occurred during computation (e.g., division by zero from degenerate data). |

## Advanced Usage

### Day-of-Week Weighted Forecasting

Use WMA with day-of-week multipliers to model weekend/weekday patterns in AI spend:

```typescript
import { forecast } from 'ai-spend-forecast';

const result = forecast(history, {
  method: 'wma',
  horizon: 14,
  dayOfWeekWeights: {
    0: 0.3,  // Sunday: 30% of baseline
    6: 0.3,  // Saturday: 30% of baseline
    // Weekdays default to 1.0 (no adjustment)
  },
});
```

### Comparing Forecasting Methods

Run multiple methods on the same data to compare projections:

```typescript
import { forecast } from 'ai-spend-forecast';

const methods = ['sma', 'ema', 'wma', 'ols', 'wls'] as const;

for (const method of methods) {
  const result = forecast(history, { method, horizon: 14 });
  console.log(`${method}: $${result.summary.totalPredicted.toFixed(2)} total (${result.summary.averagePredicted.toFixed(2)}/day)`);
}
```

### Custom WLS Decay for Trend Shifts

When spending patterns change recently, lower the WLS decay factor to weight recent data more heavily:

```typescript
import { forecast } from 'ai-spend-forecast';

// Aggressive decay: recent data dominates
const aggressive = forecast(history, { method: 'wls', decay: 0.5, horizon: 14 });

// Conservative decay: more historical data influence
const conservative = forecast(history, { method: 'wls', decay: 0.99, horizon: 14 });
```

### Budget Monitoring in a Cron Job

```typescript
import { alertOnBudget } from 'ai-spend-forecast';

// Run daily via cron
const alert = alertOnBudget(history, {
  amount: 10000,
  periodStart: '2025-03-01',
  periodEnd: '2025-03-31',
});

if (alert.status === 'critical') {
  // Send alert to Slack/PagerDuty
  console.error(`CRITICAL: Projected spend $${alert.projectedTotal.toFixed(2)} exceeds budget $${alert.budgetAmount}`);
  process.exit(1);
} else if (alert.status === 'warning') {
  console.warn(`WARNING: Projected spend at ${(alert.projectedBudgetRatio * 100).toFixed(0)}% of budget`);
}
```

### Stateful Forecasting for Streaming Data

```typescript
import { createForecaster } from 'ai-spend-forecast';

const forecaster = createForecaster({
  method: 'ema',
  horizon: 7,
  budget: { amount: 5000 },
});

// In your data pipeline:
forecaster.load(initialHistory);

// As new data arrives:
forecaster.append({ date: '2025-03-15', cost: 175 });

// Forecast at any time:
const result = forecaster.forecast();
const budgetStatus = forecaster.checkBudget();
```

### Using UsageRecord Metadata

Records can carry arbitrary metadata for filtering or grouping:

```typescript
import { forecast } from 'ai-spend-forecast';

const history = [
  { date: '2025-01-01', cost: 80, metadata: { team: 'platform', provider: 'openai' } },
  { date: '2025-01-02', cost: 95, metadata: { team: 'platform', provider: 'openai' } },
  { date: '2025-01-03', cost: 88, metadata: { team: 'platform', provider: 'anthropic' } },
  // ...
];

// Filter by team before forecasting
const platformHistory = history.filter(r => r.metadata?.team === 'platform');
const result = forecast(platformHistory, { horizon: 14 });
```

## TypeScript

The package is written in TypeScript and ships with full type declarations. All types are exported from the main entry point:

```typescript
import type {
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
  ForecastErrorCode,
} from 'ai-spend-forecast';
```

### Key Type Definitions

**`UsageRecord`** -- A single time period's usage data:

```typescript
interface UsageRecord {
  date: string;                // ISO 8601 date (YYYY-MM-DD) or datetime
  cost?: number;               // Total cost in USD
  tokenUsage?: {               // Token usage for cost resolution
    provider: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    cachedInputTokens?: number;
  };
  requests?: number;           // Number of API requests
  metadata?: Record<string, string>;  // Arbitrary tags
}
```

**`HistoryInput`** -- Union type accepted by all top-level functions:

```typescript
type HistoryInput = SimpleCostHistory | ObjectCostHistory | DateCostMap;
// SimpleCostHistory = Array<[string, number]>
// ObjectCostHistory = Array<UsageRecord>
// DateCostMap = Record<string, number>
```

**`RegressionFit`** -- Model fit statistics returned by OLS and WLS methods:

```typescript
interface RegressionFit {
  intercept: number;
  slope: number;
  rSquared: number;
  standardError: number;
  slopeStandardError: number;
  dataPoints: number;
  degreesOfFreedom: number;
}
```

## License

MIT
