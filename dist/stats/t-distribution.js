"use strict";
/**
 * T-distribution critical value lookup table.
 * Keys: degrees of freedom. Values: map of two-tailed alpha to critical value.
 * For prediction intervals, we need one-tailed alpha = (1 - confidenceLevel) / 2.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.tCritical = tCritical;
exports.tPValue = tPValue;
// Table of t-critical values for common df and two-tailed alpha levels.
// alpha represents the total area in both tails.
const T_TABLE = {
    // df: { alpha: t-critical }
    1: { 0.20: 3.078, 0.10: 6.314, 0.05: 12.706, 0.025: 25.452, 0.02: 31.821, 0.01: 63.657, 0.005: 127.321 },
    2: { 0.20: 1.886, 0.10: 2.920, 0.05: 4.303, 0.025: 6.205, 0.02: 6.965, 0.01: 9.925, 0.005: 14.089 },
    3: { 0.20: 1.638, 0.10: 2.353, 0.05: 3.182, 0.025: 4.177, 0.02: 4.541, 0.01: 5.841, 0.005: 7.453 },
    4: { 0.20: 1.533, 0.10: 2.132, 0.05: 2.776, 0.025: 3.495, 0.02: 3.747, 0.01: 4.604, 0.005: 5.598 },
    5: { 0.20: 1.476, 0.10: 2.015, 0.05: 2.571, 0.025: 3.163, 0.02: 3.365, 0.01: 4.032, 0.005: 4.773 },
    6: { 0.20: 1.440, 0.10: 1.943, 0.05: 2.447, 0.025: 2.969, 0.02: 3.143, 0.01: 3.707, 0.005: 4.317 },
    7: { 0.20: 1.415, 0.10: 1.895, 0.05: 2.365, 0.025: 2.841, 0.02: 2.998, 0.01: 3.499, 0.005: 4.029 },
    8: { 0.20: 1.397, 0.10: 1.860, 0.05: 2.306, 0.025: 2.752, 0.02: 2.896, 0.01: 3.355, 0.005: 3.833 },
    9: { 0.20: 1.383, 0.10: 1.833, 0.05: 2.262, 0.025: 2.685, 0.02: 2.821, 0.01: 3.250, 0.005: 3.690 },
    10: { 0.20: 1.372, 0.10: 1.812, 0.05: 2.228, 0.025: 2.634, 0.02: 2.764, 0.01: 3.169, 0.005: 3.581 },
    11: { 0.20: 1.363, 0.10: 1.796, 0.05: 2.201, 0.025: 2.593, 0.02: 2.718, 0.01: 3.106, 0.005: 3.497 },
    12: { 0.20: 1.356, 0.10: 1.782, 0.05: 2.179, 0.025: 2.560, 0.02: 2.681, 0.01: 3.055, 0.005: 3.428 },
    13: { 0.20: 1.350, 0.10: 1.771, 0.05: 2.160, 0.025: 2.533, 0.02: 2.650, 0.01: 3.012, 0.005: 3.372 },
    14: { 0.20: 1.345, 0.10: 1.761, 0.05: 2.145, 0.025: 2.510, 0.02: 2.624, 0.01: 2.977, 0.005: 3.326 },
    15: { 0.20: 1.341, 0.10: 1.753, 0.05: 2.131, 0.025: 2.490, 0.02: 2.602, 0.01: 2.947, 0.005: 3.286 },
    16: { 0.20: 1.337, 0.10: 1.746, 0.05: 2.120, 0.025: 2.473, 0.02: 2.583, 0.01: 2.921, 0.005: 3.252 },
    17: { 0.20: 1.333, 0.10: 1.740, 0.05: 2.110, 0.025: 2.458, 0.02: 2.567, 0.01: 2.898, 0.005: 3.222 },
    18: { 0.20: 1.330, 0.10: 1.734, 0.05: 2.101, 0.025: 2.445, 0.02: 2.552, 0.01: 2.878, 0.005: 3.197 },
    19: { 0.20: 1.328, 0.10: 1.729, 0.05: 2.093, 0.025: 2.433, 0.02: 2.539, 0.01: 2.861, 0.005: 3.174 },
    20: { 0.20: 1.325, 0.10: 1.725, 0.05: 2.086, 0.025: 2.423, 0.02: 2.528, 0.01: 2.845, 0.005: 3.153 },
    25: { 0.20: 1.316, 0.10: 1.708, 0.05: 2.060, 0.025: 2.385, 0.02: 2.485, 0.01: 2.787, 0.005: 3.078 },
    30: { 0.20: 1.310, 0.10: 1.697, 0.05: 2.042, 0.025: 2.360, 0.02: 2.457, 0.01: 2.750, 0.005: 3.030 },
    40: { 0.20: 1.303, 0.10: 1.684, 0.05: 2.021, 0.025: 2.329, 0.02: 2.423, 0.01: 2.704, 0.005: 2.971 },
    50: { 0.20: 1.299, 0.10: 1.676, 0.05: 2.009, 0.025: 2.311, 0.02: 2.403, 0.01: 2.678, 0.005: 2.937 },
    60: { 0.20: 1.296, 0.10: 1.671, 0.05: 2.000, 0.025: 2.299, 0.02: 2.390, 0.01: 2.660, 0.005: 2.915 },
    80: { 0.20: 1.292, 0.10: 1.664, 0.05: 1.990, 0.025: 2.284, 0.02: 2.374, 0.01: 2.639, 0.005: 2.887 },
    100: { 0.20: 1.290, 0.10: 1.660, 0.05: 1.984, 0.025: 2.276, 0.02: 2.364, 0.01: 2.626, 0.005: 2.871 },
    120: { 0.20: 1.289, 0.10: 1.658, 0.05: 1.980, 0.025: 2.270, 0.02: 2.358, 0.01: 2.617, 0.005: 2.860 },
    9999: { 0.20: 1.282, 0.10: 1.645, 0.05: 1.960, 0.025: 2.241, 0.02: 2.326, 0.01: 2.576, 0.005: 2.807 },
};
const KNOWN_DFS = Object.keys(T_TABLE).map(Number).sort((a, b) => a - b);
/**
 * Get the t-critical value for a given degrees of freedom and confidence level.
 * @param df Degrees of freedom
 * @param confidenceLevel Confidence level (e.g. 0.80, 0.95, 0.99)
 * @returns The t-critical value
 */
function tCritical(df, confidenceLevel) {
    // Two-tailed alpha: area in each tail
    const alpha = 1 - confidenceLevel;
    // Find the closest df entries for interpolation
    const effectiveDf = Math.max(1, Math.min(df, 9999));
    let lowerDf = KNOWN_DFS[0];
    let upperDf = KNOWN_DFS[KNOWN_DFS.length - 1];
    for (const knownDf of KNOWN_DFS) {
        if (knownDf <= effectiveDf)
            lowerDf = knownDf;
        if (knownDf >= effectiveDf) {
            upperDf = knownDf;
            break;
        }
    }
    const lowerT = lookupAlpha(lowerDf, alpha);
    if (lowerDf === upperDf)
        return lowerT;
    const upperT = lookupAlpha(upperDf, alpha);
    // Linear interpolation between the two df entries
    const fraction = (effectiveDf - lowerDf) / (upperDf - lowerDf);
    return lowerT + fraction * (upperT - lowerT);
}
function lookupAlpha(df, alpha) {
    const row = T_TABLE[df];
    if (!row) {
        // Fallback to z-score for large df
        return zScoreFromAlpha(alpha);
    }
    const alphas = Object.keys(row).map(Number).sort((a, b) => a - b);
    // Exact match
    if (row[alpha] !== undefined)
        return row[alpha];
    // Interpolate between closest alpha values
    let lowerAlpha = alphas[0];
    let upperAlpha = alphas[alphas.length - 1];
    for (const a of alphas) {
        if (a <= alpha)
            lowerAlpha = a;
        if (a >= alpha) {
            upperAlpha = a;
            break;
        }
    }
    if (lowerAlpha === upperAlpha)
        return row[lowerAlpha];
    const fraction = (alpha - lowerAlpha) / (upperAlpha - lowerAlpha);
    return row[lowerAlpha] + fraction * (row[upperAlpha] - row[lowerAlpha]);
}
/** Approximate z-score for very large degrees of freedom. */
function zScoreFromAlpha(alpha) {
    // Use known z-scores for common alpha values
    const zTable = {
        0.20: 1.282,
        0.10: 1.645,
        0.05: 1.960,
        0.025: 2.241,
        0.02: 2.326,
        0.01: 2.576,
        0.005: 2.807,
    };
    if (zTable[alpha] !== undefined)
        return zTable[alpha];
    // Rational approximation for the inverse normal CDF (Abramowitz & Stegun)
    const p = alpha / 2; // one-tailed
    const t = Math.sqrt(-2 * Math.log(p));
    const c0 = 2.515517;
    const c1 = 0.802853;
    const c2 = 0.010328;
    const d1 = 1.432788;
    const d2 = 0.189269;
    const d3 = 0.001308;
    return t - (c0 + c1 * t + c2 * t * t) / (1 + d1 * t + d2 * t * t + d3 * t * t * t);
}
/**
 * Approximate the p-value for a given t-statistic and degrees of freedom.
 * Uses a numerical approximation of the incomplete beta function.
 */
function tPValue(tStat, df) {
    const x = df / (df + tStat * tStat);
    return incompleteBeta(df / 2, 0.5, x);
}
/**
 * Regularized incomplete beta function using continued fraction approximation.
 * This provides a reasonable approximation for p-value computation.
 */
function incompleteBeta(a, b, x) {
    if (x <= 0)
        return 0;
    if (x >= 1)
        return 1;
    // Use the continued fraction representation
    const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) +
        a * Math.log(x) + b * Math.log(1 - x));
    if (x < (a + 1) / (a + b + 2)) {
        return bt * betaCF(a, b, x) / a;
    }
    return 1 - bt * betaCF(b, a, 1 - x) / b;
}
/** Continued fraction for the incomplete beta function. */
function betaCF(a, b, x) {
    const maxIter = 200;
    const eps = 3e-7;
    const fpMin = 1e-30;
    let qab = a + b;
    let qap = a + 1;
    let qam = a - 1;
    let c = 1;
    let d = 1 - qab * x / qap;
    if (Math.abs(d) < fpMin)
        d = fpMin;
    d = 1 / d;
    let h = d;
    for (let m = 1; m <= maxIter; m++) {
        const m2 = 2 * m;
        // Even step
        let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
        d = 1 + aa * d;
        if (Math.abs(d) < fpMin)
            d = fpMin;
        c = 1 + aa / c;
        if (Math.abs(c) < fpMin)
            c = fpMin;
        d = 1 / d;
        h *= d * c;
        // Odd step
        aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
        d = 1 + aa * d;
        if (Math.abs(d) < fpMin)
            d = fpMin;
        c = 1 + aa / c;
        if (Math.abs(c) < fpMin)
            c = fpMin;
        d = 1 / d;
        const del = d * c;
        h *= del;
        if (Math.abs(del - 1) < eps)
            break;
    }
    return h;
}
/** Log-gamma function using Stirling's approximation. */
function lgamma(x) {
    const coef = [
        76.18009172947146,
        -86.50532032941677,
        24.01409824083091,
        -1.231739572450155,
        0.1208650973866179e-2,
        -0.5395239384953e-5,
    ];
    let y = x;
    let tmp = x + 5.5;
    tmp -= (x + 0.5) * Math.log(tmp);
    let ser = 1.000000000190015;
    for (const c of coef) {
        y += 1;
        ser += c / y;
    }
    return -tmp + Math.log(2.5066282746310005 * ser / x);
}
//# sourceMappingURL=t-distribution.js.map