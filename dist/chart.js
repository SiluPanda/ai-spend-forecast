"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toChartData = toChartData;
/**
 * Convert a ForecastResult into chart-ready data points.
 */
function toChartData(result, options) {
    const includeHistory = options?.includeHistory ?? true;
    const confidenceLevels = result.predictions[0]?.bounds.map(b => b.level) ?? [];
    const confidenceLevel = options?.confidenceLevel ?? (confidenceLevels.length > 0 ? Math.max(...confidenceLevels) : 0.95);
    const points = [];
    if (includeHistory) {
        for (const record of result.history) {
            points.push({
                date: record.date,
                actual: record.cost ?? 0,
                predicted: null,
                upperBound: null,
                lowerBound: null,
            });
        }
    }
    for (const prediction of result.predictions) {
        const bound = prediction.bounds.find(b => b.level === confidenceLevel);
        points.push({
            date: prediction.date,
            actual: null,
            predicted: prediction.predicted,
            upperBound: bound?.upper ?? null,
            lowerBound: bound?.lower ?? null,
        });
    }
    return points;
}
//# sourceMappingURL=chart.js.map