"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const chart_js_1 = require("../chart.js");
const forecast_js_1 = require("../forecast.js");
function makeHistory(days, baseCost = 100) {
    return Array.from({ length: days }, (_, i) => {
        const date = `2026-03-${String(1 + i).padStart(2, '0')}`;
        return [date, baseCost + i];
    });
}
(0, vitest_1.describe)('toChartData', () => {
    (0, vitest_1.it)('combines history and predictions', () => {
        const result = (0, forecast_js_1.forecast)(makeHistory(14), { method: 'sma', horizon: 7 });
        const chartData = (0, chart_js_1.toChartData)(result);
        (0, vitest_1.expect)(chartData).toHaveLength(21); // 14 history + 7 predictions
    });
    (0, vitest_1.it)('marks history points with actual, null predicted', () => {
        const result = (0, forecast_js_1.forecast)(makeHistory(14), { method: 'sma', horizon: 7 });
        const chartData = (0, chart_js_1.toChartData)(result);
        const historyPoint = chartData[0];
        (0, vitest_1.expect)(historyPoint.actual).not.toBeNull();
        (0, vitest_1.expect)(historyPoint.predicted).toBeNull();
        (0, vitest_1.expect)(historyPoint.upperBound).toBeNull();
        (0, vitest_1.expect)(historyPoint.lowerBound).toBeNull();
    });
    (0, vitest_1.it)('marks forecast points with predicted, null actual', () => {
        const result = (0, forecast_js_1.forecast)(makeHistory(14), { method: 'sma', horizon: 7 });
        const chartData = (0, chart_js_1.toChartData)(result);
        const forecastPoint = chartData[14];
        (0, vitest_1.expect)(forecastPoint.actual).toBeNull();
        (0, vitest_1.expect)(forecastPoint.predicted).not.toBeNull();
        (0, vitest_1.expect)(forecastPoint.upperBound).not.toBeNull();
        (0, vitest_1.expect)(forecastPoint.lowerBound).not.toBeNull();
    });
    (0, vitest_1.it)('uses specified confidence level for bounds', () => {
        const result = (0, forecast_js_1.forecast)(makeHistory(14), { method: 'sma', horizon: 7, confidenceLevels: [0.80, 0.95] });
        const chartData80 = (0, chart_js_1.toChartData)(result, { confidenceLevel: 0.80 });
        const chartData95 = (0, chart_js_1.toChartData)(result, { confidenceLevel: 0.95 });
        const forecast80 = chartData80[14];
        const forecast95 = chartData95[14];
        // 95% bounds should be wider
        const width80 = (forecast80.upperBound ?? 0) - (forecast80.lowerBound ?? 0);
        const width95 = (forecast95.upperBound ?? 0) - (forecast95.lowerBound ?? 0);
        (0, vitest_1.expect)(width95).toBeGreaterThan(width80);
    });
    (0, vitest_1.it)('defaults to highest confidence level', () => {
        const result = (0, forecast_js_1.forecast)(makeHistory(14), { method: 'sma', horizon: 7, confidenceLevels: [0.80, 0.95] });
        const chartData = (0, chart_js_1.toChartData)(result);
        // Should use 0.95 by default
        const forecastPoint = chartData[14];
        const bound95 = result.predictions[0].bounds.find(b => b.level === 0.95);
        (0, vitest_1.expect)(forecastPoint.upperBound).toBe(bound95.upper);
    });
    (0, vitest_1.it)('excludes history when includeHistory is false', () => {
        const result = (0, forecast_js_1.forecast)(makeHistory(14), { method: 'sma', horizon: 7 });
        const chartData = (0, chart_js_1.toChartData)(result, { includeHistory: false });
        (0, vitest_1.expect)(chartData).toHaveLength(7); // Only predictions
        (0, vitest_1.expect)(chartData[0].actual).toBeNull();
        (0, vitest_1.expect)(chartData[0].predicted).not.toBeNull();
    });
    (0, vitest_1.it)('preserves date ordering', () => {
        const result = (0, forecast_js_1.forecast)(makeHistory(14), { method: 'sma', horizon: 7 });
        const chartData = (0, chart_js_1.toChartData)(result);
        for (let i = 1; i < chartData.length; i++) {
            (0, vitest_1.expect)(chartData[i].date > chartData[i - 1].date).toBe(true);
        }
    });
    (0, vitest_1.it)('handles single confidence level', () => {
        const result = (0, forecast_js_1.forecast)(makeHistory(14), { method: 'sma', horizon: 3, confidenceLevels: [0.90] });
        const chartData = (0, chart_js_1.toChartData)(result);
        const forecastPoint = chartData[14];
        (0, vitest_1.expect)(forecastPoint.upperBound).not.toBeNull();
        (0, vitest_1.expect)(forecastPoint.lowerBound).not.toBeNull();
    });
});
//# sourceMappingURL=chart.test.js.map