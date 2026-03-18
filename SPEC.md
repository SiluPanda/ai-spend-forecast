# ai-spend-forecast -- Specification

## 1. Overview

`ai-spend-forecast` is a TypeScript library that predicts future AI API spending from historical usage data using moving averages, linear regression, and confidence intervals. It answers the question "what will our AI API spend be next week/month?" with a single function call -- `forecast(history, { horizon: 14 })` -- returning daily predicted costs with upper and lower confidence bounds, trend direction, and budget alert status. The library operates entirely on local data, requires no network calls, and is designed for FinOps teams, engineering managers, and cost management automation pipelines that need programmatic spend forecasting without vendor lock-in to a specific cloud provider's billing tools.

The gap this package fills is specific and well-defined. Cloud providers offer built-in cost forecasting -- AWS Cost Explorer Forecast, GCP Billing Budget Forecasts, Azure Cost Management -- but these tools are cloud-specific, operate only on their own billing data, and cannot forecast AI API spend that spans multiple providers (OpenAI, Anthropic, Google, Mistral, etc.) or aggregate costs from different billing accounts. An engineering team using Claude for customer-facing features, GPT-4o for internal tools, and Gemini for batch processing has no unified forecasting tool. They export CSV billing data from three dashboards, paste it into a spreadsheet, and eyeball the trend. When spend spikes unexpectedly, the alert comes from a monthly invoice, not a proactive forecast.

Dedicated FinOps platforms (CloudHealth, Finout, Vantage) provide multi-cloud forecasting but are enterprise SaaS products with per-seat pricing, onboarding requirements, and data residency constraints that are overkill for teams that simply need a programmatic answer to "are we on track to exceed our $5,000/month AI budget?" Nothing on npm provides a lightweight, zero-dependency forecasting library purpose-built for AI API spend patterns -- the token-based billing model, the bursty usage patterns of LLM workloads, the weekday/weekend seasonality of developer-driven usage, and the model-mix shifts that occur when teams migrate between providers.

`ai-spend-forecast` provides both a TypeScript/JavaScript API for programmatic use and a CLI for terminal-based forecasting and quick budget checks. The API returns structured `ForecastResult` objects with daily point forecasts, confidence intervals at configurable levels (80%, 95%), trend classification, and budget alert evaluations. The CLI prints human-readable tables or JSON output suitable for piping into dashboards, alerting systems, or Slack webhooks. Both interfaces support multiple forecasting methods (simple moving average, exponential moving average, weighted moving average, linear regression, weighted linear regression), configurable parameters, and optional integration with `model-price-registry` for automatic cost calculation from raw token usage data.

---

## 2. Goals and Non-Goals

### Goals

- Provide a `forecast(history, options?)` function that accepts historical daily or hourly cost data and returns predicted spending for a configurable future horizon, with confidence intervals.
- Implement five forecasting methods suitable for AI API spend patterns: Simple Moving Average (SMA), Exponential Moving Average (EMA), Weighted Moving Average (WMA), Ordinary Least Squares (OLS) linear regression, and Weighted Least Squares (WLS) linear regression.
- Compute prediction intervals at configurable confidence levels (default: 80% and 95%) using standard error of the regression for regression methods and historical volatility for moving average methods.
- Provide a `detectTrend(history)` function that classifies spend trajectory as `increasing`, `decreasing`, or `stable`, with a magnitude measure (percentage change per day) and statistical significance indicator.
- Provide an `alertOnBudget(history, budget)` function that forecasts spend over a budget period and returns whether projected spend will exceed the budget, by how much, and on what date the budget is expected to be exhausted.
- Provide a `createForecaster(config)` factory function that returns a stateful forecaster instance with pre-configured method, parameters, and budget thresholds, suitable for repeated forecasting on streaming data.
- Output visualization-ready data structures (arrays of `{ date, actual, predicted, upperBound, lowerBound }`) that can be directly consumed by charting libraries (Chart.js, D3, Recharts, etc.) without transformation.
- Provide a CLI (`ai-spend-forecast`) for terminal-based forecasting from CSV or JSON input files, with human-readable table and JSON output modes.
- Integrate with `model-price-registry` to automatically convert raw token usage records into cost data when the user provides token counts and model identifiers instead of pre-computed costs.
- Integrate with `ai-chargeback` to forecast spend per cost center (team, project, feature) rather than only aggregate spend.
- Integrate with `ai-circuit-breaker` to feed forecast data into circuit breaker thresholds, enabling preemptive rate limiting when forecasted spend approaches budget limits.
- Zero runtime dependencies. Pure TypeScript with only built-in Node.js modules.
- Target Node.js 18+. Use only ES2022 features available in the target runtime.

### Non-Goals

- **Not a general-purpose time series library.** This package implements the specific forecasting methods needed for AI API spend prediction. It does not provide ARIMA, Prophet, Holt-Winters, Fourier decomposition, or other advanced statistical models. Teams needing those methods should use dedicated libraries (`statsmodels` via Python, `simple-statistics`, or cloud ML forecasting APIs) and integrate the results into their pipeline.
- **Not a data collection agent.** This package does not connect to OpenAI, Anthropic, or Google billing APIs to fetch usage data. It accepts historical data as input. Data collection from provider APIs, billing exports, or proxy logs is out of scope. Use provider SDKs, billing export APIs, or observability tools to collect the data; feed it into `ai-spend-forecast` for prediction.
- **Not a billing system.** This package predicts future spend based on historical patterns. It does not manage budgets, enforce spending limits, process payments, or interface with accounting systems. For budget enforcement, use `ai-circuit-breaker`. For cost attribution, use `ai-chargeback`.
- **Not a real-time streaming processor.** The `createForecaster` factory supports incremental updates (appending new data points and re-forecasting), but the package does not implement stream processing, event-driven architectures, or pub/sub patterns. It is a batch computation library that runs on accumulated historical data.
- **Not a visualization tool.** This package outputs data structures suitable for charting but does not render charts, generate images, or serve a dashboard UI. Plug the output into your preferred charting library.
- **Not a replacement for professional financial forecasting.** AI API spend forecasting involves uncertainty. The confidence intervals provide probabilistic bounds, not guarantees. This package is a developer tool for directional insight and budget alerting, not a financial planning instrument.

---

## 3. Target Users

### FinOps / Cost Management Engineers

Teams responsible for tracking and controlling AI API spend across an organization. They aggregate billing data from multiple providers (OpenAI, Anthropic, Google) into a unified cost dataset and need to forecast total spend for the next billing cycle to set budgets, negotiate enterprise agreements, and flag anomalies before invoices arrive. `ai-spend-forecast` provides the forecasting computation that sits between their data aggregation pipeline and their alerting/dashboard layer.

### Engineering Managers

Managers overseeing teams that consume AI APIs and are accountable for staying within a budget. They need a weekly or daily answer to "are we on track to exceed our budget this month?" without logging into three provider dashboards and doing mental arithmetic. The CLI provides a quick terminal check; the API provides a programmatic answer for automated Slack alerts.

### Platform / Infrastructure Engineers

Engineers building internal AI platforms that route requests to multiple LLM providers. They need to forecast platform-wide spend to capacity-plan budgets, negotiate volume discounts with providers, and set rate limits that prevent budget overruns. The `createForecaster` factory supports continuous forecasting in a long-running platform service.

### AI Application Developers

Developers building AI-powered features who want to understand the cost trajectory of their application before it becomes a problem. During development and staging, they track token usage and want to project what production costs will look like at scale. The library's linear regression method extrapolates growth trends; the confidence intervals quantify the uncertainty.

### DevOps / SRE Teams

Teams responsible for alerting and incident response who need "forecast exceeds budget" as an alert condition alongside traditional infrastructure alerts. The `alertOnBudget` function provides a machine-readable budget alert that can be evaluated in a cron job and routed to PagerDuty, Opsgenie, or Slack.

---

## 4. Core Concepts

### Time Series

AI API spend data is a time series: a sequence of observations ordered by time, where each observation records the cost incurred during a time period (typically a day or an hour). The fundamental structure is an array of `{ date, cost }` pairs, optionally enriched with metadata (provider, model, token counts, request counts). All forecasting methods in this package operate on this time series representation. The time series must be sorted chronologically with no gaps; if gaps exist (e.g., zero-spend weekends), they must be represented as explicit zero-cost entries rather than missing entries.

### Forecast

A forecast is a prediction of future values in the time series. Given N historical data points, the forecast produces M future data points (where M is the `horizon`). Each forecasted data point includes a `date`, a `predicted` cost value (the point forecast), and upper/lower bounds representing the confidence interval. The point forecast is the model's best estimate; the confidence interval quantifies the range within which the actual value is expected to fall with a given probability.

### Forecasting Window and Horizon

The **window** is the number of historical data points used to compute the forecast. For moving averages, this is the period (e.g., a 7-day SMA uses the last 7 data points). For regression, this is the number of data points included in the fit. The **horizon** is the number of future periods to forecast. A 14-day horizon produces 14 daily forecasts. The relationship between window and horizon determines forecast quality: a short window is responsive to recent changes but noisy; a long window is stable but slow to react; a long horizon amplifies uncertainty.

### Confidence Intervals

A confidence interval (more precisely, a **prediction interval** in the forecasting context) provides upper and lower bounds around the point forecast. A 95% prediction interval means that, assuming the historical pattern continues and the model is correctly specified, the actual future value will fall within the interval approximately 95% of the time. This package computes prediction intervals using:

- **For regression methods**: Standard error of the regression (SER) multiplied by the appropriate t-distribution critical value, adjusted for forecast distance from the data center (leverage). The interval widens as the forecast extends further into the future, reflecting increasing uncertainty.
- **For moving average methods**: Historical volatility (standard deviation of residuals within the window) multiplied by a z-score for the desired confidence level. The interval is constant width for each forecast step (moving averages do not model increasing uncertainty over time).

The default confidence levels are 80% and 95%. Users can configure custom levels via the `confidenceLevels` option.

### Trend Detection

Trend detection answers "is spend going up, going down, or staying flat?" The package fits a linear regression to the historical data and evaluates:

- **Direction**: Sign of the slope coefficient. Positive = increasing, negative = decreasing.
- **Magnitude**: The slope value expressed as cost-per-day and as a percentage change relative to the mean daily cost.
- **Significance**: Whether the slope is statistically distinguishable from zero. Computed using a t-test on the slope coefficient with a configurable significance level (default: 0.05). A trend classified as `stable` has a slope that is not statistically significant -- the data does not provide enough evidence of a directional trend.

### Seasonality

AI API spend often exhibits seasonal patterns. Developer-driven usage is higher on weekdays than weekends. Batch processing jobs may run on specific days. Monthly patterns emerge from billing cycles, sprint cadences, and product release schedules. This package does not implement full seasonal decomposition (that would require ARIMA/Prophet), but it does support two mechanisms for accounting for seasonality:

- **Day-of-week weighting**: The WMA and WLS methods can be configured with a `dayOfWeekWeights` map that adjusts predictions based on the day of the week (e.g., Monday-Friday = 1.0, Saturday-Sunday = 0.3).
- **Window alignment**: Users can set the window size to a multiple of 7 (e.g., 7, 14, 28) to ensure the moving average captures a complete weekly cycle, preventing weekend troughs from biasing the forecast.

### Budget Alerting

Budget alerting is the operational use case that ties forecasting to action. Given a budget amount and a budget period (e.g., $5,000 for the current calendar month), the `alertOnBudget` function:

1. Computes the spend already incurred in the current period from the historical data.
2. Forecasts the remaining spend from today through the end of the period.
3. Sums actual + forecasted spend to produce a projected total.
4. Compares the projected total to the budget and returns a structured alert with: status (`on_track`, `warning`, `critical`), projected total, projected overage (or underage), projected budget exhaustion date (if applicable), and the confidence level of the projection.

The `warning` threshold is configurable (default: projected spend exceeds 80% of budget). The `critical` threshold is configurable (default: projected spend exceeds 100% of budget).

---

## 5. Historical Data Format

### UsageRecord

The fundamental input type. Each record represents a single time period's usage data.

```typescript
interface UsageRecord {
  /** ISO 8601 date string (YYYY-MM-DD) or ISO 8601 datetime string for hourly data.
   *  This is the start of the period this record covers. */
  date: string;

  /** Total cost in USD for this period. Required if tokenUsage is not provided.
   *  If both cost and tokenUsage are provided, cost takes precedence. */
  cost?: number;

  /** Token usage breakdown. Used to compute cost via model-price-registry
   *  integration when cost is not directly provided. */
  tokenUsage?: {
    /** AI provider identifier (e.g., 'openai', 'anthropic'). */
    provider: string;

    /** Model identifier (e.g., 'gpt-4o', 'claude-sonnet-4-5'). */
    model: string;

    /** Number of input tokens consumed. */
    inputTokens: number;

    /** Number of output tokens consumed. */
    outputTokens: number;

    /** Number of cached input tokens, if applicable. */
    cachedInputTokens?: number;
  };

  /** Number of API requests made in this period. Optional metadata for
   *  per-request cost analysis. */
  requests?: number;

  /** Arbitrary metadata tags for filtering and grouping.
   *  e.g., { team: 'search', project: 'semantic-search', environment: 'production' } */
  metadata?: Record<string, string>;
}
```

### History Array

The `history` parameter accepted by all top-level functions is an array of `UsageRecord` objects. Requirements:

- **Sorted chronologically**: Records must be in ascending date order. The library does not sort internally; unsorted input produces incorrect results.
- **No gaps**: Every period in the range must be represented. If a day had zero spend, include a record with `cost: 0`. Missing days cause the library to misinterpret the time axis.
- **Consistent granularity**: All records must use the same time granularity (all daily or all hourly). Mixing daily and hourly records produces incorrect results. The library auto-detects granularity from the date format: `YYYY-MM-DD` = daily, ISO 8601 datetime with hours = hourly.
- **Minimum length**: The history must contain at least `window + 1` records for moving average methods, or at least 3 records for regression methods. The library returns an error if the history is too short.

### Input Flexibility

The library accepts three input shapes to accommodate different data sources:

```typescript
/** Simple cost-only array: [date, cost] tuples. */
type SimpleCostHistory = Array<[string, number]>;

/** Object array with at least date and cost fields. */
type ObjectCostHistory = Array<UsageRecord>;

/** Pre-aggregated daily totals keyed by date. */
type DateCostMap = Record<string, number>;

/** Union type accepted by all top-level functions. */
type HistoryInput = SimpleCostHistory | ObjectCostHistory | DateCostMap;
```

The library normalizes all input shapes to `UsageRecord[]` internally. The `normalizeHistory` function is also exported for users who want to perform this conversion themselves.

---

## 6. Forecasting Methods

### Simple Moving Average (SMA)

**Algorithm**: The SMA forecast is the arithmetic mean of the last `window` data points. The same value is used for all forecast horizon steps (a flat-line projection at the average level).

```
SMA(t) = (1/n) * sum(cost[t-n+1] ... cost[t])
```

**Parameters**:
- `window` (default: 7): Number of historical periods to average. Common values: 7 (weekly average), 14 (biweekly), 30 (monthly).

**When to use**: SMA is appropriate when spend is relatively stable with random fluctuations around a mean. It is the simplest method and provides a baseline forecast. Use it when you do not expect spend to trend up or down and want a smoothed estimate of the current spending level. It is also useful as a sanity check against more complex methods.

**Limitations**: SMA does not capture trends (it will underforecast during a growth period and overforecast during a decline). All data points in the window are equally weighted, so a spike 6 days ago has the same influence as yesterday's value. The forecast is a flat line -- it does not model any future change in spending rate.

**Confidence interval**: Computed from the standard deviation of the values within the window. Upper and lower bounds are `SMA +/- z * stddev`, where `z` is the z-score for the desired confidence level (1.28 for 80%, 1.96 for 95%).

### Exponential Moving Average (EMA)

**Algorithm**: The EMA gives exponentially decreasing weight to older observations, making it more responsive to recent changes than the SMA. The smoothing factor `alpha` controls the decay rate.

```
EMA(t) = alpha * cost[t] + (1 - alpha) * EMA(t-1)
EMA(0) = cost[0]   (or SMA of the first `window` values for initialization)
```

**Parameters**:
- `alpha` (default: `2 / (window + 1)` where window defaults to 7): Smoothing factor between 0 and 1. Higher alpha = more weight on recent data. An alpha of 0.3 corresponds roughly to a 6-period span.
- `window` (optional, default: 7): Used only to compute the default alpha and to initialize the EMA with an SMA seed.

**When to use**: EMA is appropriate when recent spend is more indicative of future spend than older data. If the team recently adopted a new, more expensive model, the EMA will adapt to the new spending level faster than the SMA. It is the recommended moving average method for most use cases because it balances responsiveness with stability.

**Limitations**: Like all moving average methods, EMA produces a flat-line forecast. It reacts to level shifts but does not extrapolate trends. The choice of alpha is subjective; the default works well for weekly cycles but may need tuning for hourly data.

**Confidence interval**: Computed from the standard deviation of the EMA residuals (difference between actual and EMA-predicted values over the history). Bounds are `EMA +/- z * stddev_residuals`.

### Weighted Moving Average (WMA)

**Algorithm**: The WMA assigns linearly increasing weights to more recent observations within the window. The most recent data point gets the highest weight.

```
weights = [1, 2, 3, ..., n]   (for window size n)
WMA(t) = sum(weight[i] * cost[t-n+1+i]) / sum(weights)
```

**Parameters**:
- `window` (default: 7): Number of historical periods to include.
- `weights` (optional): Custom weight array. If provided, must have length equal to `window`. If omitted, linearly increasing weights are used.
- `dayOfWeekWeights` (optional): A map from day-of-week (0=Sunday, 6=Saturday) to a multiplier applied to the forecast for that day. e.g., `{ 0: 0.3, 6: 0.3 }` reduces weekend forecasts to 30% of the base forecast.

**When to use**: WMA is appropriate when you want the recency-weighting behavior of EMA but with explicit control over the weight distribution. The `dayOfWeekWeights` feature makes it the best moving average method for workloads with strong weekday/weekend seasonality -- it produces a forecast that reflects the expected lower weekend usage rather than a flat line that overestimates weekends and underestimates weekdays.

**Limitations**: Custom weight tuning requires domain knowledge. The `dayOfWeekWeights` feature is a simple multiplier, not a full seasonal decomposition -- it assumes the weekday/weekend ratio is constant over time. Like other moving average methods, WMA does not extrapolate trends.

**Confidence interval**: Same approach as SMA -- standard deviation of residuals within the window, scaled by the z-score.

### Linear Regression (OLS)

**Algorithm**: Ordinary Least Squares linear regression fits a straight line `y = a + b*x` to the historical data, where `x` is the time index (0, 1, 2, ..., n-1) and `y` is the cost. The forecast extrapolates this line into the future.

```
b = (n * sum(x*y) - sum(x) * sum(y)) / (n * sum(x^2) - sum(x)^2)
a = mean(y) - b * mean(x)
forecast(t) = a + b * t
```

**Parameters**:
- `window` (optional): If provided, only the last `window` data points are included in the regression fit. If omitted, all historical data is used.

**When to use**: Linear regression is the primary method for detecting and extrapolating spend trends. If spend is growing at $50/day due to increased adoption, OLS will forecast that growth continuing. It is the recommended method when spend is trending (up or down) and the trend is approximately linear over the forecast horizon. It is also the method used internally by `detectTrend`.

**Limitations**: Linear regression assumes a constant rate of change. It cannot model acceleration (spend growing faster over time), deceleration, or level shifts. It is sensitive to outliers -- a single day with 10x normal spend will pull the regression line up significantly. For data with outliers, use WLS with downweighting, or pre-filter outliers before fitting.

**Confidence interval**: Prediction intervals using the standard error of the regression (SER):

```
SER = sqrt(sum(residuals^2) / (n - 2))
SE_forecast(t) = SER * sqrt(1 + 1/n + (t - mean(x))^2 / sum((x - mean(x))^2))
interval = forecast(t) +/- t_critical(confidence, n-2) * SE_forecast(t)
```

The interval widens as `t` increases beyond the historical data range, correctly reflecting that predictions further in the future are less certain. The `t_critical` value comes from the Student's t-distribution with `n-2` degrees of freedom.

### Weighted Linear Regression (WLS)

**Algorithm**: Weighted Least Squares fits the same linear model as OLS but assigns weights to each data point. More recent data points receive higher weight, making the regression more responsive to recent trend changes. Outliers can be downweighted to reduce their influence.

```
Minimize: sum(w[i] * (y[i] - a - b*x[i])^2)
```

The normal equations are solved with weights incorporated:

```
b = (sum(w*x*y) - sum(w*x)*sum(w*y)/sum(w)) / (sum(w*x^2) - sum(w*x)^2/sum(w))
a = (sum(w*y) - b*sum(w*x)) / sum(w)
```

**Parameters**:
- `window` (optional): Same as OLS.
- `weights` (optional): Custom weight array. If omitted, exponentially decaying weights are used: `w[i] = decay^(n-1-i)` where `decay` defaults to 0.95.
- `decay` (default: 0.95): Decay factor for automatic weight generation. Only used when `weights` is not provided. A decay of 0.95 means a data point 30 days ago has weight `0.95^30 = 0.21` relative to the most recent point.

**When to use**: WLS is the recommended regression method for most production forecasting scenarios. It combines the trend-extrapolation capability of OLS with recency weighting that adapts to recent spending pattern changes. If a team recently switched from GPT-4o to Claude Sonnet (changing their cost rate), WLS will fit the trend primarily on the recent data, producing a more accurate forecast than OLS which would be biased by the pre-switch data. WLS also naturally handles outlier days (spikes or dips) by downweighting them as they age out of the high-weight zone.

**Limitations**: The choice of decay factor is subjective. Too aggressive (e.g., 0.80) makes the regression overly sensitive to recent noise. Too conservative (e.g., 0.99) makes it behave like OLS. The default of 0.95 works well for daily data with 2-4 weeks of history.

**Confidence interval**: Same formula as OLS but with weighted residuals and weighted sums of squares. The effective degrees of freedom are adjusted for the weight distribution.

---

## 7. Trend Detection

### Algorithm

`detectTrend(history)` fits an OLS linear regression to the historical data and evaluates the slope:

1. Fit `cost = a + b * timeIndex` using OLS on the full history (or the last `window` points if specified).
2. Compute the standard error of the slope coefficient: `SE_b = SER / sqrt(sum((x - mean(x))^2))`.
3. Compute the t-statistic: `t = b / SE_b`.
4. Compare `|t|` to the critical t-value for the configured significance level (default: 0.05, two-tailed) with `n-2` degrees of freedom.
5. If `|t| > t_critical`: the trend is significant. Direction = sign of `b`. If `b > 0`, trend is `increasing`; if `b < 0`, trend is `decreasing`.
6. If `|t| <= t_critical`: the trend is not statistically significant. Trend is `stable`.

### Return Type

```typescript
interface TrendResult {
  /** Trend direction. */
  direction: 'increasing' | 'decreasing' | 'stable';

  /** Slope of the regression line: cost change per period (day or hour). */
  slopePerPeriod: number;

  /** Slope expressed as percentage change per period, relative to mean cost. */
  slopePercentPerPeriod: number;

  /** Projected cost change over the next 30 periods if the trend continues. */
  projected30PeriodChange: number;

  /** Statistical significance: true if the slope is distinguishable from zero
   *  at the configured significance level. */
  significant: boolean;

  /** The p-value of the slope coefficient's t-test. */
  pValue: number;

  /** R-squared: proportion of variance explained by the linear trend.
   *  Values near 1.0 indicate a strong linear trend; near 0.0 indicates
   *  cost fluctuations are not explained by a simple trend. */
  rSquared: number;

  /** Number of data points used in the regression. */
  dataPoints: number;
}
```

### Interpretation Guidelines

| R-squared | Significance | Interpretation |
|---|---|---|
| > 0.7 | Yes | Strong, clear trend. Forecast with high confidence. |
| 0.3 - 0.7 | Yes | Moderate trend with substantial noise. Forecast directionally useful. |
| < 0.3 | Yes | Weak trend. Direction is probably correct but magnitude is uncertain. |
| Any | No | No detectable trend. Spend is fluctuating randomly around a mean. |

---

## 8. Budget Alerting

### alertOnBudget

The budget alerting function projects whether spend will exceed a defined budget within a defined period.

```typescript
function alertOnBudget(
  history: HistoryInput,
  budget: BudgetConfig,
  options?: ForecastOptions,
): BudgetAlert;
```

### BudgetConfig

```typescript
interface BudgetConfig {
  /** Budget amount in USD. */
  amount: number;

  /** Budget period start date (ISO 8601). If omitted, defaults to the first
   *  day of the current calendar month. */
  periodStart?: string;

  /** Budget period end date (ISO 8601). If omitted, defaults to the last
   *  day of the current calendar month. */
  periodEnd?: string;

  /** Threshold (0-1) at which to trigger a 'warning' status.
   *  Default: 0.8 (warn when projected spend exceeds 80% of budget). */
  warningThreshold?: number;

  /** Threshold (0-1) at which to trigger a 'critical' status.
   *  Default: 1.0 (critical when projected spend exceeds 100% of budget). */
  criticalThreshold?: number;
}
```

### BudgetAlert

```typescript
interface BudgetAlert {
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

  /** Ratio of projected total to budget (e.g., 1.15 means 15% over budget). */
  projectedBudgetRatio: number;

  /** ISO 8601 date on which the budget is projected to be exhausted.
   *  Undefined if projected spend is under budget. */
  exhaustionDate?: string;

  /** Number of days remaining in the budget period. */
  daysRemaining: number;

  /** Daily burn rate: actualSpend / daysElapsed. */
  dailyBurnRate: number;

  /** Required daily burn rate to stay within budget for remaining days.
   *  (budgetAmount - actualSpend) / daysRemaining. */
  requiredDailyRate: number;

  /** The underlying forecast result used to compute the alert. */
  forecast: ForecastResult;

  /** Confidence level used for the projection (matches forecast options). */
  confidenceLevel: number;
}
```

### Alert Logic

```
actualSpend = sum of cost for history records within [periodStart, periodEnd]
daysElapsed = periodEnd date - periodStart date (clamped to today if period is ongoing)
daysRemaining = periodEnd - today (0 if period has ended)
forecastedRemainingSpend = sum of forecast point predictions for remaining days
projectedTotal = actualSpend + forecastedRemainingSpend

if projectedTotal >= budget * criticalThreshold → status = 'critical'
else if projectedTotal >= budget * warningThreshold → status = 'warning'
else → status = 'on_track'
```

The `exhaustionDate` is the first forecasted day on which the cumulative actual + forecasted spend exceeds the budget amount. Computed by iterating through the daily forecast and accumulating costs until the budget is exceeded.

---

## 9. API Surface

### Installation

```bash
npm install ai-spend-forecast
```

No peer dependencies. No runtime dependencies.

### `forecast`

The primary forecasting function.

```typescript
import { forecast } from 'ai-spend-forecast';

const result = forecast(history, {
  method: 'ema',
  horizon: 14,
  confidenceLevels: [0.80, 0.95],
});

console.log(result.predictions[0]);
// {
//   date: '2026-03-20',
//   predicted: 142.50,
//   bounds: [
//     { level: 0.80, lower: 118.30, upper: 166.70 },
//     { level: 0.95, lower: 102.15, upper: 182.85 },
//   ]
// }
```

**Signature:**

```typescript
function forecast(
  history: HistoryInput,
  options?: ForecastOptions,
): ForecastResult;
```

### `detectTrend`

Analyzes the historical data for a directional trend.

```typescript
import { detectTrend } from 'ai-spend-forecast';

const trend = detectTrend(history, { significanceLevel: 0.05 });

console.log(trend.direction);            // 'increasing'
console.log(trend.slopePerPeriod);        // 12.34 (USD/day)
console.log(trend.slopePercentPerPeriod); // 3.2 (% per day)
console.log(trend.significant);           // true
console.log(trend.rSquared);              // 0.78
```

**Signature:**

```typescript
function detectTrend(
  history: HistoryInput,
  options?: TrendOptions,
): TrendResult;
```

### `alertOnBudget`

Evaluates whether projected spend will exceed a budget.

```typescript
import { alertOnBudget } from 'ai-spend-forecast';

const alert = alertOnBudget(
  history,
  {
    amount: 5000,
    periodStart: '2026-03-01',
    periodEnd: '2026-03-31',
    warningThreshold: 0.8,
    criticalThreshold: 1.0,
  },
  { method: 'wls' },
);

console.log(alert.status);           // 'warning'
console.log(alert.projectedTotal);   // 4350.00
console.log(alert.dailyBurnRate);    // 162.50
console.log(alert.exhaustionDate);   // undefined (under budget)
```

**Signature:**

```typescript
function alertOnBudget(
  history: HistoryInput,
  budget: BudgetConfig,
  options?: ForecastOptions,
): BudgetAlert;
```

### `createForecaster`

Factory function that returns a stateful forecaster instance with pre-configured settings.

```typescript
import { createForecaster } from 'ai-spend-forecast';

const forecaster = createForecaster({
  method: 'ema',
  alpha: 0.3,
  horizon: 7,
  confidenceLevels: [0.80, 0.95],
  budget: {
    amount: 5000,
    periodStart: '2026-03-01',
    periodEnd: '2026-03-31',
  },
});

// Load initial history
forecaster.load(history);

// Get forecast
const result = forecaster.forecast();

// Append new data point and re-forecast
forecaster.append({ date: '2026-03-20', cost: 155.00 });
const updated = forecaster.forecast();

// Check budget
const alert = forecaster.checkBudget();

// Get trend
const trend = forecaster.detectTrend();

// Reset state
forecaster.reset();
```

**Signature:**

```typescript
function createForecaster(config: ForecasterConfig): Forecaster;

interface ForecasterConfig extends ForecastOptions {
  /** Budget configuration for alertOnBudget. Optional. */
  budget?: BudgetConfig;
}

interface Forecaster {
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
```

### Complete Type Definitions

```typescript
// ── Forecast Options ─────────────────────────────────────────────────

interface ForecastOptions {
  /** Forecasting method. Default: 'ema'. */
  method?: 'sma' | 'ema' | 'wma' | 'ols' | 'wls';

  /** Number of future periods to forecast. Default: 14. */
  horizon?: number;

  /** Number of historical periods to use for the forecast.
   *  For moving averages: the averaging window.
   *  For regression: the number of data points to fit.
   *  Default: 7 for moving averages, all data for regression. */
  window?: number;

  /** Confidence levels for prediction intervals. Each value between 0 and 1.
   *  Default: [0.80, 0.95]. */
  confidenceLevels?: number[];

  /** EMA smoothing factor. Only used when method is 'ema'.
   *  Default: 2 / (window + 1). */
  alpha?: number;

  /** Custom weights for WMA or WLS. Length must equal window.
   *  For WMA: weights applied to data points.
   *  For WLS: weights applied to regression data points.
   *  Default: linearly increasing for WMA, exponentially decaying for WLS. */
  weights?: number[];

  /** Decay factor for automatic WLS weight generation.
   *  Only used when method is 'wls' and weights is not provided.
   *  Default: 0.95. */
  decay?: number;

  /** Day-of-week weight multipliers for WMA forecasts.
   *  Keys: 0 (Sunday) through 6 (Saturday). Values: multiplier (0-1+).
   *  Default: undefined (no day-of-week adjustment). */
  dayOfWeekWeights?: Partial<Record<number, number>>;

  /** Minimum predicted cost per period. Forecasts will not go below this value.
   *  Default: 0 (costs cannot be negative). */
  floor?: number;
}

interface TrendOptions {
  /** Number of historical periods to include in the trend analysis.
   *  Default: all data. */
  window?: number;

  /** Significance level for the t-test on the slope coefficient.
   *  Default: 0.05. */
  significanceLevel?: number;
}

// ── Forecast Result ──────────────────────────────────────────────────

interface ForecastResult {
  /** The forecasting method used. */
  method: 'sma' | 'ema' | 'wma' | 'ols' | 'wls';

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

interface ForecastPoint {
  /** ISO 8601 date string for this forecasted period. */
  date: string;

  /** Point forecast: the model's best estimate for this period's cost. */
  predicted: number;

  /** Confidence interval bounds at each configured level. */
  bounds: ConfidenceBound[];
}

interface ConfidenceBound {
  /** Confidence level (e.g., 0.80, 0.95). */
  level: number;

  /** Lower bound of the prediction interval. */
  lower: number;

  /** Upper bound of the prediction interval. */
  upper: number;
}

interface ForecastSummary {
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

interface RegressionFit {
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
```

### `normalizeHistory`

Utility function to convert any supported input format into a normalized `UsageRecord[]`.

```typescript
import { normalizeHistory } from 'ai-spend-forecast';

// From tuples
const records = normalizeHistory([
  ['2026-03-01', 120.50],
  ['2026-03-02', 135.00],
  ['2026-03-03', 98.25],
]);

// From date-cost map
const records2 = normalizeHistory({
  '2026-03-01': 120.50,
  '2026-03-02': 135.00,
  '2026-03-03': 98.25,
});
```

**Signature:**

```typescript
function normalizeHistory(input: HistoryInput): UsageRecord[];
```

---

## 10. Visualization Data

### Chart-Ready Output

The `ForecastResult.predictions` array is designed to be directly consumable by charting libraries. A typical integration with a frontend chart component:

```typescript
import { forecast } from 'ai-spend-forecast';

const result = forecast(history, { method: 'wls', horizon: 14 });

// Build chart data combining actual history and forecast
const chartData = [
  // Historical actuals
  ...result.history.map(r => ({
    date: r.date,
    actual: r.cost,
    predicted: null,
    upperBound: null,
    lowerBound: null,
  })),
  // Forecasted values with 95% confidence interval
  ...result.predictions.map(p => {
    const bound95 = p.bounds.find(b => b.level === 0.95);
    return {
      date: p.date,
      actual: null,
      predicted: p.predicted,
      upperBound: bound95?.upper ?? null,
      lowerBound: bound95?.lower ?? null,
    };
  }),
];
```

### toChartData Utility

The package exports a convenience function that produces this structure directly:

```typescript
import { forecast, toChartData } from 'ai-spend-forecast';

const result = forecast(history, { method: 'wls', horizon: 14 });
const chartData = toChartData(result, { confidenceLevel: 0.95 });
// ChartPoint[]
```

```typescript
interface ChartPoint {
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

interface ChartDataOptions {
  /** Which confidence level to use for the bounds.
   *  Default: the highest level in the forecast result. */
  confidenceLevel?: number;

  /** Include historical data in the output.
   *  Default: true. */
  includeHistory?: boolean;
}

function toChartData(result: ForecastResult, options?: ChartDataOptions): ChartPoint[];
```

---

## 11. Configuration

### Default Configuration

All defaults are chosen for the most common use case: daily cost data with a 2-week forecast horizon and both 80% and 95% confidence intervals.

| Parameter | Default | Rationale |
|---|---|---|
| `method` | `'ema'` | Best balance of responsiveness and stability for daily spend data. |
| `horizon` | `14` | Two-week forecast covers the typical FinOps review cycle. |
| `window` | `7` | One-week window captures a full weekday/weekend cycle. |
| `confidenceLevels` | `[0.80, 0.95]` | 80% for planning, 95% for worst-case budgeting. |
| `alpha` | `2 / (window + 1) = 0.25` | Standard EMA smoothing for a 7-period span. |
| `decay` | `0.95` | WLS: 30-day-old data retains ~21% weight. |
| `floor` | `0` | Costs cannot be negative. |
| `significanceLevel` | `0.05` | Standard p-value threshold. |
| `warningThreshold` | `0.80` | Alert at 80% of budget. |
| `criticalThreshold` | `1.00` | Critical at 100% of budget. |

### Environment Variable Overrides

For CI/CD and automation environments, defaults can be overridden via environment variables:

| Environment Variable | Overrides | Example |
|---|---|---|
| `AI_FORECAST_METHOD` | `method` | `AI_FORECAST_METHOD=wls` |
| `AI_FORECAST_HORIZON` | `horizon` | `AI_FORECAST_HORIZON=30` |
| `AI_FORECAST_WINDOW` | `window` | `AI_FORECAST_WINDOW=14` |
| `AI_FORECAST_CONFIDENCE` | `confidenceLevels` | `AI_FORECAST_CONFIDENCE=0.80,0.95` |
| `AI_FORECAST_BUDGET` | `budget.amount` | `AI_FORECAST_BUDGET=5000` |

Environment variables are only read by the CLI. The programmatic API ignores environment variables; all configuration is passed explicitly via function arguments.

---

## 12. CLI

### Installation

```bash
npm install -g ai-spend-forecast
```

Or use via npx:

```bash
npx ai-spend-forecast forecast --input costs.csv --horizon 14
```

### Commands

#### `forecast`

Generate a spend forecast from historical data.

```bash
ai-spend-forecast forecast \
  --input costs.csv \
  --method wls \
  --horizon 14 \
  --window 7 \
  --confidence 0.80,0.95 \
  --format table
```

**Input formats supported**: CSV (with `date` and `cost` columns), JSON (array of `UsageRecord` or `[date, cost]` tuples), and JSONL (one record per line).

**Output formats**: `table` (human-readable, default), `json` (structured `ForecastResult`), `csv` (date, predicted, lower, upper columns).

#### `trend`

Analyze spend trend.

```bash
ai-spend-forecast trend --input costs.csv --window 30

# Output:
# Trend: INCREASING
# Rate: +$12.34/day (+3.2%/day)
# R-squared: 0.78
# Significance: p=0.001 (significant at 0.05)
# 30-day projection: +$370.20 above current level
```

#### `budget`

Check forecast against budget.

```bash
ai-spend-forecast budget \
  --input costs.csv \
  --amount 5000 \
  --period-start 2026-03-01 \
  --period-end 2026-03-31

# Output:
# Budget Status: WARNING
# Budget: $5,000.00
# Actual spend (19 days): $3,087.50
# Forecasted remaining (12 days): $1,948.80
# Projected total: $5,036.30 (100.7% of budget)
# Daily burn rate: $162.50
# Required daily rate: $159.38
# Exhaustion date: 2026-03-29
```

### Exit Codes

| Code | Meaning |
|---|---|
| 0 | Success. For `budget` command: status is `on_track`. |
| 1 | For `budget` command: status is `warning` or `critical`. For other commands: runtime error. |
| 2 | Invalid input, missing required arguments, or configuration error. |

### CSV Input Format

The CSV file must have a header row. The library auto-detects column names:

```csv
date,cost
2026-03-01,120.50
2026-03-02,135.00
2026-03-03,98.25
```

Additional columns are accepted and preserved as metadata:

```csv
date,cost,provider,model,input_tokens,output_tokens,requests,team
2026-03-01,45.00,openai,gpt-4o,1500000,200000,850,search
2026-03-01,75.50,anthropic,claude-sonnet-4-5,2000000,350000,1200,platform
```

---

## 13. Integration

### model-price-registry

When historical data includes token usage but not pre-computed costs, `ai-spend-forecast` can compute costs automatically using `model-price-registry` as an optional peer dependency.

```typescript
import { forecast } from 'ai-spend-forecast';
import { estimateCost } from 'model-price-registry';

// Option 1: Pass a cost resolver function
const result = forecast(tokenHistory, {
  method: 'ema',
  horizon: 14,
  costResolver: (record) => {
    if (record.cost !== undefined) return record.cost;
    if (!record.tokenUsage) return 0;
    const estimate = estimateCost(
      record.tokenUsage.provider,
      record.tokenUsage.model,
      {
        inputTokens: record.tokenUsage.inputTokens,
        outputTokens: record.tokenUsage.outputTokens,
        cachedInputTokens: record.tokenUsage.cachedInputTokens,
      },
    );
    return estimate?.totalCost ?? 0;
  },
});
```

```typescript
// Option 2: Use the built-in integration (auto-detects model-price-registry)
import { forecast } from 'ai-spend-forecast';

const result = forecast(tokenHistory, {
  method: 'ema',
  horizon: 14,
  resolveCosts: true,  // requires model-price-registry to be installed
});
```

When `resolveCosts: true` is set, the library attempts to `require('model-price-registry')` at runtime. If the package is not installed, it throws a clear error: `"resolveCosts requires model-price-registry to be installed: npm install model-price-registry"`.

### ai-chargeback

`ai-chargeback` tags API usage by cost center (team, project, feature). `ai-spend-forecast` can consume chargeback-tagged data to produce per-cost-center forecasts.

```typescript
import { forecast } from 'ai-spend-forecast';

// History records with metadata tags from ai-chargeback
const taggedHistory = [
  { date: '2026-03-01', cost: 45.00, metadata: { team: 'search' } },
  { date: '2026-03-01', cost: 75.50, metadata: { team: 'platform' } },
  { date: '2026-03-02', cost: 52.00, metadata: { team: 'search' } },
  { date: '2026-03-02', cost: 68.00, metadata: { team: 'platform' } },
  // ...
];

// Forecast per team using groupBy
const searchHistory = taggedHistory.filter(r => r.metadata?.team === 'search');
const platformHistory = taggedHistory.filter(r => r.metadata?.team === 'platform');

const searchForecast = forecast(searchHistory, { method: 'wls', horizon: 14 });
const platformForecast = forecast(platformHistory, { method: 'wls', horizon: 14 });
```

A convenience `forecastByGroup` function is provided:

```typescript
import { forecastByGroup } from 'ai-spend-forecast';

const results = forecastByGroup(taggedHistory, {
  groupBy: 'team',
  method: 'wls',
  horizon: 14,
});
// Record<string, ForecastResult>
// {
//   'search': ForecastResult,
//   'platform': ForecastResult,
// }
```

```typescript
function forecastByGroup(
  history: UsageRecord[],
  options: ForecastByGroupOptions,
): Record<string, ForecastResult>;

interface ForecastByGroupOptions extends ForecastOptions {
  /** Metadata key to group by (e.g., 'team', 'project', 'feature'). */
  groupBy: string;
}
```

### ai-circuit-breaker

`ai-circuit-breaker` implements circuit breaker patterns for AI API spend management -- cutting off requests when spend exceeds a threshold. `ai-spend-forecast` can feed proactive forecasts into the circuit breaker, enabling preemptive rate limiting before the budget is actually exhausted.

```typescript
import { createForecaster } from 'ai-spend-forecast';

const forecaster = createForecaster({
  method: 'ema',
  horizon: 7,
  budget: { amount: 5000, periodStart: '2026-03-01', periodEnd: '2026-03-31' },
});

forecaster.load(history);

// Feed forecast into circuit breaker threshold
const alert = forecaster.checkBudget();

if (alert.status === 'critical') {
  // Signal circuit breaker to trip:
  // projected spend exceeds budget, preemptively reduce traffic
  circuitBreaker.trip({
    reason: 'forecast_budget_exceeded',
    projectedTotal: alert.projectedTotal,
    budgetAmount: alert.budgetAmount,
    exhaustionDate: alert.exhaustionDate,
  });
} else if (alert.status === 'warning') {
  // Signal circuit breaker to enter half-open state:
  // allow reduced traffic while monitoring
  circuitBreaker.halfOpen({
    reason: 'forecast_budget_warning',
    projectedBudgetRatio: alert.projectedBudgetRatio,
  });
}
```

---

## 14. Error Handling

### Error Types

All errors thrown by the library are instances of `ForecastError`, which extends `Error` with a `code` property for programmatic handling.

```typescript
class ForecastError extends Error {
  /** Machine-readable error code. */
  readonly code: ForecastErrorCode;

  constructor(code: ForecastErrorCode, message: string);
}

type ForecastErrorCode =
  | 'INSUFFICIENT_DATA'    // History too short for the configured method/window
  | 'INVALID_HISTORY'      // History is not sorted, has gaps, or is malformed
  | 'INVALID_OPTIONS'      // Invalid configuration (e.g., negative horizon, alpha > 1)
  | 'INVALID_BUDGET'       // Budget config is malformed (e.g., end before start)
  | 'MISSING_COST'         // Record has neither cost nor tokenUsage, and resolveCosts is false
  | 'RESOLVER_UNAVAILABLE' // resolveCosts is true but model-price-registry is not installed
  | 'COMPUTATION_ERROR';   // Unexpected math error (e.g., division by zero in degenerate data)
```

### Validation Rules

| Condition | Error Code | Message |
|---|---|---|
| `history.length < window + 1` (moving averages) | `INSUFFICIENT_DATA` | `"History has {n} records but method '{method}' with window {w} requires at least {w+1}"` |
| `history.length < 3` (regression) | `INSUFFICIENT_DATA` | `"History has {n} records but regression requires at least 3"` |
| History not sorted by date | `INVALID_HISTORY` | `"History records must be sorted in ascending chronological order"` |
| `horizon <= 0` | `INVALID_OPTIONS` | `"Horizon must be a positive integer, got {horizon}"` |
| `alpha <= 0` or `alpha > 1` | `INVALID_OPTIONS` | `"EMA alpha must be between 0 (exclusive) and 1 (inclusive), got {alpha}"` |
| `budget.periodEnd < budget.periodStart` | `INVALID_BUDGET` | `"Budget period end ({end}) must be after period start ({start})"` |
| Record has no cost and no tokenUsage | `MISSING_COST` | `"Record at index {i} (date: {date}) has neither cost nor tokenUsage"` |
| `resolveCosts: true` and model-price-registry not installed | `RESOLVER_UNAVAILABLE` | `"resolveCosts requires model-price-registry to be installed: npm install model-price-registry"` |

---

## 15. Testing

### Test Strategy

Tests are written with Vitest and follow the existing monorepo pattern. The test suite is divided into four categories:

#### Unit Tests

Each forecasting method has a dedicated test file verifying mathematical correctness against known inputs:

- **SMA tests**: Known 7-day window with hand-computed averages. Verify the forecast equals the arithmetic mean. Verify confidence bounds match `mean +/- z * stddev`.
- **EMA tests**: Known sequence with hand-computed EMA values. Verify convergence from SMA seed. Verify different alpha values produce different responsiveness.
- **WMA tests**: Known weights applied to known data. Verify weighted average computation. Verify `dayOfWeekWeights` multiplier application.
- **OLS tests**: Known linear data (`y = 2x + 10` with noise). Verify slope and intercept recovery. Verify R-squared near 1.0 for noiseless data. Verify prediction intervals widen with horizon.
- **WLS tests**: Known data with recent trend change. Verify WLS adapts faster than OLS to the change. Verify custom weights produce expected fit.

#### Integration Tests

- **Cost resolution**: Provide token usage data with `resolveCosts: true` and verify costs are correctly computed (requires `model-price-registry` as a dev dependency).
- **Budget alerting**: Provide 20 days of history within a 31-day budget period, verify alert status transitions as projected spend crosses thresholds.
- **Group forecasting**: Provide multi-team tagged data, verify `forecastByGroup` produces separate forecasts for each team.
- **Forecaster state**: Verify `createForecaster` load/append/reset lifecycle.

#### Edge Case Tests

- **Minimum data**: Exactly 3 records for regression, exactly `window + 1` for moving averages.
- **Constant data**: All cost values identical. Verify forecast is the constant value, confidence interval is zero width, trend is `stable`.
- **Zero data**: All costs are zero. Verify forecast is zero, no division-by-zero errors.
- **Single spike**: One outlier in otherwise stable data. Verify SMA is pulled toward it, EMA recovers faster, WLS downweights it over time.
- **Monotonically increasing**: Perfect linear growth. Verify OLS slope matches exactly, R-squared is 1.0.
- **Weekend dip pattern**: Weekday costs at 100, weekend costs at 30. Verify WMA with `dayOfWeekWeights` produces accurate weekday/weekend forecasts.

#### Error Tests

- Verify each `ForecastErrorCode` is thrown with the correct code and message for the corresponding invalid input.
- Verify unsorted history is rejected.
- Verify negative horizon is rejected.
- Verify `alpha > 1` is rejected.
- Verify budget with end before start is rejected.

### Test Data

Test fixtures use deterministic, hand-crafted data sets (not randomly generated) so that expected outputs can be verified exactly. Larger test data sets (90 days of simulated daily costs) are generated by a deterministic seed function in the test helpers.

---

## 16. Performance

### Computational Complexity

| Method | Time Complexity | Space Complexity |
|---|---|---|
| SMA | O(n) | O(1) beyond input |
| EMA | O(n) | O(1) beyond input |
| WMA | O(n) | O(w) for weights |
| OLS | O(n) | O(1) beyond input |
| WLS | O(n) | O(n) for weights |
| `detectTrend` | O(n) | O(1) beyond input |
| `alertOnBudget` | O(n + h) | O(h) for predictions |

Where `n` is the history length, `w` is the window size, and `h` is the horizon.

### Benchmarks

Target performance (validated in CI):

| Operation | Data Size | Target |
|---|---|---|
| `forecast` (EMA, 7-day window, 14-day horizon) | 90 days | < 1ms |
| `forecast` (WLS, 30-day window, 30-day horizon) | 365 days | < 2ms |
| `detectTrend` | 365 days | < 1ms |
| `alertOnBudget` (EMA + budget eval) | 90 days | < 1ms |
| `forecastByGroup` (10 groups) | 90 days x 10 | < 5ms |
| `normalizeHistory` (CSV parse) | 10,000 records | < 50ms |

All forecasting computations are pure arithmetic on arrays. No I/O, no async operations, no allocations beyond the result objects. The package is suitable for hot-path use in request-processing pipelines.

---

## 17. Dependencies

### Runtime Dependencies

None. Zero runtime dependencies. Pure TypeScript compiled to CommonJS, using only built-in Node.js modules (`fs` for CLI file reading, `path` for CLI path resolution).

### Optional Peer Dependencies

```json
{
  "peerDependencies": {
    "model-price-registry": ">=0.1.0"
  },
  "peerDependenciesMeta": {
    "model-price-registry": {
      "optional": true
    }
  }
}
```

`model-price-registry` is only required when using `resolveCosts: true` to automatically compute costs from token usage records.

### Dev Dependencies

| Package | Purpose |
|---|---|
| `typescript` | TypeScript compiler |
| `vitest` | Test runner |
| `eslint` | Linter |
| `model-price-registry` | Used in integration tests for cost resolution testing |

---

## 18. File Structure

```
ai-spend-forecast/
  package.json
  tsconfig.json
  SPEC.md
  README.md
  src/
    index.ts                    # Public API re-exports
    types.ts                    # All TypeScript interfaces and type definitions
    normalize.ts                # normalizeHistory: input format conversion
    forecast.ts                 # forecast() main function and method dispatch
    trend.ts                    # detectTrend() implementation
    budget.ts                   # alertOnBudget() implementation
    forecaster.ts               # createForecaster() factory and Forecaster class
    group.ts                    # forecastByGroup() implementation
    chart.ts                    # toChartData() utility
    errors.ts                   # ForecastError class and error codes
    methods/
      sma.ts                    # Simple Moving Average implementation
      ema.ts                    # Exponential Moving Average implementation
      wma.ts                    # Weighted Moving Average implementation
      ols.ts                    # Ordinary Least Squares regression
      wls.ts                    # Weighted Least Squares regression
    stats/
      confidence.ts             # Confidence/prediction interval computation
      t-distribution.ts         # t-distribution critical values lookup table
      descriptive.ts            # Mean, variance, standard deviation, covariance
    cli/
      index.ts                  # CLI entry point and argument parsing
      commands/
        forecast.ts             # forecast command handler
        trend.ts                # trend command handler
        budget.ts               # budget command handler
      format/
        table.ts                # Human-readable table formatter
        json.ts                 # JSON output formatter
        csv.ts                  # CSV output formatter
      parse/
        csv.ts                  # CSV input parser
        json.ts                 # JSON/JSONL input parser
  src/__tests__/
    normalize.test.ts           # Input normalization tests
    forecast.test.ts            # Integration tests for forecast()
    trend.test.ts               # Trend detection tests
    budget.test.ts              # Budget alerting tests
    forecaster.test.ts          # Stateful forecaster tests
    group.test.ts               # Group forecasting tests
    chart.test.ts               # Chart data utility tests
    errors.test.ts              # Error handling tests
    methods/
      sma.test.ts               # SMA unit tests
      ema.test.ts               # EMA unit tests
      wma.test.ts               # WMA unit tests
      ols.test.ts               # OLS regression unit tests
      wls.test.ts               # WLS regression unit tests
    stats/
      confidence.test.ts        # Confidence interval computation tests
      descriptive.test.ts       # Descriptive statistics tests
    fixtures/
      daily-stable.ts           # 30 days of stable ~$100/day data
      daily-trending.ts         # 90 days of linearly increasing data
      daily-seasonal.ts         # 28 days with weekday/weekend pattern
      daily-spike.ts            # 30 days with a single 10x outlier
      daily-zero.ts             # 30 days of zero-cost data
      daily-constant.ts         # 30 days of identical cost values
  dist/                         # Compiled output (generated by tsc)
```

---

## 19. Roadmap

### v0.1.0 -- Initial Release

- Core forecasting: SMA, EMA, WMA, OLS, WLS methods.
- Confidence intervals at configurable levels.
- `forecast()`, `detectTrend()`, `alertOnBudget()` functions.
- `createForecaster()` factory for stateful forecasting.
- `normalizeHistory()` for input format conversion.
- `toChartData()` for visualization-ready output.
- `forecastByGroup()` for per-cost-center forecasting.
- Error handling with typed error codes.
- Full test suite with unit, integration, and edge case coverage.

### v0.2.0 -- CLI

- `ai-spend-forecast forecast` command with CSV/JSON input.
- `ai-spend-forecast trend` command.
- `ai-spend-forecast budget` command with exit codes for CI.
- Table, JSON, and CSV output formats.
- Environment variable configuration.

### v0.3.0 -- model-price-registry Integration

- `resolveCosts` option for automatic cost computation from token usage data.
- `costResolver` callback for custom cost resolution logic.
- Integration tests with `model-price-registry`.

### v0.4.0 -- Advanced Features

- Anomaly detection: flag data points that deviate significantly from the forecast (z-score > 3).
- Moving window forecasting: `forecastRolling()` that produces a new forecast at each historical data point, useful for backtesting forecast accuracy.
- Forecast accuracy metrics: MAE, MAPE, RMSE computed via walk-forward validation on historical data.

### v1.0.0 -- Stable Release

- API surface frozen. Semver-major changes only for breaking changes.
- Performance benchmarks validated and published.
- Integration guides for common setups (Grafana dashboard, Slack webhook, PagerDuty alert, GitHub Actions cost gate).

---

## 20. Examples

### Basic Daily Forecast

```typescript
import { forecast } from 'ai-spend-forecast';

const history = [
  { date: '2026-03-01', cost: 120.50 },
  { date: '2026-03-02', cost: 135.00 },
  { date: '2026-03-03', cost: 98.25 },
  { date: '2026-03-04', cost: 142.00 },
  { date: '2026-03-05', cost: 155.75 },
  { date: '2026-03-06', cost: 48.00 },   // Saturday
  { date: '2026-03-07', cost: 42.50 },   // Sunday
  { date: '2026-03-08', cost: 138.00 },
  { date: '2026-03-09', cost: 145.20 },
  { date: '2026-03-10', cost: 152.80 },
  { date: '2026-03-11', cost: 148.50 },
  { date: '2026-03-12', cost: 160.00 },
  { date: '2026-03-13', cost: 55.00 },   // Saturday
  { date: '2026-03-14', cost: 50.25 },   // Sunday
];

const result = forecast(history, {
  method: 'ema',
  horizon: 7,
  window: 7,
});

console.log(`Forecast for next 7 days:`);
for (const p of result.predictions) {
  const b95 = p.bounds.find(b => b.level === 0.95)!;
  console.log(`  ${p.date}: $${p.predicted.toFixed(2)} [$${b95.lower.toFixed(2)} - $${b95.upper.toFixed(2)}]`);
}
console.log(`Total predicted: $${result.summary.totalPredicted.toFixed(2)}`);
```

### Trend Detection with Budget Alert

```typescript
import { detectTrend, alertOnBudget } from 'ai-spend-forecast';

// Assume `history` contains 30 days of increasing spend
const trend = detectTrend(history);

if (trend.direction === 'increasing' && trend.significant) {
  console.log(`Spend is increasing at $${trend.slopePerPeriod.toFixed(2)}/day`);
  console.log(`At this rate, spend will increase by $${trend.projected30PeriodChange.toFixed(2)} over 30 days`);
}

const alert = alertOnBudget(
  history,
  { amount: 5000 },
  { method: 'wls' },
);

switch (alert.status) {
  case 'critical':
    console.error(`CRITICAL: Projected spend $${alert.projectedTotal.toFixed(2)} exceeds budget by $${alert.projectedVariance.toFixed(2)}`);
    console.error(`Budget exhaustion date: ${alert.exhaustionDate}`);
    break;
  case 'warning':
    console.warn(`WARNING: Projected spend $${alert.projectedTotal.toFixed(2)} is ${(alert.projectedBudgetRatio * 100).toFixed(0)}% of budget`);
    break;
  case 'on_track':
    console.log(`On track. Projected spend: $${alert.projectedTotal.toFixed(2)} (${(alert.projectedBudgetRatio * 100).toFixed(0)}% of budget)`);
    break;
}
```

### Weekend-Aware Forecasting

```typescript
import { forecast } from 'ai-spend-forecast';

const result = forecast(history, {
  method: 'wma',
  window: 14,
  horizon: 14,
  dayOfWeekWeights: {
    0: 0.35,  // Sunday
    1: 1.00,  // Monday
    2: 1.00,  // Tuesday
    3: 1.00,  // Wednesday
    4: 1.00,  // Thursday
    5: 0.90,  // Friday (slightly lower)
    6: 0.30,  // Saturday
  },
});

// Forecast now reflects expected weekday/weekend spend patterns
// rather than a flat line that overestimates weekends
```

### Stateful Forecaster in a Long-Running Service

```typescript
import { createForecaster } from 'ai-spend-forecast';

const forecaster = createForecaster({
  method: 'ema',
  alpha: 0.3,
  horizon: 7,
  budget: {
    amount: 5000,
    periodStart: '2026-03-01',
    periodEnd: '2026-03-31',
  },
});

// Initial load from database
const historicalRecords = await db.query('SELECT date, cost FROM daily_spend ORDER BY date');
forecaster.load(historicalRecords);

// Periodic update (e.g., run at end of each day)
async function dailyUpdate() {
  const today = await db.query('SELECT date, cost FROM daily_spend WHERE date = CURRENT_DATE');
  forecaster.append(today[0]);

  const alert = forecaster.checkBudget();
  if (alert.status !== 'on_track') {
    await slack.post('#finops-alerts', {
      text: `AI Spend Alert: ${alert.status.toUpperCase()}\n` +
            `Projected: $${alert.projectedTotal.toFixed(2)} / $${alert.budgetAmount.toFixed(2)}\n` +
            `Daily burn: $${alert.dailyBurnRate.toFixed(2)}\n` +
            `Days remaining: ${alert.daysRemaining}`,
    });
  }
}
```

### Feeding Forecast into CI/CD Cost Gate

```bash
#!/bin/bash
# .github/scripts/cost-gate.sh
# Fail the build if projected spend exceeds budget

ai-spend-forecast budget \
  --input daily-costs.json \
  --amount 5000 \
  --format json \
  > /tmp/budget-alert.json

STATUS=$(jq -r '.status' /tmp/budget-alert.json)

if [ "$STATUS" = "critical" ]; then
  PROJECTED=$(jq -r '.projectedTotal' /tmp/budget-alert.json)
  echo "::error::AI spend forecast exceeds budget. Projected: \$$PROJECTED / \$5000"
  exit 1
fi
```

### Per-Team Forecasting with Chargeback Data

```typescript
import { forecastByGroup } from 'ai-spend-forecast';

// Data from ai-chargeback with team tags
const taggedHistory = [
  { date: '2026-03-01', cost: 45.00, metadata: { team: 'search', project: 'semantic-search' } },
  { date: '2026-03-01', cost: 75.50, metadata: { team: 'platform', project: 'chat-api' } },
  { date: '2026-03-01', cost: 22.00, metadata: { team: 'data', project: 'embeddings' } },
  // ... 30 days of data
];

const teamForecasts = forecastByGroup(taggedHistory, {
  groupBy: 'team',
  method: 'wls',
  horizon: 14,
});

for (const [team, result] of Object.entries(teamForecasts)) {
  console.log(`${team}: $${result.summary.totalPredicted.toFixed(2)} predicted over 14 days`);
}

// Also forecast by project
const projectForecasts = forecastByGroup(taggedHistory, {
  groupBy: 'project',
  method: 'ema',
  horizon: 14,
});
```
