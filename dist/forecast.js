"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.forecast = forecast;
const errors_js_1 = require("./errors.js");
const normalize_js_1 = require("./normalize.js");
const sma_js_1 = require("./methods/sma.js");
const ema_js_1 = require("./methods/ema.js");
const wma_js_1 = require("./methods/wma.js");
const ols_js_1 = require("./methods/ols.js");
const wls_js_1 = require("./methods/wls.js");
const MA_METHODS = ['sma', 'ema', 'wma'];
/**
 * Primary forecasting function.
 * Accepts historical usage data and returns predicted future spending.
 */
function forecast(history, options) {
    const records = (0, normalize_js_1.normalizeHistory)(history);
    const costs = (0, normalize_js_1.extractCosts)(records);
    const method = options?.method ?? 'ema';
    const horizon = options?.horizon ?? 14;
    const confidenceLevels = options?.confidenceLevels ?? [0.80, 0.95];
    const floor = options?.floor ?? 0;
    // Determine window
    const isMA = MA_METHODS.includes(method);
    const window = options?.window ?? (isMA ? 7 : costs.length);
    // Validate minimum data
    if (isMA && costs.length < window) {
        throw new errors_js_1.ForecastError('INSUFFICIENT_DATA', `History has ${costs.length} records but method '${method}' with window ${window} requires at least ${window}`);
    }
    const effectiveWindow = Math.min(window, costs.length);
    if (!isMA && costs.length < 3) {
        throw new errors_js_1.ForecastError('INSUFFICIENT_DATA', `History has ${costs.length} records but regression methods require at least 3`);
    }
    // Validate options
    if (horizon < 1) {
        throw new errors_js_1.ForecastError('INVALID_OPTIONS', 'Horizon must be at least 1');
    }
    for (const level of confidenceLevels) {
        if (level <= 0 || level >= 1) {
            throw new errors_js_1.ForecastError('INVALID_OPTIONS', `Confidence level ${level} must be between 0 and 1 (exclusive)`);
        }
    }
    // Generate future dates
    const lastDate = records[records.length - 1].date;
    const futureDates = (0, normalize_js_1.getNextDates)(lastDate, horizon);
    let predictions;
    let fit;
    switch (method) {
        case 'sma':
            predictions = (0, sma_js_1.computeSma)({
                costs,
                window: effectiveWindow,
                horizon,
                confidenceLevels,
                dates: futureDates,
                floor,
            });
            break;
        case 'ema': {
            const emaResult = (0, ema_js_1.computeEma)({
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
            predictions = (0, wma_js_1.computeWma)({
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
            const olsResult = (0, ols_js_1.computeOls)({
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
            const wlsResult = (0, wls_js_1.computeWls)({
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
            throw new errors_js_1.ForecastError('INVALID_OPTIONS', `Unknown method: ${method}`);
    }
    const summary = computeSummary(predictions, confidenceLevels);
    const result = {
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
function computeSummary(predictions, confidenceLevels) {
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
//# sourceMappingURL=forecast.js.map