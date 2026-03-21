# ai-spend-forecast

Predict future AI API spending from historical usage data using moving averages, linear regression, and confidence intervals.

## Install

```bash
npm install ai-spend-forecast
```

## Quick Start

```typescript
import { forecast } from 'ai-spend-forecast';

const history = [
  { date: '2024-01-01', cost: 45.20 },
  { date: '2024-01-02', cost: 52.10 },
  { date: '2024-01-03', cost: 48.90 },
  // ... more daily records
];

const result = forecast(history, {
  horizon: 14,           // predict 14 days ahead
  method: 'auto',        // auto-select best method
  confidenceLevel: 0.95, // 95% confidence intervals
  budgetLimit: 1000,     // alert if projected spend exceeds $1000
});

console.log(result.trend);         // { direction: 'increasing', slope, r2 }
console.log(result.totalPredicted); // projected total spend
console.log(result.budgetAlert);   // { exceeded, daysUntilExceeded, overage }
```

## API

### `forecast(history, options?): ForecastResult`

Main forecasting function.

- `history` — Array of `{ date, cost }` records
- `options.horizon` — Days to forecast (default: 7)
- `options.method` — `'auto' | 'sma' | 'wma' | 'ema' | 'linear'`
- `options.confidenceLevel` — 0.90, 0.95, or 0.99
- `options.budgetLimit` — Dollar threshold for budget alerts

### Forecasting Methods

- **SMA** — Simple moving average
- **WMA** — Weighted moving average (recent data weighted higher)
- **EMA** — Exponential moving average
- **Linear** — Ordinary least squares regression with confidence intervals
- **Auto** — Selects best method based on data characteristics

## License

MIT
