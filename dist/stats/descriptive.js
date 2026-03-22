"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mean = mean;
exports.sum = sum;
exports.variance = variance;
exports.standardDeviation = standardDeviation;
exports.covariance = covariance;
exports.weightedMean = weightedMean;
/** Compute the arithmetic mean of an array of numbers. */
function mean(values) {
    if (values.length === 0)
        return 0;
    return sum(values) / values.length;
}
/** Compute the sum of an array of numbers. */
function sum(values) {
    let total = 0;
    for (const v of values)
        total += v;
    return total;
}
/** Compute the population variance of an array. */
function variance(values, population = true) {
    if (values.length < 2)
        return 0;
    const m = mean(values);
    let ss = 0;
    for (const v of values)
        ss += (v - m) ** 2;
    return ss / (population ? values.length : values.length - 1);
}
/** Compute the standard deviation. */
function standardDeviation(values, population = true) {
    return Math.sqrt(variance(values, population));
}
/** Compute the covariance of two arrays. */
function covariance(xs, ys, population = true) {
    if (xs.length !== ys.length || xs.length < 2)
        return 0;
    const mx = mean(xs);
    const my = mean(ys);
    let cov = 0;
    for (let i = 0; i < xs.length; i++) {
        cov += (xs[i] - mx) * (ys[i] - my);
    }
    return cov / (population ? xs.length : xs.length - 1);
}
/** Compute the weighted mean. */
function weightedMean(values, weights) {
    if (values.length === 0 || values.length !== weights.length)
        return 0;
    let wSum = 0;
    let vwSum = 0;
    for (let i = 0; i < values.length; i++) {
        vwSum += values[i] * weights[i];
        wSum += weights[i];
    }
    return wSum === 0 ? 0 : vwSum / wSum;
}
//# sourceMappingURL=descriptive.js.map