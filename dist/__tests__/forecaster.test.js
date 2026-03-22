"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const forecaster_js_1 = require("../forecaster.js");
const errors_js_1 = require("../errors.js");
function makeHistory(days, baseCost = 100, increment = 0) {
    return Array.from({ length: days }, (_, i) => {
        const date = `2026-03-${String(1 + i).padStart(2, '0')}`;
        return [date, baseCost + increment * i];
    });
}
(0, vitest_1.describe)('createForecaster', () => {
    (0, vitest_1.it)('creates a forecaster with default options', () => {
        const forecaster = (0, forecaster_js_1.createForecaster)({});
        (0, vitest_1.expect)(forecaster).toBeDefined();
        (0, vitest_1.expect)(forecaster.load).toBeDefined();
        (0, vitest_1.expect)(forecaster.append).toBeDefined();
        (0, vitest_1.expect)(forecaster.forecast).toBeDefined();
        (0, vitest_1.expect)(forecaster.detectTrend).toBeDefined();
        (0, vitest_1.expect)(forecaster.checkBudget).toBeDefined();
        (0, vitest_1.expect)(forecaster.getHistory).toBeDefined();
        (0, vitest_1.expect)(forecaster.reset).toBeDefined();
    });
    (0, vitest_1.describe)('load', () => {
        (0, vitest_1.it)('loads history data', () => {
            const forecaster = (0, forecaster_js_1.createForecaster)({});
            forecaster.load(makeHistory(14));
            (0, vitest_1.expect)(forecaster.getHistory()).toHaveLength(14);
        });
        (0, vitest_1.it)('replaces previously loaded data', () => {
            const forecaster = (0, forecaster_js_1.createForecaster)({});
            forecaster.load(makeHistory(14));
            forecaster.load(makeHistory(7));
            (0, vitest_1.expect)(forecaster.getHistory()).toHaveLength(7);
        });
    });
    (0, vitest_1.describe)('append', () => {
        (0, vitest_1.it)('appends a single record', () => {
            const forecaster = (0, forecaster_js_1.createForecaster)({});
            forecaster.load(makeHistory(14));
            forecaster.append({ date: '2026-03-15', cost: 120 });
            (0, vitest_1.expect)(forecaster.getHistory()).toHaveLength(15);
        });
        (0, vitest_1.it)('appends multiple records', () => {
            const forecaster = (0, forecaster_js_1.createForecaster)({});
            forecaster.load(makeHistory(14));
            forecaster.append([
                { date: '2026-03-15', cost: 120 },
                { date: '2026-03-16', cost: 130 },
            ]);
            (0, vitest_1.expect)(forecaster.getHistory()).toHaveLength(16);
        });
    });
    (0, vitest_1.describe)('forecast', () => {
        (0, vitest_1.it)('uses pre-configured options', () => {
            const forecaster = (0, forecaster_js_1.createForecaster)({ method: 'sma', horizon: 5 });
            forecaster.load(makeHistory(14));
            const result = forecaster.forecast();
            (0, vitest_1.expect)(result.method).toBe('sma');
            (0, vitest_1.expect)(result.horizon).toBe(5);
        });
        (0, vitest_1.it)('allows overrides', () => {
            const forecaster = (0, forecaster_js_1.createForecaster)({ method: 'sma', horizon: 5 });
            forecaster.load(makeHistory(14));
            const result = forecaster.forecast({ horizon: 3 });
            (0, vitest_1.expect)(result.horizon).toBe(3);
        });
        (0, vitest_1.it)('throws if no history loaded', () => {
            const forecaster = (0, forecaster_js_1.createForecaster)({});
            (0, vitest_1.expect)(() => forecaster.forecast()).toThrow(errors_js_1.ForecastError);
        });
    });
    (0, vitest_1.describe)('detectTrend', () => {
        (0, vitest_1.it)('detects trend in loaded data', () => {
            const forecaster = (0, forecaster_js_1.createForecaster)({});
            forecaster.load(makeHistory(14, 100, 10));
            const trend = forecaster.detectTrend();
            (0, vitest_1.expect)(trend.direction).toBe('increasing');
        });
        (0, vitest_1.it)('throws if no history loaded', () => {
            const forecaster = (0, forecaster_js_1.createForecaster)({});
            (0, vitest_1.expect)(() => forecaster.detectTrend()).toThrow(errors_js_1.ForecastError);
        });
    });
    (0, vitest_1.describe)('checkBudget', () => {
        (0, vitest_1.it)('checks budget with pre-configured budget', () => {
            const forecaster = (0, forecaster_js_1.createForecaster)({
                budget: {
                    amount: 5000,
                    periodStart: '2026-03-01',
                    periodEnd: '2026-03-31',
                },
            });
            forecaster.load(makeHistory(14, 100));
            const alert = forecaster.checkBudget();
            (0, vitest_1.expect)(alert.budgetAmount).toBe(5000);
            (0, vitest_1.expect)(alert.status).toBeDefined();
        });
        (0, vitest_1.it)('allows budget overrides', () => {
            const forecaster = (0, forecaster_js_1.createForecaster)({
                budget: { amount: 5000, periodStart: '2026-03-01', periodEnd: '2026-03-31' },
            });
            forecaster.load(makeHistory(14, 100));
            const alert = forecaster.checkBudget({ amount: 3000 });
            (0, vitest_1.expect)(alert.budgetAmount).toBe(3000);
        });
        (0, vitest_1.it)('throws if no budget configured and no override', () => {
            const forecaster = (0, forecaster_js_1.createForecaster)({});
            forecaster.load(makeHistory(14, 100));
            (0, vitest_1.expect)(() => forecaster.checkBudget()).toThrow(errors_js_1.ForecastError);
        });
        (0, vitest_1.it)('throws if no history loaded', () => {
            const forecaster = (0, forecaster_js_1.createForecaster)({
                budget: { amount: 5000 },
            });
            (0, vitest_1.expect)(() => forecaster.checkBudget()).toThrow(errors_js_1.ForecastError);
        });
    });
    (0, vitest_1.describe)('reset', () => {
        (0, vitest_1.it)('clears all data', () => {
            const forecaster = (0, forecaster_js_1.createForecaster)({});
            forecaster.load(makeHistory(14));
            (0, vitest_1.expect)(forecaster.getHistory()).toHaveLength(14);
            forecaster.reset();
            (0, vitest_1.expect)(forecaster.getHistory()).toHaveLength(0);
        });
    });
    (0, vitest_1.describe)('getHistory', () => {
        (0, vitest_1.it)('returns a copy of the history', () => {
            const forecaster = (0, forecaster_js_1.createForecaster)({});
            forecaster.load(makeHistory(14));
            const h1 = forecaster.getHistory();
            const h2 = forecaster.getHistory();
            (0, vitest_1.expect)(h1).toEqual(h2);
            (0, vitest_1.expect)(h1).not.toBe(h2); // Different references
        });
    });
    (0, vitest_1.describe)('stateful workflow', () => {
        (0, vitest_1.it)('supports load -> forecast -> append -> forecast cycle', () => {
            const forecaster = (0, forecaster_js_1.createForecaster)({ method: 'sma', horizon: 3 });
            forecaster.load(makeHistory(14, 100));
            const r1 = forecaster.forecast();
            (0, vitest_1.expect)(r1.predictions).toHaveLength(3);
            forecaster.append({ date: '2026-03-15', cost: 200 });
            const r2 = forecaster.forecast();
            (0, vitest_1.expect)(r2.predictions).toHaveLength(3);
            (0, vitest_1.expect)(r2.history).toHaveLength(15);
        });
    });
});
//# sourceMappingURL=forecaster.test.js.map