import { describe, it, expect } from 'vitest';
import { toChartData } from '../chart.js';
import { forecast } from '../forecast.js';

function makeHistory(days: number, baseCost = 100): Array<[string, number]> {
  return Array.from({ length: days }, (_, i) => {
    const date = `2026-03-${String(1 + i).padStart(2, '0')}`;
    return [date, baseCost + i] as [string, number];
  });
}

describe('toChartData', () => {
  it('combines history and predictions', () => {
    const result = forecast(makeHistory(14), { method: 'sma', horizon: 7 });
    const chartData = toChartData(result);

    expect(chartData).toHaveLength(21); // 14 history + 7 predictions
  });

  it('marks history points with actual, null predicted', () => {
    const result = forecast(makeHistory(14), { method: 'sma', horizon: 7 });
    const chartData = toChartData(result);

    const historyPoint = chartData[0];
    expect(historyPoint.actual).not.toBeNull();
    expect(historyPoint.predicted).toBeNull();
    expect(historyPoint.upperBound).toBeNull();
    expect(historyPoint.lowerBound).toBeNull();
  });

  it('marks forecast points with predicted, null actual', () => {
    const result = forecast(makeHistory(14), { method: 'sma', horizon: 7 });
    const chartData = toChartData(result);

    const forecastPoint = chartData[14];
    expect(forecastPoint.actual).toBeNull();
    expect(forecastPoint.predicted).not.toBeNull();
    expect(forecastPoint.upperBound).not.toBeNull();
    expect(forecastPoint.lowerBound).not.toBeNull();
  });

  it('uses specified confidence level for bounds', () => {
    const result = forecast(makeHistory(14), { method: 'sma', horizon: 7, confidenceLevels: [0.80, 0.95] });
    const chartData80 = toChartData(result, { confidenceLevel: 0.80 });
    const chartData95 = toChartData(result, { confidenceLevel: 0.95 });

    const forecast80 = chartData80[14];
    const forecast95 = chartData95[14];

    // 95% bounds should be wider
    const width80 = (forecast80.upperBound ?? 0) - (forecast80.lowerBound ?? 0);
    const width95 = (forecast95.upperBound ?? 0) - (forecast95.lowerBound ?? 0);
    expect(width95).toBeGreaterThan(width80);
  });

  it('defaults to highest confidence level', () => {
    const result = forecast(makeHistory(14), { method: 'sma', horizon: 7, confidenceLevels: [0.80, 0.95] });
    const chartData = toChartData(result);

    // Should use 0.95 by default
    const forecastPoint = chartData[14];
    const bound95 = result.predictions[0].bounds.find(b => b.level === 0.95)!;
    expect(forecastPoint.upperBound).toBe(bound95.upper);
  });

  it('excludes history when includeHistory is false', () => {
    const result = forecast(makeHistory(14), { method: 'sma', horizon: 7 });
    const chartData = toChartData(result, { includeHistory: false });

    expect(chartData).toHaveLength(7); // Only predictions
    expect(chartData[0].actual).toBeNull();
    expect(chartData[0].predicted).not.toBeNull();
  });

  it('preserves date ordering', () => {
    const result = forecast(makeHistory(14), { method: 'sma', horizon: 7 });
    const chartData = toChartData(result);

    for (let i = 1; i < chartData.length; i++) {
      expect(chartData[i].date > chartData[i - 1].date).toBe(true);
    }
  });

  it('handles single confidence level', () => {
    const result = forecast(makeHistory(14), { method: 'sma', horizon: 3, confidenceLevels: [0.90] });
    const chartData = toChartData(result);

    const forecastPoint = chartData[14];
    expect(forecastPoint.upperBound).not.toBeNull();
    expect(forecastPoint.lowerBound).not.toBeNull();
  });
});
