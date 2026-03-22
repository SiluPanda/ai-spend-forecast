"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const forecast_js_1 = require("../forecast.js");
const errors_js_1 = require("../errors.js");
function makeHistory(days, baseCost = 100, increment = 0) {
    return Array.from({ length: days }, (_, i) => {
        const date = `2026-03-${String(1 + i).padStart(2, '0')}`;
        return [date, baseCost + increment * i];
    });
}
(0, vitest_1.describe)('forecast', () => {
    (0, vitest_1.describe)('input handling', () => {
        (0, vitest_1.it)('accepts tuple input', () => {
            const result = (0, forecast_js_1.forecast)(makeHistory(14), { method: 'sma', horizon: 7 });
            (0, vitest_1.expect)(result.predictions).toHaveLength(7);
        });
        (0, vitest_1.it)('accepts object input', () => {
            const history = makeHistory(14).map(([date, cost]) => ({ date, cost }));
            const result = (0, forecast_js_1.forecast)(history, { method: 'sma', horizon: 7 });
            (0, vitest_1.expect)(result.predictions).toHaveLength(7);
        });
        (0, vitest_1.it)('accepts map input', () => {
            const map = {};
            for (let i = 1; i <= 14; i++) {
                map[`2026-03-${String(i).padStart(2, '0')}`] = 100 + i;
            }
            const result = (0, forecast_js_1.forecast)(map, { method: 'sma', horizon: 7 });
            (0, vitest_1.expect)(result.predictions).toHaveLength(7);
        });
        (0, vitest_1.it)('throws on empty input', () => {
            (0, vitest_1.expect)(() => (0, forecast_js_1.forecast)([])).toThrow(errors_js_1.ForecastError);
        });
        (0, vitest_1.it)('throws on insufficient data for SMA', () => {
            (0, vitest_1.expect)(() => (0, forecast_js_1.forecast)(makeHistory(3), { method: 'sma', window: 7 })).toThrow(errors_js_1.ForecastError);
            try {
                (0, forecast_js_1.forecast)(makeHistory(3), { method: 'sma', window: 7 });
            }
            catch (e) {
                (0, vitest_1.expect)(e.code).toBe('INSUFFICIENT_DATA');
            }
        });
        (0, vitest_1.it)('throws on insufficient data for regression', () => {
            (0, vitest_1.expect)(() => (0, forecast_js_1.forecast)(makeHistory(2), { method: 'ols' })).toThrow(errors_js_1.ForecastError);
            try {
                (0, forecast_js_1.forecast)(makeHistory(2), { method: 'ols' });
            }
            catch (e) {
                (0, vitest_1.expect)(e.code).toBe('INSUFFICIENT_DATA');
            }
        });
        (0, vitest_1.it)('throws on invalid horizon', () => {
            (0, vitest_1.expect)(() => (0, forecast_js_1.forecast)(makeHistory(14), { horizon: 0 })).toThrow(errors_js_1.ForecastError);
            try {
                (0, forecast_js_1.forecast)(makeHistory(14), { horizon: 0 });
            }
            catch (e) {
                (0, vitest_1.expect)(e.code).toBe('INVALID_OPTIONS');
            }
        });
        (0, vitest_1.it)('throws on invalid confidence level', () => {
            (0, vitest_1.expect)(() => (0, forecast_js_1.forecast)(makeHistory(14), { confidenceLevels: [1.5] })).toThrow(errors_js_1.ForecastError);
            try {
                (0, forecast_js_1.forecast)(makeHistory(14), { confidenceLevels: [1.5] });
            }
            catch (e) {
                (0, vitest_1.expect)(e.code).toBe('INVALID_OPTIONS');
            }
        });
        (0, vitest_1.it)('throws on confidence level of 0', () => {
            (0, vitest_1.expect)(() => (0, forecast_js_1.forecast)(makeHistory(14), { confidenceLevels: [0] })).toThrow(errors_js_1.ForecastError);
            try {
                (0, forecast_js_1.forecast)(makeHistory(14), { confidenceLevels: [0] });
            }
            catch (e) {
                (0, vitest_1.expect)(e.code).toBe('INVALID_OPTIONS');
            }
        });
    });
    (0, vitest_1.describe)('defaults', () => {
        (0, vitest_1.it)('defaults to EMA method', () => {
            const result = (0, forecast_js_1.forecast)(makeHistory(14));
            (0, vitest_1.expect)(result.method).toBe('ema');
        });
        (0, vitest_1.it)('defaults to horizon 14', () => {
            const result = (0, forecast_js_1.forecast)(makeHistory(14));
            (0, vitest_1.expect)(result.horizon).toBe(14);
        });
        (0, vitest_1.it)('defaults to window 7 for MA methods', () => {
            const result = (0, forecast_js_1.forecast)(makeHistory(14), { method: 'sma' });
            (0, vitest_1.expect)(result.window).toBe(7);
        });
        (0, vitest_1.it)('defaults confidence levels to [0.80, 0.95]', () => {
            const result = (0, forecast_js_1.forecast)(makeHistory(14));
            const levels = result.predictions[0].bounds.map(b => b.level);
            (0, vitest_1.expect)(levels).toEqual([0.80, 0.95]);
        });
    });
    (0, vitest_1.describe)('SMA method', () => {
        (0, vitest_1.it)('produces flat-line forecast', () => {
            const result = (0, forecast_js_1.forecast)(makeHistory(14, 100, 0), { method: 'sma', horizon: 5 });
            const values = result.predictions.map(p => p.predicted);
            // All values should be the same
            (0, vitest_1.expect)(new Set(values).size).toBe(1);
        });
        (0, vitest_1.it)('forecast value is mean of window', () => {
            const history = makeHistory(14, 100, 0);
            const result = (0, forecast_js_1.forecast)(history, { method: 'sma', window: 7, horizon: 1 });
            (0, vitest_1.expect)(result.predictions[0].predicted).toBeCloseTo(100, 0);
        });
    });
    (0, vitest_1.describe)('EMA method', () => {
        (0, vitest_1.it)('produces flat-line forecast', () => {
            const result = (0, forecast_js_1.forecast)(makeHistory(14, 100, 5), { method: 'ema', horizon: 3 });
            const values = result.predictions.map(p => p.predicted);
            (0, vitest_1.expect)(new Set(values).size).toBe(1);
        });
        (0, vitest_1.it)('responds to recent data', () => {
            // Stable then spike
            const history = [];
            for (let i = 0; i < 13; i++) {
                history.push([`2026-03-${String(i + 1).padStart(2, '0')}`, 100]);
            }
            history.push(['2026-03-14', 200]);
            const result = (0, forecast_js_1.forecast)(history, { method: 'ema', horizon: 1 });
            (0, vitest_1.expect)(result.predictions[0].predicted).toBeGreaterThan(100);
        });
    });
    (0, vitest_1.describe)('WMA method', () => {
        (0, vitest_1.it)('weights recent values more heavily', () => {
            const history = makeHistory(14, 100, 10); // increasing trend
            const smaResult = (0, forecast_js_1.forecast)(history, { method: 'sma', horizon: 1 });
            const wmaResult = (0, forecast_js_1.forecast)(history, { method: 'wma', horizon: 1 });
            // WMA should be higher for increasing data
            (0, vitest_1.expect)(wmaResult.predictions[0].predicted).toBeGreaterThan(smaResult.predictions[0].predicted);
        });
    });
    (0, vitest_1.describe)('OLS method', () => {
        (0, vitest_1.it)('extrapolates linear trend', () => {
            const history = makeHistory(14, 100, 10); // 100, 110, 120, ..., 230
            const result = (0, forecast_js_1.forecast)(history, { method: 'ols', horizon: 3 });
            // Next values should continue the trend
            (0, vitest_1.expect)(result.predictions[0].predicted).toBeCloseTo(240, 0);
            (0, vitest_1.expect)(result.predictions[1].predicted).toBeCloseTo(250, 0);
        });
        (0, vitest_1.it)('includes fit statistics', () => {
            const result = (0, forecast_js_1.forecast)(makeHistory(14, 100, 10), { method: 'ols', horizon: 1 });
            (0, vitest_1.expect)(result.fit).toBeDefined();
            (0, vitest_1.expect)(result.fit.rSquared).toBeCloseTo(1, 5);
            (0, vitest_1.expect)(result.fit.slope).toBeCloseTo(10, 5);
        });
    });
    (0, vitest_1.describe)('WLS method', () => {
        (0, vitest_1.it)('produces forecasts', () => {
            const result = (0, forecast_js_1.forecast)(makeHistory(14, 100, 5), { method: 'wls', horizon: 5 });
            (0, vitest_1.expect)(result.predictions).toHaveLength(5);
            (0, vitest_1.expect)(result.fit).toBeDefined();
        });
        (0, vitest_1.it)('respects decay parameter', () => {
            const history = makeHistory(14, 100, 5);
            const r1 = (0, forecast_js_1.forecast)(history, { method: 'wls', horizon: 1, decay: 0.5 });
            const r2 = (0, forecast_js_1.forecast)(history, { method: 'wls', horizon: 1, decay: 0.99 });
            // Different decay values should produce different predictions
            (0, vitest_1.expect)(r1.predictions[0].predicted).not.toEqual(r2.predictions[0].predicted);
        });
    });
    (0, vitest_1.describe)('result structure', () => {
        (0, vitest_1.it)('includes all expected fields', () => {
            const result = (0, forecast_js_1.forecast)(makeHistory(14), { method: 'ema', horizon: 7 });
            (0, vitest_1.expect)(result.method).toBe('ema');
            (0, vitest_1.expect)(result.horizon).toBe(7);
            (0, vitest_1.expect)(result.window).toBeGreaterThan(0);
            (0, vitest_1.expect)(result.predictions).toHaveLength(7);
            (0, vitest_1.expect)(result.history).toHaveLength(14);
            (0, vitest_1.expect)(result.summary).toBeDefined();
        });
        (0, vitest_1.it)('predictions have correct dates', () => {
            const history = makeHistory(14);
            const result = (0, forecast_js_1.forecast)(history, { method: 'sma', horizon: 3 });
            (0, vitest_1.expect)(result.predictions[0].date).toBe('2026-03-15');
            (0, vitest_1.expect)(result.predictions[1].date).toBe('2026-03-16');
            (0, vitest_1.expect)(result.predictions[2].date).toBe('2026-03-17');
        });
        (0, vitest_1.it)('summary has correct totals', () => {
            const result = (0, forecast_js_1.forecast)(makeHistory(14, 100, 0), { method: 'sma', horizon: 7 });
            (0, vitest_1.expect)(result.summary.totalPredicted).toBeCloseTo(result.summary.averagePredicted * 7, 1);
            (0, vitest_1.expect)(result.summary.minPredicted).toBeLessThanOrEqual(result.summary.maxPredicted);
            (0, vitest_1.expect)(result.summary.totalLowerBound).toBeLessThanOrEqual(result.summary.totalPredicted);
            (0, vitest_1.expect)(result.summary.totalUpperBound).toBeGreaterThanOrEqual(result.summary.totalPredicted);
        });
        (0, vitest_1.it)('bounds are nested by confidence level', () => {
            // Use noisy data so EMA has non-zero residual variance
            const noisy = [100, 112, 95, 130, 108, 125, 97, 140, 115, 128, 102, 135, 110, 120];
            const history = noisy.map((cost, i) => [
                `2026-03-${String(1 + i).padStart(2, '0')}`, cost,
            ]);
            const result = (0, forecast_js_1.forecast)(history, { confidenceLevels: [0.80, 0.95] });
            const bounds = result.predictions[0].bounds;
            (0, vitest_1.expect)(bounds).toHaveLength(2);
            const b80 = bounds.find(b => b.level === 0.80);
            const b95 = bounds.find(b => b.level === 0.95);
            // 95% bounds should be wider than 80%
            (0, vitest_1.expect)(b95.upper - b95.lower).toBeGreaterThan(b80.upper - b80.lower);
        });
    });
    (0, vitest_1.describe)('edge cases', () => {
        (0, vitest_1.it)('handles minimal data (3 records) for regression', () => {
            const result = (0, forecast_js_1.forecast)(makeHistory(3, 100, 10), { method: 'ols', horizon: 1 });
            (0, vitest_1.expect)(result.predictions).toHaveLength(1);
            (0, vitest_1.expect)(result.predictions[0].predicted).toBeCloseTo(130, 0);
        });
        (0, vitest_1.it)('handles single confidence level', () => {
            const result = (0, forecast_js_1.forecast)(makeHistory(14), { confidenceLevels: [0.90] });
            (0, vitest_1.expect)(result.predictions[0].bounds).toHaveLength(1);
            (0, vitest_1.expect)(result.predictions[0].bounds[0].level).toBe(0.90);
        });
        (0, vitest_1.it)('handles constant values', () => {
            const result = (0, forecast_js_1.forecast)(makeHistory(14, 50, 0), { method: 'sma', horizon: 5 });
            (0, vitest_1.expect)(result.predictions[0].predicted).toBeCloseTo(50, 0);
        });
        (0, vitest_1.it)('handles large horizon', () => {
            const result = (0, forecast_js_1.forecast)(makeHistory(14), { horizon: 365 });
            (0, vitest_1.expect)(result.predictions).toHaveLength(365);
        });
        (0, vitest_1.it)('clamps window to data length for MA', () => {
            // Window 7 but only 7 data points (need at least window)
            const result = (0, forecast_js_1.forecast)(makeHistory(7, 100, 0), { method: 'sma', window: 7, horizon: 1 });
            (0, vitest_1.expect)(result.predictions).toHaveLength(1);
        });
    });
});
//# sourceMappingURL=forecast.test.js.map