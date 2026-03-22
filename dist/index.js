"use strict";
// ai-spend-forecast - Predict future AI API spending from historical usage
Object.defineProperty(exports, "__esModule", { value: true });
exports.ForecastError = exports.toChartData = exports.normalizeHistory = exports.createForecaster = exports.alertOnBudget = exports.detectTrend = exports.forecast = void 0;
// Core functions
var forecast_js_1 = require("./forecast.js");
Object.defineProperty(exports, "forecast", { enumerable: true, get: function () { return forecast_js_1.forecast; } });
var trend_js_1 = require("./trend.js");
Object.defineProperty(exports, "detectTrend", { enumerable: true, get: function () { return trend_js_1.detectTrend; } });
var budget_js_1 = require("./budget.js");
Object.defineProperty(exports, "alertOnBudget", { enumerable: true, get: function () { return budget_js_1.alertOnBudget; } });
var forecaster_js_1 = require("./forecaster.js");
Object.defineProperty(exports, "createForecaster", { enumerable: true, get: function () { return forecaster_js_1.createForecaster; } });
var normalize_js_1 = require("./normalize.js");
Object.defineProperty(exports, "normalizeHistory", { enumerable: true, get: function () { return normalize_js_1.normalizeHistory; } });
var chart_js_1 = require("./chart.js");
Object.defineProperty(exports, "toChartData", { enumerable: true, get: function () { return chart_js_1.toChartData; } });
// Errors
var errors_js_1 = require("./errors.js");
Object.defineProperty(exports, "ForecastError", { enumerable: true, get: function () { return errors_js_1.ForecastError; } });
//# sourceMappingURL=index.js.map