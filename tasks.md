# ai-spend-forecast -- Implementation Tasks

---

## Phase 1: Project Scaffolding & Foundation

- [x] **Install dev dependencies** — Add `typescript`, `vitest`, `eslint`, and `@types/node` as dev dependencies in `package.json`. Verify `npm install` succeeds and lockfile is generated. | Status: done
- [ ] **Configure optional peer dependency** — Add `model-price-registry` as an optional peer dependency (`>=0.1.0`) in `package.json` with `peerDependenciesMeta` marking it optional. Add it as a dev dependency for integration tests. | Status: not_done
- [ ] **Add CLI bin entry to package.json** — Add `"bin": { "ai-spend-forecast": "dist/cli/index.js" }` to `package.json` so the CLI is available after global install. | Status: not_done
- [x] **Set up ESLint configuration** — Create `.eslintrc` or `eslint.config.*` with TypeScript support. Ensure `npm run lint` works against `src/`. | Status: done
- [x] **Verify build pipeline** — Run `npm run build` and confirm `tsc` compiles successfully with the existing `tsconfig.json`. Confirm output lands in `dist/`. | Status: done
- [ ] **Create file structure skeleton** — Create all source files listed in the spec's file structure (Section 18) as empty or stub files so the project shape is established before implementation begins. This includes `src/types.ts`, `src/normalize.ts`, `src/forecast.ts`, `src/trend.ts`, `src/budget.ts`, `src/forecaster.ts`, `src/group.ts`, `src/chart.ts`, `src/errors.ts`, `src/methods/*.ts`, `src/stats/*.ts`, `src/cli/**/*.ts`. | Status: not_done

---

## Phase 2: Types & Error Handling

- [ ] **Define all TypeScript interfaces in `src/types.ts`** — Implement every interface and type alias from the spec: `UsageRecord`, `SimpleCostHistory`, `ObjectCostHistory`, `DateCostMap`, `HistoryInput`, `ForecastOptions`, `TrendOptions`, `ForecastResult`, `ForecastPoint`, `ConfidenceBound`, `ForecastSummary`, `RegressionFit`, `TrendResult`, `BudgetConfig`, `BudgetAlert`, `ForecasterConfig`, `Forecaster`, `ForecastByGroupOptions`, `ChartPoint`, `ChartDataOptions`. Ensure all JSDoc comments match the spec. | Status: not_done
- [ ] **Implement `ForecastError` class in `src/errors.ts`** — Create the `ForecastError` class extending `Error` with a `readonly code: ForecastErrorCode` property. Define the `ForecastErrorCode` union type: `'INSUFFICIENT_DATA'`, `'INVALID_HISTORY'`, `'INVALID_OPTIONS'`, `'INVALID_BUDGET'`, `'MISSING_COST'`, `'RESOLVER_UNAVAILABLE'`, `'COMPUTATION_ERROR'`. | Status: not_done

---

## Phase 3: Statistical Utilities

- [x] **Implement descriptive statistics in `src/stats/descriptive.ts`** — Functions for `mean`, `variance`, `standardDeviation`, `covariance`, `sum`, and `weightedMean`. These are the building blocks for all forecasting methods. All must handle edge cases (empty arrays, single element). | Status: done
- [x] **Implement t-distribution lookup in `src/stats/t-distribution.ts`** — Create a lookup table of critical t-values for common degrees of freedom (1-120 and infinity) at common significance levels (0.20, 0.10, 0.05, 0.025, 0.01, 0.005). Implement a function `tCritical(degreesOfFreedom: number, confidenceLevel: number): number` that interpolates for degrees of freedom not in the table. This is needed for OLS/WLS prediction intervals. | Status: done
- [x] **Implement confidence interval computation in `src/stats/confidence.ts`** — Functions for computing prediction intervals: `zScore(confidenceLevel: number): number` for moving average methods (z-scores: 1.28 for 80%, 1.96 for 95%), and `regressionPredictionInterval(...)` for regression methods using SER and t-distribution critical values that widen with forecast distance. | Status: done

---

## Phase 4: Input Normalization

- [x] **Implement `normalizeHistory` in `src/normalize.ts`** — Accept `HistoryInput` (union of `SimpleCostHistory`, `ObjectCostHistory`, `DateCostMap`) and return `UsageRecord[]`. Handle each input shape: convert `[string, number]` tuples to `UsageRecord` objects; pass through `UsageRecord[]` as-is; convert `Record<string, number>` by iterating keys sorted chronologically. | Status: done
- [x] **Implement input validation in `normalizeHistory`** — After normalization, validate: (1) all records have either `cost` or `tokenUsage`, throw `MISSING_COST` otherwise; (2) records are sorted by date ascending, throw `INVALID_HISTORY` if not; (3) auto-detect granularity (daily vs hourly) from date format (`YYYY-MM-DD` vs ISO datetime with hours). | Status: done
- [ ] **Implement cost resolution support** — When `resolveCosts: true` is passed, attempt to `require('model-price-registry')` dynamically. If not installed, throw `RESOLVER_UNAVAILABLE` with the message `"resolveCosts requires model-price-registry to be installed: npm install model-price-registry"`. If installed, compute cost from `tokenUsage` for records missing `cost`. Also support the `costResolver` callback option for custom cost resolution. | Status: not_done
- [ ] **Handle date gap detection** — Validate that the normalized history has no gaps (every consecutive day/hour is represented). If gaps are detected, include this information in the `INVALID_HISTORY` error message. | Status: not_done

---

## Phase 5: Forecasting Methods

### Simple Moving Average (SMA)

- [x] **Implement SMA computation in `src/methods/sma.ts`** — Compute the arithmetic mean of the last `window` data points. Return a flat-line forecast where every horizon step has the same predicted value (the SMA value). Default window: 7. | Status: done
- [x] **Implement SMA confidence intervals** — Compute standard deviation of values within the window. Upper/lower bounds: `SMA +/- z * stddev` where z is the z-score for the desired confidence level (1.28 for 80%, 1.96 for 95%). Interval width is constant across all horizon steps. | Status: done
- [x] **Validate SMA minimum data requirement** — Throw `INSUFFICIENT_DATA` if `history.length < window + 1`. Error message: `"History has {n} records but method 'sma' with window {w} requires at least {w+1}"`. | Status: done

### Exponential Moving Average (EMA)

- [x] **Implement EMA computation in `src/methods/ema.ts`** — Compute EMA using the recurrence `EMA(t) = alpha * cost[t] + (1 - alpha) * EMA(t-1)`. Initialize `EMA(0)` as the SMA of the first `window` values. Default `alpha = 2 / (window + 1)`. Forecast is a flat line at the final EMA value. | Status: done
- [x] **Implement EMA confidence intervals** — Compute standard deviation of EMA residuals (difference between actual values and EMA-predicted values) over the full history. Bounds: `EMA_final +/- z * stddev_residuals`. | Status: done
- [ ] **Validate EMA alpha parameter** — Throw `INVALID_OPTIONS` if `alpha <= 0` or `alpha > 1` with message `"EMA alpha must be between 0 (exclusive) and 1 (inclusive), got {alpha}"`. | Status: not_done
- [x] **Validate EMA minimum data requirement** — Same as SMA: throw `INSUFFICIENT_DATA` if `history.length < window + 1`. | Status: done

### Weighted Moving Average (WMA)

- [x] **Implement WMA computation in `src/methods/wma.ts`** — Assign linearly increasing weights `[1, 2, 3, ..., n]` to the last `window` data points. Compute `WMA = sum(weight[i] * cost[i]) / sum(weights)`. Support custom `weights` array (must match `window` length). | Status: done
- [x] **Implement day-of-week weighting for WMA** — When `dayOfWeekWeights` is provided (map from day 0-6 to multiplier), apply the multiplier to each forecasted day based on its day of the week. This allows weekend-aware forecasting (e.g., Saturday/Sunday at 0.3x). | Status: done
- [x] **Implement WMA confidence intervals** — Same approach as SMA: standard deviation of residuals within the window, scaled by z-score. | Status: done
- [ ] **Validate WMA inputs** — Throw `INVALID_OPTIONS` if custom `weights` array length does not match `window`. Throw `INSUFFICIENT_DATA` if `history.length < window + 1`. | Status: not_done

### Ordinary Least Squares (OLS) Linear Regression

- [x] **Implement OLS regression in `src/methods/ols.ts`** — Fit `y = a + b*x` where x is the time index (0, 1, ..., n-1) and y is cost. Compute slope `b` and intercept `a` using the standard formulas. Forecast by extrapolating: `forecast(t) = a + b * t` for t beyond the historical range. | Status: done
- [x] **Implement OLS prediction intervals** — Compute Standard Error of Regression (SER): `sqrt(sum(residuals^2) / (n-2))`. Compute per-step forecast SE: `SER * sqrt(1 + 1/n + (t - mean(x))^2 / sum((x - mean(x))^2))`. Interval: `forecast(t) +/- t_critical * SE_forecast(t)` using t-distribution with n-2 degrees of freedom. Intervals must widen as forecast extends further. | Status: done
- [x] **Compute and return `RegressionFit` statistics** — Return `intercept`, `slope`, `rSquared`, `standardError`, `slopeStandardError`, `dataPoints`, `degreesOfFreedom` in the `ForecastResult.fit` field for regression methods. | Status: done
- [x] **Support optional window for OLS** — If `window` is provided, only use the last `window` data points for the regression fit. If omitted, use all data. | Status: done
- [x] **Validate OLS minimum data requirement** — Throw `INSUFFICIENT_DATA` if `history.length < 3` (or `< 3` within the window) with message `"History has {n} records but regression requires at least 3"`. | Status: done

### Weighted Least Squares (WLS) Linear Regression

- [x] **Implement WLS regression in `src/methods/wls.ts`** — Same linear model as OLS but with weighted normal equations: `b = (sum(w*x*y) - sum(w*x)*sum(w*y)/sum(w)) / (sum(w*x^2) - sum(w*x)^2/sum(w))` and `a = (sum(w*y) - b*sum(w*x)) / sum(w)`. | Status: done
- [x] **Implement automatic exponential decay weights for WLS** — When `weights` is not provided, generate weights as `w[i] = decay^(n-1-i)` where `decay` defaults to 0.95. Most recent data point gets weight 1.0, oldest gets `decay^(n-1)`. | Status: done
- [x] **Implement WLS prediction intervals** — Same formula as OLS but using weighted residuals and weighted sums of squares. Adjust effective degrees of freedom for the weight distribution. | Status: done
- [x] **Support custom weights for WLS** — Accept a `weights` array. If provided, must have length equal to the number of data points used in the fit. | Status: done
- [ ] **Validate WLS inputs** — Same minimum data requirements as OLS. Validate `decay` is between 0 (exclusive) and 1 (exclusive). Validate custom `weights` length matches data length. | Status: not_done

---

## Phase 6: Core API Functions

### forecast()

- [x] **Implement `forecast()` in `src/forecast.ts`** — Main entry point. Accept `HistoryInput` and `ForecastOptions`. Normalize the input via `normalizeHistory`, validate options, dispatch to the appropriate method (SMA/EMA/WMA/OLS/WLS), and assemble the `ForecastResult`. Default method: `'ema'`, default horizon: 14, default window: 7, default confidence levels: `[0.80, 0.95]`. | Status: done
- [x] **Compute `ForecastSummary`** — After generating predictions, compute summary statistics: `totalPredicted` (sum), `averagePredicted` (mean), `minPredicted`, `maxPredicted`, `totalUpperBound` (sum of upper bounds at highest confidence level), `totalLowerBound` (sum of lower bounds at highest confidence level). | Status: done
- [x] **Generate forecast dates** — For each horizon step, compute the next date after the last historical date. For daily data, increment by 1 day. For hourly data, increment by 1 hour. Dates should be ISO 8601 formatted strings. | Status: done
- [x] **Apply floor to predictions** — Ensure no predicted value or lower bound goes below the `floor` (default: 0). Clamp to floor if the model predicts a negative cost. | Status: done
- [ ] **Validate `ForecastOptions`** — Throw `INVALID_OPTIONS` for: `horizon <= 0`, invalid `method` string, `window <= 0`, confidence levels outside (0, 1), `alpha` outside (0, 1]. | Status: not_done

### detectTrend()

- [x] **Implement `detectTrend()` in `src/trend.ts`** — Fit OLS regression to the history (or last `window` points if specified). Compute slope, SE of slope, t-statistic, p-value, and R-squared. Classify direction: if `|t| > t_critical` and `b > 0` then `'increasing'`; if `b < 0` then `'decreasing'`; otherwise `'stable'`. | Status: done
- [x] **Compute all `TrendResult` fields** — `direction`, `slopePerPeriod` (raw slope), `slopePercentPerPeriod` (slope as percentage of mean cost), `projected30PeriodChange` (slope * 30), `significant` (boolean), `pValue`, `rSquared`, `dataPoints`. | Status: done
- [ ] **Validate trend options** — Validate `significanceLevel` is between 0 and 1. Validate minimum data (at least 3 records). Apply `window` if provided. | Status: not_done

### alertOnBudget()

- [x] **Implement `alertOnBudget()` in `src/budget.ts`** — Accept history, `BudgetConfig`, and optional `ForecastOptions`. Compute `actualSpend` by summing costs of records within `[periodStart, periodEnd]`. Compute `daysElapsed` and `daysRemaining`. Run `forecast()` for the remaining days. Compute `projectedTotal = actualSpend + forecastedRemainingSpend`. | Status: done
- [x] **Implement budget period defaults** — If `periodStart` is omitted, default to the first day of the current calendar month. If `periodEnd` is omitted, default to the last day of the current calendar month. | Status: done
- [x] **Implement alert status classification** — Compare `projectedTotal` against thresholds: if `projectedTotal >= budget * criticalThreshold` then `'critical'`; else if `projectedTotal >= budget * warningThreshold` then `'warning'`; else `'on_track'`. Defaults: `warningThreshold = 0.8`, `criticalThreshold = 1.0`. | Status: done
- [x] **Compute budget exhaustion date** — Iterate through daily forecasts, accumulating `actualSpend + cumulative forecast`. The exhaustion date is the first day where the cumulative total exceeds `budget.amount`. Return `undefined` if projected spend stays under budget. | Status: done
- [x] **Compute burn rate fields** — `dailyBurnRate = actualSpend / daysElapsed`. `requiredDailyRate = (budgetAmount - actualSpend) / daysRemaining`. Handle edge case where `daysRemaining` or `daysElapsed` is 0. | Status: done
- [ ] **Validate `BudgetConfig`** — Throw `INVALID_BUDGET` if `periodEnd < periodStart`. Validate `amount > 0`. Validate thresholds are between 0 and 1 (or reasonable positive values). | Status: not_done

### createForecaster()

- [x] **Implement `createForecaster()` in `src/forecaster.ts`** — Factory function returning a `Forecaster` object. Store config and internal state (history array). Implement all methods: `load()`, `append()`, `forecast()`, `detectTrend()`, `checkBudget()`, `getHistory()`, `reset()`. | Status: done
- [x] **Implement `load()` method** — Accept `HistoryInput`, normalize it, and replace the internal history state. | Status: done
- [x] **Implement `append()` method** — Accept a single `UsageRecord` or array of records. Append to the internal history. Validate that appended records have dates after the last existing record. | Status: done
- [x] **Implement `forecast()` method** — Call the top-level `forecast()` with the internal history and the pre-configured options merged with any runtime overrides. | Status: done
- [x] **Implement `detectTrend()` method** — Call the top-level `detectTrend()` with the internal history and any overrides. | Status: done
- [x] **Implement `checkBudget()` method** — Call the top-level `alertOnBudget()` with the internal history, the pre-configured budget (from `ForecasterConfig.budget`), and any overrides. Throw if no budget was configured and no override is provided. | Status: done
- [x] **Implement `getHistory()` method** — Return a copy of the internal normalized history array. | Status: done
- [x] **Implement `reset()` method** — Clear the internal history state. | Status: done

### forecastByGroup()

- [ ] **Implement `forecastByGroup()` in `src/group.ts`** — Accept `UsageRecord[]` (must be `ObjectCostHistory`, not tuples or map) and `ForecastByGroupOptions`. Group records by the value of `metadata[groupBy]`. For each group, filter the history to that group's records and run `forecast()`. Return `Record<string, ForecastResult>`. | Status: not_done
- [ ] **Handle records without the groupBy key** — Records where `metadata` is undefined or does not contain the `groupBy` key should be placed in a special `'_ungrouped'` bucket or excluded (follow the least-surprise convention). | Status: not_done

### toChartData()

- [x] **Implement `toChartData()` in `src/chart.ts`** — Accept a `ForecastResult` and optional `ChartDataOptions`. Return `ChartPoint[]` combining historical actuals and forecasted values. Historical points have `actual = cost`, `predicted = null`, bounds = null. Forecast points have `actual = null`, `predicted` and bounds populated. | Status: done
- [x] **Implement `ChartDataOptions`** — Support `confidenceLevel` (which level's bounds to use; default: highest in the result) and `includeHistory` (default: true; if false, only return forecast points). | Status: done

---

## Phase 7: Public Exports

- [ ] **Wire up `src/index.ts`** — Re-export all public API functions: `forecast`, `detectTrend`, `alertOnBudget`, `createForecaster`, `forecastByGroup`, `normalizeHistory`, `toChartData`. Re-export all public types: `UsageRecord`, `HistoryInput`, `SimpleCostHistory`, `ObjectCostHistory`, `DateCostMap`, `ForecastOptions`, `TrendOptions`, `ForecastResult`, `ForecastPoint`, `ConfidenceBound`, `ForecastSummary`, `RegressionFit`, `TrendResult`, `BudgetConfig`, `BudgetAlert`, `ForecasterConfig`, `Forecaster`, `ForecastByGroupOptions`, `ChartPoint`, `ChartDataOptions`, `ForecastError`, `ForecastErrorCode`. | Status: not_done

---

## Phase 8: CLI

### CLI Entry Point & Argument Parsing

- [ ] **Implement CLI entry point in `src/cli/index.ts`** — Parse command-line arguments without external dependencies (use `process.argv` directly or a minimal hand-rolled parser). Support subcommands: `forecast`, `trend`, `budget`. Add `#!/usr/bin/env node` shebang. | Status: not_done
- [ ] **Implement environment variable overrides** — Read `AI_FORECAST_METHOD`, `AI_FORECAST_HORIZON`, `AI_FORECAST_WINDOW`, `AI_FORECAST_CONFIDENCE`, `AI_FORECAST_BUDGET` from `process.env`. Apply them as defaults that are overridden by explicit CLI flags. Only the CLI reads env vars; the programmatic API ignores them. | Status: not_done

### CLI Input Parsers

- [ ] **Implement CSV parser in `src/cli/parse/csv.ts`** — Parse CSV files with header row. Auto-detect `date` and `cost` columns. Preserve additional columns as `metadata`. Handle quoted fields and commas in values. Zero external dependencies (no `csv-parse`). | Status: not_done
- [ ] **Implement JSON/JSONL parser in `src/cli/parse/json.ts`** — Parse JSON files containing either `UsageRecord[]` or `[date, cost][]` tuples. Parse JSONL files (one JSON object per line). Auto-detect format. | Status: not_done

### CLI Commands

- [ ] **Implement `forecast` command in `src/cli/commands/forecast.ts`** — Accept `--input`, `--method`, `--horizon`, `--window`, `--confidence`, `--format` flags. Read input file, parse it, run `forecast()`, format output. | Status: not_done
- [ ] **Implement `trend` command in `src/cli/commands/trend.ts`** — Accept `--input`, `--window`, `--format` flags. Read input file, parse it, run `detectTrend()`, format output. Human-readable output should show direction, rate, R-squared, significance as shown in the spec. | Status: not_done
- [ ] **Implement `budget` command in `src/cli/commands/budget.ts`** — Accept `--input`, `--amount`, `--period-start`, `--period-end`, `--method`, `--format` flags. Read input file, parse it, run `alertOnBudget()`, format output. Exit code 1 if status is `warning` or `critical`. | Status: not_done

### CLI Output Formatters

- [ ] **Implement table formatter in `src/cli/format/table.ts`** — Format forecast results as a human-readable table with aligned columns showing date, predicted, lower bound, upper bound. Format budget and trend results similarly. | Status: not_done
- [ ] **Implement JSON formatter in `src/cli/format/json.ts`** — Output the raw `ForecastResult`, `TrendResult`, or `BudgetAlert` as formatted JSON (indented). | Status: not_done
- [ ] **Implement CSV formatter in `src/cli/format/csv.ts`** — Output forecast results as CSV with columns: `date`, `predicted`, `lower`, `upper`. Include header row. | Status: not_done

### CLI Exit Codes

- [ ] **Implement exit code logic** — Exit 0 on success (or `on_track` for budget command). Exit 1 for `warning`/`critical` budget status or runtime errors. Exit 2 for invalid input, missing arguments, or configuration errors. | Status: not_done

---

## Phase 9: Test Fixtures

- [ ] **Create `src/__tests__/fixtures/daily-stable.ts`** — 30 days of stable data fluctuating around ~$100/day with small random noise. Use deterministic values (no `Math.random`). | Status: not_done
- [ ] **Create `src/__tests__/fixtures/daily-trending.ts`** — 90 days of linearly increasing data starting at ~$50/day and growing to ~$200/day. Deterministic. | Status: not_done
- [ ] **Create `src/__tests__/fixtures/daily-seasonal.ts`** — 28 days (4 complete weeks) with weekday costs ~$100 and weekend costs ~$30. Deterministic. | Status: not_done
- [ ] **Create `src/__tests__/fixtures/daily-spike.ts`** — 30 days of stable ~$100/day data with a single 10x outlier ($1000) on one day. Deterministic. | Status: not_done
- [ ] **Create `src/__tests__/fixtures/daily-zero.ts`** — 30 days of zero-cost data. All costs are 0. | Status: not_done
- [ ] **Create `src/__tests__/fixtures/daily-constant.ts`** — 30 days of identical cost values (e.g., exactly $100 every day). | Status: not_done

---

## Phase 10: Unit Tests -- Statistical Utilities

- [x] **Write tests for `src/stats/descriptive.ts`** — Test `mean`, `variance`, `standardDeviation`, `covariance`, `sum`, `weightedMean` with known inputs and hand-computed expected outputs. Test edge cases: empty array, single element, all zeros. | Status: done
- [x] **Write tests for `src/stats/confidence.ts`** — Test `zScore` returns correct values (1.28 for 0.80, 1.96 for 0.95). Test regression prediction interval computation against known values. | Status: done
- [x] **Write tests for `src/stats/t-distribution.ts`** — Verify `tCritical` returns known values for standard degrees of freedom and significance levels. Test interpolation for intermediate df values. | Status: done

---

## Phase 11: Unit Tests -- Forecasting Methods

- [x] **Write SMA unit tests in `src/__tests__/methods/sma.test.ts`** — Test with a known 7-day window and hand-computed averages. Verify the forecast equals the arithmetic mean. Verify confidence bounds match `mean +/- z * stddev`. Test with different window sizes. | Status: done
- [x] **Write EMA unit tests in `src/__tests__/methods/ema.test.ts`** — Test with known sequence and hand-computed EMA values. Verify convergence from SMA seed. Verify different alpha values produce different responsiveness. Test default alpha calculation from window. | Status: done
- [x] **Write WMA unit tests in `src/__tests__/methods/wma.test.ts`** — Test known weights applied to known data. Verify weighted average computation. Test custom weights. Verify `dayOfWeekWeights` multiplier application produces correct weekday/weekend differentiation. | Status: done
- [x] **Write OLS unit tests in `src/__tests__/methods/ols.test.ts`** — Test with known linear data (`y = 2x + 10` with noise). Verify slope and intercept recovery. Test noiseless data produces R-squared = 1.0. Verify prediction intervals widen with increasing horizon. | Status: done
- [x] **Write WLS unit tests in `src/__tests__/methods/wls.test.ts`** — Test with data that has a recent trend change. Verify WLS adapts faster than OLS to the change. Verify custom weights produce expected fit. Test with default decay factor. | Status: done

---

## Phase 12: Unit Tests -- Core Functions

- [x] **Write normalization tests in `src/__tests__/normalize.test.ts`** — Test conversion from `[date, cost]` tuples, from `Record<string, number>` map, and from `UsageRecord[]`. Verify all three produce identical normalized output. Test that unsorted input throws `INVALID_HISTORY`. Test that records missing both `cost` and `tokenUsage` throw `MISSING_COST`. | Status: done
- [x] **Write forecast integration tests in `src/__tests__/forecast.test.ts`** — Test `forecast()` with each method (SMA, EMA, WMA, OLS, WLS) using the stable fixture data. Verify result structure matches `ForecastResult` interface. Verify summary statistics are consistent with predictions. Verify default options are applied correctly. | Status: done
- [x] **Write trend detection tests in `src/__tests__/trend.test.ts`** — Test with trending data: verify `direction = 'increasing'`, `significant = true`, `rSquared > 0.7`. Test with stable data: verify `direction = 'stable'`, `significant = false`. Test with constant data: verify `slopePerPeriod = 0`. | Status: done
- [x] **Write budget alert tests in `src/__tests__/budget.test.ts`** — Provide 20 days of history within a 31-day budget period. Verify alert status transitions as projected spend crosses warning and critical thresholds. Verify exhaustion date computation. Verify default period (current month). Verify burn rate calculations. | Status: done
- [x] **Write forecaster state tests in `src/__tests__/forecaster.test.ts`** — Test `createForecaster` lifecycle: `load()` replaces history, `append()` adds records, `forecast()` returns results, `detectTrend()` works, `checkBudget()` works (with and without pre-configured budget), `getHistory()` returns current data, `reset()` clears state. | Status: done
- [ ] **Write group forecasting tests in `src/__tests__/group.test.ts`** — Provide multi-team tagged data. Verify `forecastByGroup` produces separate `ForecastResult` for each unique team value. Verify each group's forecast uses only that group's records. | Status: not_done
- [x] **Write chart data tests in `src/__tests__/chart.test.ts`** — Verify `toChartData` produces correct `ChartPoint[]` combining history and forecast. Test `confidenceLevel` option selects correct bounds. Test `includeHistory: false` omits historical points. | Status: done

---

## Phase 13: Edge Case Tests

- [ ] **Test minimum data for moving averages** — Provide exactly `window + 1` records. Verify forecast succeeds. Provide `window` records. Verify `INSUFFICIENT_DATA` is thrown. | Status: not_done
- [x] **Test minimum data for regression** — Provide exactly 3 records. Verify OLS/WLS forecast succeeds. Provide 2 records. Verify `INSUFFICIENT_DATA` is thrown. | Status: done
- [ ] **Test constant data** — All cost values identical (e.g., $100). Verify forecast predicts the constant value. Verify confidence interval is zero width (stddev = 0). Verify trend is `stable` with slope = 0. | Status: not_done
- [ ] **Test zero data** — All costs are 0. Verify forecast is 0. Verify no division-by-zero errors in any method or in slopePercentPerPeriod. | Status: not_done
- [ ] **Test single spike** — One outlier in otherwise stable data. Verify SMA is pulled toward the spike. Verify EMA recovers faster than SMA (residual influence decays). Verify WLS downweights the spike as it ages. | Status: not_done
- [ ] **Test monotonically increasing data** — Perfect linear growth (`cost = 10 * dayIndex`). Verify OLS slope matches exactly. Verify R-squared = 1.0. Verify prediction intervals have zero width for in-sample predictions (SER = 0). | Status: not_done
- [ ] **Test weekend dip pattern** — Weekday costs at $100, weekend costs at $30. Verify WMA with `dayOfWeekWeights: { 0: 0.3, 6: 0.3 }` produces accurate weekday/weekend forecasts. | Status: not_done
- [x] **Test floor clamping** — Use data where regression would predict negative values (steeply declining trend). Verify all predictions and lower bounds are clamped to `floor` (default 0). | Status: done

---

## Phase 14: Error Handling Tests

- [x] **Write error tests in `src/__tests__/errors.test.ts`** — Verify each `ForecastErrorCode` is thrown with the correct code and message for the corresponding invalid input: | Status: done
- [x] **Test `INSUFFICIENT_DATA` error** — History too short for configured method/window. Verify error code and message template with actual values. | Status: done
- [x] **Test `INVALID_HISTORY` error** — Unsorted history (dates not ascending). Verify error code and exact message. | Status: done
- [x] **Test `INVALID_OPTIONS` error** — Negative horizon, invalid method, `alpha > 1`, `alpha <= 0`, window <= 0, confidence level outside (0,1). Each should produce `INVALID_OPTIONS` with a descriptive message. | Status: done
- [x] **Test `INVALID_BUDGET` error** — Budget with `periodEnd` before `periodStart`. Verify error code and message with the actual dates. | Status: done
- [x] **Test `MISSING_COST` error** — Record with neither `cost` nor `tokenUsage` and `resolveCosts` not enabled. Verify error code and message including the record's index and date. | Status: done
- [ ] **Test `RESOLVER_UNAVAILABLE` error** — `resolveCosts: true` but `model-price-registry` not installed. Verify error code and the npm install suggestion in the message. | Status: not_done
- [ ] **Test `COMPUTATION_ERROR` handling** — Verify graceful handling of degenerate data that could cause division by zero (e.g., all x values identical in regression). | Status: not_done

---

## Phase 15: Integration Tests

- [ ] **Test cost resolution integration** — Provide token usage data with `resolveCosts: true`. With `model-price-registry` installed as a dev dependency, verify costs are correctly computed from token counts, provider, and model identifiers. | Status: not_done
- [ ] **Test `costResolver` callback** — Provide a custom `costResolver` function. Verify it is called for records without `cost`. Verify the resolved cost is used in the forecast. | Status: not_done
- [ ] **Test end-to-end forecast pipeline** — From raw `[date, cost]` tuples through `forecast()` to `toChartData()`, verify the complete pipeline produces valid chart-ready output. | Status: not_done
- [ ] **Test all input formats produce same results** — Given the same underlying data expressed as tuples, object array, and date-cost map, verify all three produce identical `ForecastResult`. | Status: not_done

---

## Phase 16: CLI Tests

- [ ] **Test CSV input parsing** — Verify the CSV parser correctly reads files with `date,cost` columns, files with additional metadata columns, and files with quoted fields. | Status: not_done
- [ ] **Test JSON input parsing** — Verify the JSON parser handles `UsageRecord[]` arrays and `[date, cost][]` tuple arrays. | Status: not_done
- [ ] **Test JSONL input parsing** — Verify JSONL parsing reads one record per line correctly. | Status: not_done
- [ ] **Test `forecast` CLI command** — Verify table, JSON, and CSV output formats produce expected output for known input data. | Status: not_done
- [ ] **Test `trend` CLI command** — Verify human-readable trend output matches the format shown in the spec (direction, rate, R-squared, significance, 30-day projection). | Status: not_done
- [ ] **Test `budget` CLI command** — Verify budget output matches the spec format. Verify exit code 1 for warning/critical, exit code 0 for on_track. | Status: not_done
- [ ] **Test CLI exit codes** — Verify exit code 0 for success, 1 for budget warning/critical or runtime error, 2 for invalid input or missing arguments. | Status: not_done
- [ ] **Test environment variable overrides in CLI** — Verify `AI_FORECAST_METHOD`, `AI_FORECAST_HORIZON`, `AI_FORECAST_WINDOW`, `AI_FORECAST_CONFIDENCE`, `AI_FORECAST_BUDGET` are read and applied correctly. Verify explicit CLI flags override env vars. | Status: not_done

---

## Phase 17: Performance Validation

- [ ] **Write performance benchmarks** — Create benchmark tests validating the performance targets from Section 16: `forecast` (EMA, 90 days) < 1ms, `forecast` (WLS, 365 days) < 2ms, `detectTrend` (365 days) < 1ms, `alertOnBudget` (90 days) < 1ms, `forecastByGroup` (10 groups, 90 days each) < 5ms, `normalizeHistory` (10,000 records) < 50ms. | Status: not_done

---

## Phase 18: Documentation

- [x] **Create README.md** — Write a comprehensive README covering: package description, installation, quick start example, API reference (all exported functions with signatures and brief descriptions), CLI usage with all commands and flags, configuration defaults table, environment variables, integration examples (model-price-registry, ai-chargeback, ai-circuit-breaker), error codes reference, and license. | Status: done
- [ ] **Add JSDoc comments to all public functions** — Ensure every exported function has JSDoc with `@param`, `@returns`, `@throws`, and `@example` tags. The types file should have JSDoc on every interface and property matching the spec. | Status: not_done

---

## Phase 19: Final Integration & Publishing Prep

- [ ] **Verify `npm run build` succeeds** — Compile the full project with `tsc`. Fix any type errors. Verify `dist/` output includes all `.js`, `.d.ts`, and `.d.ts.map` files. | Status: not_done
- [ ] **Verify `npm run lint` passes** — Run ESLint on all source files. Fix any lint errors. | Status: not_done
- [ ] **Verify `npm run test` passes** — Run `vitest run`. All unit, integration, edge case, and error tests must pass. | Status: not_done
- [ ] **Verify package exports** — Write a smoke test that `require('ai-spend-forecast')` (or import from the dist) exposes all expected functions and types. Verify the `main` and `types` fields in `package.json` point to the correct files. | Status: not_done
- [ ] **Verify CLI executable** — Test that `npx ai-spend-forecast forecast --help` (or equivalent) works after `npm run build`. Ensure the shebang line is present in `dist/cli/index.js`. | Status: not_done
- [ ] **Version bump** — Confirm `package.json` version is `0.1.0` for initial release as specified in the roadmap. | Status: not_done
- [ ] **Dry-run publish** — Run `npm publish --dry-run` to verify the package contents, `files` field, and that only `dist/` is included. | Status: not_done
