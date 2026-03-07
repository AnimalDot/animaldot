/**
 * Signal processor for BedDot geophone data.
 *
 * Ports the DSP pipeline from test/visual_vitals.py to TypeScript:
 *   - Butterworth bandpass IIR filtering (hardcoded coefficients)
 *   - Forward-backward filtering (filtfilt) for zero-phase distortion
 *   - Autocorrelation-based BPM estimation with harmonic correction
 *   - Peak-counting BPM as fallback
 *
 * All math uses Float64Array — no external DSP library needed.
 */

// Pre-computed 2nd-order Butterworth bandpass filter coefficients.
// These match scipy.signal.butter(2, [low, high], btype='bandpass', fs=100).
// b = numerator (feedforward), a = denominator (feedback)

// Respiratory: [0.1, 0.5] Hz bandpass at FS=100
const RESP_B = new Float64Array([
  0.00036216815149286824,
  0,
  -0.0007243363029857365,
  0,
  0.00036216815149286824,
]);
const RESP_A = new Float64Array([
  1,
  -3.9461068440066254,
  5.8396791020498395,
  -3.8461506264946987,
  0.9526131025975979,
]);

// Heart rate: [0.8, 2.0] Hz bandpass at FS=100
const HR_B = new Float64Array([
  0.002080567135492847,
  0,
  -0.004161134270985694,
  0,
  0.002080567135492847,
]);
const HR_A = new Float64Array([
  1,
  -3.7554591573498667,
  5.3220545860498855,
  -3.3717803750093735,
  0.805773804293826,
]);

/**
 * Apply IIR filter to signal (single-pass, forward direction).
 */
function iirFilter(
  b: Float64Array,
  a: Float64Array,
  x: Float64Array
): Float64Array {
  const n = x.length;
  const order = b.length - 1;
  const y = new Float64Array(n);

  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let j = 0; j <= order; j++) {
      if (i - j >= 0) sum += b[j] * x[i - j];
    }
    for (let j = 1; j <= order; j++) {
      if (i - j >= 0) sum -= a[j] * y[i - j];
    }
    y[i] = sum;
  }

  return y;
}

/**
 * Zero-phase filtering (forward-backward IIR), equivalent to scipy.signal.filtfilt.
 * Pads signal to reduce edge effects.
 */
export function filtfilt(
  b: Float64Array,
  a: Float64Array,
  x: Float64Array
): Float64Array {
  const n = x.length;
  const padLen = Math.min(3 * Math.max(b.length, a.length), n - 1);

  // Reflect-pad the signal at both ends
  const padded = new Float64Array(n + 2 * padLen);
  const edge0 = 2 * x[0];
  const edgeN = 2 * x[n - 1];
  for (let i = 0; i < padLen; i++) {
    padded[i] = edge0 - x[padLen - i];
  }
  for (let i = 0; i < n; i++) {
    padded[padLen + i] = x[i];
  }
  for (let i = 0; i < padLen; i++) {
    padded[padLen + n + i] = edgeN - x[n - 2 - i];
  }

  // Forward pass
  const forward = iirFilter(b, a, padded);

  // Reverse
  const reversed = new Float64Array(forward.length);
  for (let i = 0; i < forward.length; i++) {
    reversed[i] = forward[forward.length - 1 - i];
  }

  // Backward pass
  const backward = iirFilter(b, a, reversed);

  // Reverse again and extract original range
  const result = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    result[i] = backward[backward.length - 1 - padLen - i];
  }

  return result;
}

/**
 * Estimate BPM using autocorrelation with harmonic/sub-harmonic correction.
 * Ported from visual_vitals.py autocorrelation_bpm().
 */
export function autocorrelationBpm(
  signal: Float64Array,
  fs: number,
  bpmLow = 38,
  bpmHigh = 110
): number | null {
  const n = signal.length;

  // Compute squared envelope
  const envelope = new Float64Array(n);
  for (let i = 0; i < n; i++) envelope[i] = signal[i] * signal[i];

  // Remove mean
  let mean = 0;
  for (let i = 0; i < n; i++) mean += envelope[i];
  mean /= n;
  for (let i = 0; i < n; i++) envelope[i] -= mean;

  // Normalize
  let norm = 0;
  for (let i = 0; i < n; i++) norm += envelope[i] * envelope[i];
  norm = Math.sqrt(norm);
  if (norm < 1e-10) return null;
  for (let i = 0; i < n; i++) envelope[i] /= norm;

  // FFT-based autocorrelation
  const fftSize = nextPow2(2 * n);
  const re = new Float64Array(fftSize);
  const im = new Float64Array(fftSize);
  for (let i = 0; i < n; i++) re[i] = envelope[i];
  fft(re, im);

  // Power spectrum (multiply by conjugate)
  for (let i = 0; i < fftSize; i++) {
    const pr = re[i] * re[i] + im[i] * im[i];
    re[i] = pr;
    im[i] = 0;
  }
  ifft(re, im);

  // Normalize ACF
  const acf0 = re[0];
  if (acf0 === 0) return null;
  for (let i = 0; i < n; i++) re[i] /= acf0;

  const minLag = Math.floor((fs * 60) / bpmHigh);
  const maxLag = Math.min(Math.floor((fs * 60) / bpmLow), n - 1);

  // Find peaks in search region
  const searchLen = maxLag - minLag + 1;
  if (searchLen <= 0) return null;

  const peaks = findPeaks(re, minLag, maxLag, 0.02);
  if (peaks.length === 0) return null;

  // Sort by prominence (descending)
  peaks.sort((a, b) => b.prominence - a.prominence);

  let bestLag = peaks[0].index;
  const bestProm = peaks[0].prominence;

  // Harmonic correction: check for sub-harmonic at ~2x lag
  const doubleLag = bestLag * 2;
  if (doubleLag <= maxLag) {
    const searchLo = Math.max(minLag, Math.floor(doubleLag * 0.85));
    const searchHi = Math.min(maxLag, Math.ceil(doubleLag * 1.15));

    if (searchHi > searchLo) {
      const subPeaks = findPeaks(re, searchLo, searchHi, 0.01);
      if (subPeaks.length > 0) {
        subPeaks.sort((a, b) => b.prominence - a.prominence);
        if (subPeaks[0].prominence > bestProm * 0.3) {
          bestLag = subPeaks[0].index;
        }
      }
    }
  }

  return (60.0 * fs) / bestLag;
}

/**
 * Fallback peak-counting BPM estimation.
 * Ported from visual_vitals.py peak_counting_bpm().
 */
export function peakCountingBpm(
  hrSignal: Float64Array,
  fs: number
): number | null {
  const n = hrSignal.length;

  // Squared envelope
  const envelope = new Float64Array(n);
  for (let i = 0; i < n; i++) envelope[i] = hrSignal[i] * hrSignal[i];

  // 80th percentile for prominence threshold
  const sorted = Array.from(envelope).sort((a, b) => a - b);
  const prominenceThresh = sorted[Math.floor(sorted.length * 0.8)];

  // Find peaks with minimum distance and prominence
  const minDistance = Math.floor(fs * 0.85);
  const peaks: number[] = [];

  for (let i = 1; i < n - 1; i++) {
    if (envelope[i] > envelope[i - 1] && envelope[i] > envelope[i + 1]) {
      if (envelope[i] > prominenceThresh) {
        if (peaks.length === 0 || i - peaks[peaks.length - 1] >= minDistance) {
          peaks.push(i);
        }
      }
    }
  }

  if (peaks.length < 4) return null;

  // Compute intervals and filter valid ones
  const intervals: number[] = [];
  for (let i = 1; i < peaks.length; i++) {
    const interval = (peaks[i] - peaks[i - 1]) / fs;
    if (interval >= 0.5 && interval <= 1.6) {
      intervals.push(interval);
    }
  }

  if (intervals.length < 3) return null;

  // Return BPM from median interval
  intervals.sort((a, b) => a - b);
  const median = intervals[Math.floor(intervals.length / 2)];
  return 60.0 / median;
}

export interface VitalsResult {
  heartRate: number | null;
  respiratoryRate: number | null;
  signalQuality: number;
  qualityLevel: 'poor' | 'fair' | 'good';
}

export interface RespDebug {
  std: number;
  min: number;
  max: number;
  sample: number[];
}

export interface RespDebug {
  std: number;
  min: number;
  max: number;
  sample: number[];
}

/**
 * Main entry: process a buffer of raw geophone samples into vital signs.
 *
 * Pipeline (aligned with research paper):
 *   1. Basic z-score normalization and coarse quality checks (empty bed / movement).
 *   2. Bandpass filtering for heart and respiration bands.
 *   3. Heart rate from envelope + truncated inter-beat intervals.
 *   4. Respiratory rate from square-law demodulation + autocorrelation.
 *   5. Signal quality from combination of occupancy / movement and HR/RR success.
 */
export function processVitals(
  rawSamples: Float64Array,
  fs: number
): VitalsResult {
  const n = rawSamples.length;

  if (n === 0) {
    return {
      heartRate: null,
      respiratoryRate: null,
      signalQuality: 0,
      qualityLevel: 'poor',
    };
  }

  // -------------------------------
  // 1. Basic amplitude / variance checks
  // -------------------------------
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < n; i++) {
    if (rawSamples[i] < min) min = rawSamples[i];
    if (rawSamples[i] > max) max = rawSamples[i];
  }
  const signalRange = max - min;

  // Mean and std for z-score normalization
  let mean = 0;
  for (let i = 0; i < n; i++) mean += rawSamples[i];
  mean /= n;
  let variance = 0;
  for (let i = 0; i < n; i++) {
    const d = rawSamples[i] - mean;
    variance += d * d;
  }
  variance /= n;
  const stdDev = Math.sqrt(variance);

  // Heuristic thresholds (empirical; intentionally loose so we still compute vitals
  // for development/bridge scenarios).
  const EMPTY_RANGE_THRESHOLD = 5; // raw units — only treat as empty when truly flat

  // Empty bed / extremely low amplitude -> poor quality, no vitals.
  if (signalRange < EMPTY_RANGE_THRESHOLD) {
    return {
      heartRate: null,
      respiratoryRate: null,
      signalQuality: 0,
      qualityLevel: 'poor',
    };
  }

  // Z-score normalization
  const normalized = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    normalized[i] = (rawSamples[i] - mean) / (stdDev || 1);
  }

  // Movement detection via kurtosis on normalized signal.
  // We no longer *drop* vitals on movement; we only use this later to degrade quality.
  const k = kurtosis(normalized);
  const MOVEMENT_KURTOSIS_THRESHOLD = 10;
  const hasMovement = k > MOVEMENT_KURTOSIS_THRESHOLD;

  // -------------------------------
  // 2. Bandpass filtering
  // -------------------------------
  const respSignal = filtfilt(RESP_B, RESP_A, normalized);
  const hrSignal = filtfilt(HR_B, HR_A, normalized);

  // -------------------------------
  // 3. Heart rate from envelope + truncated statistics
  // -------------------------------
  const hrEnvelope = analyticEnvelope(hrSignal);
  const heartRateEnv = estimateHeartRateFromEnvelope(hrEnvelope, fs);

  // Legacy HR estimator (autocorrelation + peak counting) as fallback.
  const legacyAcf = autocorrelationBpm(hrSignal, fs, 38, 110);
  const legacyPeak = peakCountingBpm(hrSignal, fs);
  let heartRateLegacy: number | null = null;
  if (legacyAcf !== null) {
    if (legacyPeak !== null && Math.abs(legacyAcf - legacyPeak) / legacyAcf < 0.15) {
      heartRateLegacy = (legacyAcf + legacyPeak) / 2.0;
    } else {
      heartRateLegacy = legacyAcf;
    }
  } else if (legacyPeak !== null) {
    heartRateLegacy = legacyPeak;
  }

  const heartRate = heartRateEnv ?? heartRateLegacy;

  // -------------------------------
  // 4. Respiratory rate via square-law demodulation (SLD)
  // -------------------------------
  const rrSld = estimateRespiratoryRateSLD(hrSignal, fs);
  const rrFallback = estimateRespiratoryRateFallback(respSignal, fs);

  let respiratoryRate: number | null = null;
  if (rrSld != null && rrFallback != null) {
    const relDiff = Math.abs(rrSld - rrFallback) / rrFallback;
    respiratoryRate = relDiff < 0.15 ? rrSld : rrFallback;
  } else {
    respiratoryRate = rrSld ?? rrFallback ?? null;
  }

  // -------------------------------
  // 5. Signal quality synthesis
  // -------------------------------
  let signalQuality: number;
  let qualityLevel: 'poor' | 'fair' | 'good';
  if (heartRate !== null && respiratoryRate !== null) {
    if (hasMovement) {
      signalQuality = 0.6;
      qualityLevel = 'fair';
    } else {
      signalQuality = 0.9;
      qualityLevel = 'good';
    }
  } else if (heartRate !== null || respiratoryRate !== null) {
    signalQuality = hasMovement ? 0.4 : 0.6;
    qualityLevel = 'fair';
  } else {
    signalQuality = 0.2;
    qualityLevel = 'poor';
  }

  return { heartRate, respiratoryRate, signalQuality, qualityLevel };
}

/**
 * Debug helper: inspect the respiration-band signal statistics on the current buffer.
 */
export function debugRespBand(
  rawSamples: Float64Array,
  fs: number
): RespDebug {
  const n = rawSamples.length;
  if (n === 0) {
    return { std: 0, min: 0, max: 0, sample: [] };
  }

  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < n; i++) {
    const v = rawSamples[i];
    if (!Number.isFinite(v)) {
      return { std: 0, min: 0, max: 0, sample: [] };
    }
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const signalRange = max - min;
  const EMPTY_RANGE_THRESHOLD = 5;
  if (signalRange < EMPTY_RANGE_THRESHOLD) {
    return { std: 0, min, max, sample: [] };
  }

  let mean = 0;
  for (let i = 0; i < n; i++) mean += rawSamples[i];
  mean /= n;
  let variance = 0;
  for (let i = 0; i < n; i++) {
    const d = rawSamples[i] - mean;
    variance += d * d;
  }
  variance /= n;
  const stdDev = Math.sqrt(variance) || 1;

  const normalized = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    normalized[i] = (rawSamples[i] - mean) / stdDev;
  }

  const respSignal = filtfilt(RESP_B, RESP_A, normalized);

  let rMin = Infinity;
  let rMax = -Infinity;
  let rSum = 0;
  for (let i = 0; i < n; i++) {
    const v = respSignal[i];
    if (!Number.isFinite(v)) {
      return { std: 0, min: 0, max: 0, sample: [] };
    }
    if (v < rMin) rMin = v;
    if (v > rMax) rMax = v;
    rSum += v * v;
  }
  const rStd = Math.sqrt(rSum / n);

  const sampleLen = Math.min(40, n);
  const sample: number[] = [];
  for (let i = 0; i < sampleLen; i++) {
    sample.push(respSignal[i]);
  }

  return { std: rStd, min: rMin, max: rMax, sample };
}

// ============================================
// Internal DSP helpers
// ============================================

interface Peak {
  index: number;
  prominence: number;
}

function findPeaks(
  data: Float64Array,
  startIdx: number,
  endIdx: number,
  minProminence: number
): Peak[] {
  const peaks: Peak[] = [];
  for (let i = startIdx + 1; i < endIdx; i++) {
    if (data[i] > data[i - 1] && data[i] > data[i + 1]) {
      // Simple prominence: height above neighbors
      const prominence = data[i] - Math.max(data[i - 1], data[i + 1]);
      if (prominence >= minProminence) {
        peaks.push({ index: i, prominence });
      }
    }
  }
  return peaks;
}

function findPeaksSimple(
  data: Float64Array,
  minDistance: number,
  minProminence: number
): number[] {
  const peaks: number[] = [];
  for (let i = 1; i < data.length - 1; i++) {
    if (data[i] > data[i - 1] && data[i] > data[i + 1]) {
      if (data[i] > minProminence) {
        if (peaks.length === 0 || i - peaks[peaks.length - 1] >= minDistance) {
          peaks.push(i);
        }
      }
    }
  }
  return peaks;
}

function std(arr: Float64Array): number {
  let mean = 0;
  for (let i = 0; i < arr.length; i++) mean += arr[i];
  mean /= arr.length;
  let sum = 0;
  for (let i = 0; i < arr.length; i++) {
    const d = arr[i] - mean;
    sum += d * d;
  }
  return Math.sqrt(sum / arr.length);
}

function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

/**
 * In-place radix-2 Cooley-Tukey FFT.
 */
function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  // Bit-reversal permutation
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    while (j & bit) {
      j ^= bit;
      bit >>= 1;
    }
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }

  for (let len = 2; len <= n; len <<= 1) {
    const halfLen = len >> 1;
    const angle = (-2 * Math.PI) / len;
    const wRe = Math.cos(angle);
    const wIm = Math.sin(angle);

    for (let i = 0; i < n; i += len) {
      let curRe = 1;
      let curIm = 0;
      for (let j = 0; j < halfLen; j++) {
        const tRe = curRe * re[i + j + halfLen] - curIm * im[i + j + halfLen];
        const tIm = curRe * im[i + j + halfLen] + curIm * re[i + j + halfLen];
        re[i + j + halfLen] = re[i + j] - tRe;
        im[i + j + halfLen] = im[i + j] - tIm;
        re[i + j] += tRe;
        im[i + j] += tIm;
        const newRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = newRe;
      }
    }
  }
}

/**
 * In-place inverse FFT.
 */
function ifft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  // Conjugate
  for (let i = 0; i < n; i++) im[i] = -im[i];
  fft(re, im);
  // Conjugate and scale
  for (let i = 0; i < n; i++) {
    re[i] /= n;
    im[i] = -im[i] / n;
  }
}

/**
 * Kurtosis (fourth standardized moment) — used for movement detection.
 */
function kurtosis(arr: Float64Array): number {
  const n = arr.length;
  if (n === 0) return 0;
  let mean = 0;
  for (let i = 0; i < n; i++) mean += arr[i];
  mean /= n;
  let m2 = 0;
  let m4 = 0;
  for (let i = 0; i < n; i++) {
    const d = arr[i] - mean;
    const d2 = d * d;
    m2 += d2;
    m4 += d2 * d2;
  }
  m2 /= n;
  m4 /= n;
  if (m2 === 0) return 0;
  return m4 / (m2 * m2);
}

/**
 * Analytic signal envelope via FFT-based Hilbert transform.
 */
function analyticEnvelope(x: Float64Array): Float64Array {
  const n = x.length;
  const N = nextPow2(n);
  const re = new Float64Array(N);
  const im = new Float64Array(N);
  for (let i = 0; i < n; i++) re[i] = x[i];
  for (let i = n; i < N; i++) re[i] = 0;
  fft(re, im);

  // Hilbert transform frequency-domain multiplier
  const h = new Float64Array(N);
  h[0] = 1;
  if (N % 2 === 0) {
    h[N / 2] = 1;
    for (let k = 1; k < N / 2; k++) h[k] = 2;
  } else {
    for (let k = 1; k <= (N - 1) / 2; k++) h[k] = 2;
  }
  // Apply multiplier
  for (let k = 0; k < N; k++) {
    re[k] *= h[k];
    im[k] *= h[k];
  }

  ifft(re, im);

  const env = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const rr = re[i];
    const ii = im[i];
    env[i] = Math.sqrt(rr * rr + ii * ii);
  }
  return env;
}

/**
 * Estimate heart rate from an amplitude envelope using truncated inter-beat intervals.
 */
function estimateHeartRateFromEnvelope(
  envelope: Float64Array,
  fs: number
): number | null {
  const n = envelope.length;
  if (n < fs * 5) return null; // need several seconds

  // Simple peak detection on the envelope, then refine each peak position
  // with a 3-point parabolic fit for sub-sample timing.
  const peaks: number[] = [];
  const minDistance = Math.floor(0.4 * fs); // 150 BPM max ~ 0.4 s
  let lastPeak = -minDistance;

  const envStd = std(envelope);
  const minProm = envStd * 0.3;

  for (let i = 1; i < n - 1; i++) {
    if (envelope[i] > envelope[i - 1] && envelope[i] > envelope[i + 1]) {
      const prominence = envelope[i] - Math.max(envelope[i - 1], envelope[i + 1]);
      if (prominence >= minProm && i - lastPeak >= minDistance) {
        peaks.push(i);
        lastPeak = i;
      }
    }
  }

  if (peaks.length < 6) return null;

  // Parabolic sub-sample refinement around each discrete peak index.
  const refined: number[] = [];
  for (const k of peaks) {
    if (k <= 0 || k >= n - 1) {
      refined.push(k);
      continue;
    }
    const y1 = envelope[k - 1];
    const y2 = envelope[k];
    const y3 = envelope[k + 1];
    const denom = (y1 - 2 * y2 + y3);
    if (denom === 0) {
      refined.push(k);
      continue;
    }
    const delta = 0.5 * (y1 - y3) / denom; // offset in samples
    // Clamp extremely large corrections just in case.
    const clamped = Math.max(-0.5, Math.min(0.5, delta));
    refined.push(k + clamped);
  }

  const intervals: number[] = [];
  for (let i = 1; i < refined.length; i++) {
    const dt = (refined[i] - refined[i - 1]) / fs;
    if (dt > 0.3 && dt < 2.0) {
      intervals.push(dt);
    }
  }
  if (intervals.length < 4) return null;

  // Truncated mean: drop lowest/highest 10% of intervals.
  intervals.sort((a, b) => a - b);
  const k = Math.floor(intervals.length * 0.1);
  const start = k;
  const end = intervals.length - k;
  if (end - start <= 0) return null;

  let sum = 0;
  for (let i = start; i < end; i++) sum += intervals[i];
  const meanIbi = sum / (end - start);
  if (!Number.isFinite(meanIbi) || meanIbi <= 0) return null;

  return 60 / meanIbi;
}

/**
 * Respiratory rate via square-law demodulation (SLD) and autocorrelation.
 */
function estimateRespiratoryRateSLD(
  hrSignal: Float64Array,
  fs: number
): number | null {
  const n = hrSignal.length;
  if (n < fs * 10) return null; // need enough window for multiple breaths

  // Square-law demodulation.
  const squared = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const v = hrSignal[i];
    squared[i] = v * v;
  }

  // Low-pass to isolate respiration baseband. Reuse RESP_B/RESP_A band (0.1–0.5 Hz)
  // as an approximation of a low-pass around the respiration band.
  const baseband = filtfilt(RESP_B, RESP_A, squared);

  // Remove mean.
  let mean = 0;
  for (let i = 0; i < n; i++) mean += baseband[i];
  mean /= n;
  for (let i = 0; i < n; i++) baseband[i] -= mean;

  // Autocorrelation via FFT, similar to autocorrelationBpm but with RPM range.
  const fftSize = nextPow2(2 * n);
  const re = new Float64Array(fftSize);
  const im = new Float64Array(fftSize);
  for (let i = 0; i < n; i++) re[i] = baseband[i];
  fft(re, im);
  for (let i = 0; i < fftSize; i++) {
    const pr = re[i] * re[i] + im[i] * im[i];
    re[i] = pr;
    im[i] = 0;
  }
  ifft(re, im);

  const acf0 = re[0];
  if (acf0 === 0) return null;
  for (let i = 0; i < n; i++) re[i] /= acf0;

  // 8–40 RPM => periods 1.5–7.5 s at 100 Hz.
  const minLag = Math.floor(1.5 * fs);
  const maxLag = Math.min(Math.floor(7.5 * fs), n - 1);
  if (maxLag - minLag + 1 <= 0) return null;

  const peaks = findPeaks(re, minLag, maxLag, 0.02);
  if (peaks.length === 0) return null;
  peaks.sort((a, b) => b.prominence - a.prominence);
  const bestLag = peaks[0].index;

  const periodSeconds = bestLag / fs;
  if (!Number.isFinite(periodSeconds) || periodSeconds <= 0) return null;

  const rr = 60 / periodSeconds;
  if (rr < 4 || rr > 60) return null; // sanity clamp
  return rr;
}

/**
 * Simpler respiration estimator on the respiration-band signal (fallback).
 */
function estimateRespiratoryRateFallback(
  respSignal: Float64Array,
  fs: number
): number | null {
  const n = respSignal.length;
  if (n < fs * 10) return null;

  const respStd = std(respSignal);
  if (!Number.isFinite(respStd) || respStd < 1e-6) return null;
  // Match visual_vitals.py more closely: use 0.5 * std as prominence.
  const respProminence = Math.max(respStd * 0.5, 1e-9);

  const respPeaks = findPeaksSimple(
    respSignal,
    Math.floor(fs * 1.5),
    respProminence
  );

  if (respPeaks.length <= 2) return null;

  const intervals: number[] = [];
  for (let i = 1; i < respPeaks.length; i++) {
    const dt = (respPeaks[i] - respPeaks[i - 1]) / fs;
    // Valid breaths between 2 and 10 seconds apart (6–30 RPM), as in visual_vitals.py.
    if (dt >= 2.0 && dt <= 10.0) {
      intervals.push(dt);
    }
  }
  if (intervals.length < 2) return null;

  intervals.sort((a, b) => a - b);
  const median = intervals[Math.floor(intervals.length / 2)];
  if (!Number.isFinite(median) || median <= 0) return null;

  return 60 / median;
}
