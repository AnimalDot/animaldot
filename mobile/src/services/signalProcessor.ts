/**
 * Signal processor for BedDot geophone data (mobile).
 * Copied from web/src/lib/beddot/signalProcessor.ts — same pipeline as test/visual_vitals.py.
 * Pure TypeScript, no web/DOM dependencies.
 */

// Respiratory: [0.1, 0.5] Hz bandpass at FS=100
const RESP_B = new Float64Array([
  0.00036216815149286824, 0, -0.0007243363029857365, 0, 0.00036216815149286824,
]);
const RESP_A = new Float64Array([
  1, -3.9461068440066254, 5.8396791020498395, -3.8461506264946987, 0.9526131025975979,
]);

// Heart rate: [0.8, 2.0] Hz bandpass at FS=100
const HR_B = new Float64Array([
  0.002080567135492847, 0, -0.004161134270985694, 0, 0.002080567135492847,
]);
const HR_A = new Float64Array([
  1, -3.7554591573498667, 5.3220545860498855, -3.3717803750093735, 0.805773804293826,
]);

/** Heart rate search range (BPM). No artificial limit at 60 — algorithm searches 38–110. */
const BPM_MIN = 38;
const BPM_MAX = 110;

function iirFilter(b: Float64Array, a: Float64Array, x: Float64Array): Float64Array {
  const n = x.length;
  const order = b.length - 1;
  const y = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let j = 0; j <= order; j++) if (i - j >= 0) sum += b[j] * x[i - j];
    for (let j = 1; j <= order; j++) if (i - j >= 0) sum -= a[j] * y[i - j];
    y[i] = sum;
  }
  return y;
}

function filtfilt(b: Float64Array, a: Float64Array, x: Float64Array): Float64Array {
  const n = x.length;
  const padLen = Math.min(3 * Math.max(b.length, a.length), n - 1);
  const padded = new Float64Array(n + 2 * padLen);
  for (let i = 0; i < padLen; i++) padded[i] = 2 * x[0] - x[padLen - i];
  for (let i = 0; i < n; i++) padded[padLen + i] = x[i];
  for (let i = 0; i < padLen; i++) padded[padLen + n + i] = 2 * x[n - 1] - x[n - 2 - i];
  const forward = iirFilter(b, a, padded);
  const reversed = new Float64Array(forward.length);
  for (let i = 0; i < forward.length; i++) reversed[i] = forward[forward.length - 1 - i];
  const backward = iirFilter(b, a, reversed);
  const result = new Float64Array(n);
  for (let i = 0; i < n; i++) result[i] = backward[backward.length - 1 - padLen - i];
  return result;
}

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
      const prominence = data[i] - Math.max(data[i - 1], data[i + 1]);
      if (prominence >= minProminence) peaks.push({ index: i, prominence });
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
        if (peaks.length === 0 || i - peaks[peaks.length - 1] >= minDistance) peaks.push(i);
      }
    }
  }
  return peaks;
}

function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
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

function ifft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  for (let i = 0; i < n; i++) im[i] = -im[i];
  fft(re, im);
  for (let i = 0; i < n; i++) {
    re[i] /= n;
    im[i] = -im[i] / n;
  }
}

function autocorrelationBpm(
  signal: Float64Array,
  fs: number,
  bpmLow = BPM_MIN,
  bpmHigh = BPM_MAX
): number | null {
  const n = signal.length;
  const envelope = new Float64Array(n);
  for (let i = 0; i < n; i++) envelope[i] = signal[i] * signal[i];
  let mean = 0;
  for (let i = 0; i < n; i++) mean += envelope[i];
  mean /= n;
  for (let i = 0; i < n; i++) envelope[i] -= mean;
  let norm = 0;
  for (let i = 0; i < n; i++) norm += envelope[i] * envelope[i];
  norm = Math.sqrt(norm);
  if (norm < 1e-10) return null;
  for (let i = 0; i < n; i++) envelope[i] /= norm;
  const fftSize = nextPow2(2 * n);
  const re = new Float64Array(fftSize);
  const im = new Float64Array(fftSize);
  for (let i = 0; i < n; i++) re[i] = envelope[i];
  fft(re, im);
  for (let i = 0; i < fftSize; i++) {
    re[i] = re[i] * re[i] + im[i] * im[i];
    im[i] = 0;
  }
  ifft(re, im);
  if (re[0] === 0) return null;
  for (let i = 0; i < n; i++) re[i] /= re[0];
  const minLag = Math.floor((fs * 60) / bpmHigh);
  const maxLag = Math.min(Math.floor((fs * 60) / bpmLow), n - 1);
  if (maxLag - minLag + 1 <= 0) return null;
  const peaks = findPeaks(re, minLag, maxLag, 0.02);
  if (peaks.length === 0) return null;
  peaks.sort((a, b) => b.prominence - a.prominence);
  let bestLag = peaks[0].index;
  const bestProm = peaks[0].prominence;
  const doubleLag = bestLag * 2;
  if (doubleLag <= maxLag) {
    const searchLo = Math.max(minLag, Math.floor(doubleLag * 0.85));
    const searchHi = Math.min(maxLag, Math.ceil(doubleLag * 1.15));
    if (searchHi > searchLo) {
      const subPeaks = findPeaks(re, searchLo, searchHi, 0.01);
      if (subPeaks.length > 0) {
        subPeaks.sort((a, b) => b.prominence - a.prominence);
        if (subPeaks[0].prominence > bestProm * 0.3) bestLag = subPeaks[0].index;
      }
    }
  }
  return (60.0 * fs) / bestLag;
}

function peakCountingBpm(hrSignal: Float64Array, fs: number): number | null {
  const n = hrSignal.length;
  const envelope = new Float64Array(n);
  for (let i = 0; i < n; i++) envelope[i] = hrSignal[i] * hrSignal[i];
  const sorted = Array.from(envelope).sort((a, b) => a - b);
  const prominenceThresh = sorted[Math.floor(sorted.length * 0.8)];
  const minDistance = Math.floor(fs * 0.85);
  const peaks: number[] = [];
  for (let i = 1; i < n - 1; i++) {
    if (envelope[i] > envelope[i - 1] && envelope[i] > envelope[i + 1]) {
      if (envelope[i] > prominenceThresh) {
        if (peaks.length === 0 || i - peaks[peaks.length - 1] >= minDistance) peaks.push(i);
      }
    }
  }
  if (peaks.length < 4) return null;
  const intervals: number[] = [];
  for (let i = 1; i < peaks.length; i++) {
    const interval = (peaks[i] - peaks[i - 1]) / fs;
    if (interval >= 0.5 && interval <= 1.6) intervals.push(interval);
  }
  if (intervals.length < 3) return null;
  intervals.sort((a, b) => a - b);
  return 60.0 / intervals[Math.floor(intervals.length / 2)];
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

export interface VitalsResult {
  heartRate: number | null;
  respiratoryRate: number | null;
  signalQuality: number;
  qualityLevel: 'poor' | 'fair' | 'good';
}

/**
 * Process a buffer of raw geophone samples into vital signs.
 */
export function processVitals(rawSamples: Float64Array, fs: number): VitalsResult {
  const n = rawSamples.length;

  if (n === 0) {
    return {
      heartRate: null,
      respiratoryRate: null,
      signalQuality: 0,
      qualityLevel: 'poor',
    };
  }

  // Basic amplitude / variance checks
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < n; i++) {
    if (rawSamples[i] < min) min = rawSamples[i];
    if (rawSamples[i] > max) max = rawSamples[i];
  }
  const signalRange = max - min;

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

  const EMPTY_RANGE_THRESHOLD = 5;

  if (signalRange < EMPTY_RANGE_THRESHOLD) {
    return {
      heartRate: null,
      respiratoryRate: null,
      signalQuality: 0,
      qualityLevel: 'poor',
    };
  }

  const normalized = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    normalized[i] = (rawSamples[i] - mean) / (stdDev || 1);
  }

  const k = kurtosis(normalized);
  const MOVEMENT_KURTOSIS_THRESHOLD = 10;
  const hasMovement = k > MOVEMENT_KURTOSIS_THRESHOLD;

  const respSignal = filtfilt(RESP_B, RESP_A, normalized);
  const hrSignal = filtfilt(HR_B, HR_A, normalized);

  const hrEnvelope = analyticEnvelope(hrSignal);
  const heartRateEnv = estimateHeartRateFromEnvelope(hrEnvelope, fs);

  const legacyAcf = autocorrelationBpm(hrSignal, fs, BPM_MIN, BPM_MAX);
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

  const rrSld = estimateRespiratoryRateSLD(hrSignal, fs);
  const rrFallback = estimateRespiratoryRateFallback(respSignal, fs);
  let respiratoryRate: number | null = null;
  if (rrSld != null && rrFallback != null) {
    const relDiff = Math.abs(rrSld - rrFallback) / rrFallback;
    respiratoryRate = relDiff < 0.15 ? rrSld : rrFallback;
  } else {
    respiratoryRate = rrSld ?? rrFallback ?? null;
  }

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

// Extra helpers mirrored from backend implementation

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

function analyticEnvelope(x: Float64Array): Float64Array {
  const n = x.length;
  const N = nextPow2(n);
  const re = new Float64Array(N);
  const im = new Float64Array(N);
  for (let i = 0; i < n; i++) re[i] = x[i];
  for (let i = n; i < N; i++) re[i] = 0;
  fft(re, im);

  const h = new Float64Array(N);
  h[0] = 1;
  if (N % 2 === 0) {
    h[N / 2] = 1;
    for (let k = 1; k < N / 2; k++) h[k] = 2;
  } else {
    for (let k = 1; k <= (N - 1) / 2; k++) h[k] = 2;
  }
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

function estimateHeartRateFromEnvelope(
  envelope: Float64Array,
  fs: number
): number | null {
  const n = envelope.length;
  if (n < fs * 5) return null;

  const peaks: number[] = [];
  const minDistance = Math.floor(0.4 * fs);
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
    const delta = 0.5 * (y1 - y3) / denom;
    const clamped = Math.max(-0.5, Math.min(0.5, delta));
    refined.push(k + clamped);
  }

  const intervals: number[] = [];
  for (let i = 1; i < refined.length; i++) {
    const dt = (refined[i] - refined[i - 1]) / fs;
    if (dt > 0.3 && dt < 2.0) intervals.push(dt);
  }
  if (intervals.length < 4) return null;

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

function estimateRespiratoryRateSLD(
  hrSignal: Float64Array,
  fs: number
): number | null {
  const n = hrSignal.length;
  if (n < fs * 10) return null;

  const squared = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const v = hrSignal[i];
    squared[i] = v * v;
  }

  const baseband = filtfilt(RESP_B, RESP_A, squared);

  let mean = 0;
  for (let i = 0; i < n; i++) mean += baseband[i];
  mean /= n;
  for (let i = 0; i < n; i++) baseband[i] -= mean;

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
  if (rr < 4 || rr > 60) return null;
  return rr;
}

function estimateRespiratoryRateFallback(
  respSignal: Float64Array,
  fs: number
): number | null {
  const n = respSignal.length;
  if (n < fs * 10) return null;

  const respStd = std(respSignal);
  if (respStd < 1e-6) return null;
  const respProminence = Math.max(respStd * 0.3, 1e-9);

  const respPeaks = findPeaksSimple(
    respSignal,
    Math.floor(fs * 1.5),
    respProminence
  );

  if (respPeaks.length <= 2) return null;

  const intervals: number[] = [];
  for (let i = 1; i < respPeaks.length; i++) {
    const dt = (respPeaks[i] - respPeaks[i - 1]) / fs;
    if (dt >= 1.5 && dt <= 12.0) {
      intervals.push(dt);
    }
  }
  if (intervals.length < 2) return null;

  intervals.sort((a, b) => a - b);
  const median = intervals[Math.floor(intervals.length / 2)];
  if (!Number.isFinite(median) || median <= 0) return null;

  return 60 / median;
}
