import type {
  ForecastMethod,
  ForecastOptions,
  ForecastPoint,
  ForecastResult,
  ForecastSummary,
  HistoryInput,
  RegressionFit,
} from './types.js';
import { ForecastError } from './errors.js';
import { normalizeHistory, extractCosts, getNextDates } from './normalize.js';
import { computeSma } from './methods/sma.js';
import { computeEma } from './methods/ema.js';
import { computeWma } from './methods/wma.js';
import { computeOls } from './methods/ols.js';
import { computeWls } from './methods/wls.js';

const MA_METHODS: ForecastMethod[] = ['sma', 'ema', 'wma'];

/**
 * Primary forecasting function.
 * Accepts historical usage data and returns predicted future spending.
 */
export function forecast(
  history: HistoryInput,
  options?: ForecastOptions,
): ForecastResult {
  const records = normalizeHistory(history);
  const costs = extractCosts(records);

  const method: ForecastMethod = options?.method ?? 'ema';
  const horizon = options?.horizon ?? 14;
  const confidenceLevels = options?.confidenceLevels ?? [0.80, 0.95];
  const floor = options?.floor ?? 0;

  // Determine window
  const isMA = MA_METHODS.includes(method);
  const window = options?.window ?? (isMA ? 7 : costs.length);

  // Validate minimum data
  if (isMA && costs.length < window) {
    throw new ForecastError(
      'INSUFFICIENT_DATA',
      `History has ${costs.length} records but method '${method}' with window ${window} requires at least ${window}`,
    );
  }

  const effectiveWindow = Math.min(window, costs.length);

  if (!isMA && costs.length < 3) {
    throw new ForecastError(
      'INSUFFICIENT_DATA',
      `History has ${costs.length} records but regression methods require at least 3`,
    );
  }

  // Validate options
  if (horizon < 1) {
    throw new ForecastError('INVALID_OPTIONS', 'Horizon must be at least 1');
  }

  for (const level of confidenceLevels) {
    if (level <= 0 || level >= 1) {
      throw new ForecastError('INVALID_OPTIONS', `Confidence level ${level} must be between 0 and 1 (exclusive)`);
    }
  }

  // Generate future dates
  const lastDate = records[records.length - 1].date;
  const futureDates = getNextDates(lastDate, horizon);

  let predictions: ForecastPoint[];
  let fit: RegressionFit | undefined;

  switch (method) {
    case 'sma':
      predictions = computeSma({
        costs,
        window: effectiveWindow,
        horizon,
        confidenceLevels,
        dates: futureDates,
        floor,
      });
      break;

    case 'ema': {
      const emaResult = computeEma({
        costs,
        window: effectiveWindow,
        horizon,
        confidenceLevels,
        dates: futureDates,
        alpha: options?.alpha,
        floor,
      });
      predictions = emaResult.predictions;
      break;
    }

    case 'wma':
      predictions = computeWma({
        costs,
        window: effectiveWindow,
        horizon,
        confidenceLevels,
        dates: futureDates,
        weights: options?.weights,
        dayOfWeekWeights: options?.dayOfWeekWeights,
        floor,
      });
      break;

    case 'ols': {
      const olsResult = computeOls({
        costs,
        window: options?.window,
        horizon,
        confidenceLevels,
        dates: futureDates,
        floor,
      });
      predictions = olsResult.predictions;
      fit = olsResult.fit;
      break;
    }

    case 'wls': {
      const wlsResult = computeWls({
        costs,
        window: options?.window,
        horizon,
        confidenceLevels,
        dates: futureDates,
        weights: options?.weights,
        decay: options?.decay,
        floor,
      });
      predictions = wlsResult.predictions;
      fit = wlsResult.fit;
      break;
    }

    default:
      throw new ForecastError('INVALID_OPTIONS', `Unknown method: ${method as string}`);
  }

  const summary = computeSummary(predictions, confidenceLevels);

  const result: ForecastResult = {
    method,
    horizon,
    window: effectiveWindow,
    predictions,
    summary,
    history: records,
  };

  if (fit) {
    result.fit = fit;
  }

  return result;
}

function computeSummary(predictions: ForecastPoint[], confidenceLevels: number[]): ForecastSummary {
  const predictedValues = predictions.map(p => p.predicted);
  const totalPredicted = predictedValues.reduce((a, b) => a + b, 0);
  const averagePredicted = predictions.length > 0 ? totalPredicted / predictions.length : 0;

  // Find highest confidence level for summary bounds
  const highestLevel = Math.max(...confidenceLevels);

  let totalUpperBound = 0;
  let totalLowerBound = 0;
  for (const p of predictions) {
    const bound = p.bounds.find(b => b.level === highestLevel);
    if (bound) {
      totalUpperBound += bound.upper;
      totalLowerBound += bound.lower;
    }
  }

  return {
    totalPredicted,
    averagePredicted,
    minPredicted: predictions.length > 0 ? Math.min(...predictedValues) : 0,
    maxPredicted: predictions.length > 0 ? Math.max(...predictedValues) : 0,
    totalUpperBound,
    totalLowerBound,
  };
}
