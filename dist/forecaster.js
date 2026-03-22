"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createForecaster = createForecaster;
const errors_js_1 = require("./errors.js");
const normalize_js_1 = require("./normalize.js");
const forecast_js_1 = require("./forecast.js");
const trend_js_1 = require("./trend.js");
const budget_js_1 = require("./budget.js");
/**
 * Factory function that returns a stateful forecaster instance
 * with pre-configured settings.
 */
function createForecaster(config) {
    let history = [];
    const defaultOptions = {
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
        load(input) {
            history = (0, normalize_js_1.normalizeHistory)(input);
        },
        append(records) {
            const toAppend = Array.isArray(records) ? records : [records];
            history = [...history, ...toAppend];
        },
        forecast(overrides) {
            if (history.length === 0) {
                throw new errors_js_1.ForecastError('INVALID_HISTORY', 'No history loaded. Call load() first.');
            }
            return (0, forecast_js_1.forecast)(history, { ...defaultOptions, ...overrides });
        },
        detectTrend(overrides) {
            if (history.length === 0) {
                throw new errors_js_1.ForecastError('INVALID_HISTORY', 'No history loaded. Call load() first.');
            }
            return (0, trend_js_1.detectTrend)(history, overrides);
        },
        checkBudget(overrides) {
            if (history.length === 0) {
                throw new errors_js_1.ForecastError('INVALID_HISTORY', 'No history loaded. Call load() first.');
            }
            const budgetConfig = { ...config.budget, ...overrides };
            if (!budgetConfig || !budgetConfig.amount) {
                throw new errors_js_1.ForecastError('INVALID_BUDGET', 'No budget configured. Provide budget in config or overrides.');
            }
            return (0, budget_js_1.alertOnBudget)(history, budgetConfig, defaultOptions);
        },
        getHistory() {
            return [...history];
        },
        reset() {
            history = [];
        },
    };
}
//# sourceMappingURL=forecaster.js.map