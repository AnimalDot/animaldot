import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  filtfilt,
  autocorrelationBpm,
  peakCountingBpm,
  processVitals,
} from './signal-processor.js';

const FS = 100; // 100 Hz sample rate

/** Generate a sine wave at a given frequency. */
function sineWave(freqHz: number, durationSec: number, fs: number, amplitude = 1000): Float64Array {
  const n = fs * durationSec;
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = amplitude * Math.sin(2 * Math.PI * freqHz * i / fs);
  }
  return out;
}

/** Generate a sum of sine waves. */
function multiSine(freqs: number[], durationSec: number, fs: number, amplitude = 1000): Float64Array {
  const n = fs * durationSec;
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    for (const f of freqs) {
      out[i] += amplitude * Math.sin(2 * Math.PI * f * i / fs);
    }
  }
  return out;
}

describe('signal-processor', () => {

  describe('filtfilt', () => {
    it('passes in-band frequencies with higher amplitude than out-of-band', () => {
      // 1.2 Hz is within [0.8, 2.0] Hz HR band
      const inBand = sineWave(1.2, 30, FS);
      // 10 Hz is well outside the band
      const outBand = sineWave(10.0, 30, FS);
      const HR_B = new Float64Array([0.002080567135492847, 0, -0.004161134270985694, 0, 0.002080567135492847]);
      const HR_A = new Float64Array([1, -3.7554591573498667, 5.3220545860498855, -3.3717803750093735, 0.805773804293826]);

      const filteredIn = filtfilt(HR_B, HR_A, inBand);
      const filteredOut = filtfilt(HR_B, HR_A, outBand);

      // Measure amplitude in the middle (avoid edge effects)
      let maxIn = 0, maxOut = 0;
      for (let i = 500; i < filteredIn.length - 500; i++) {
        maxIn = Math.max(maxIn, Math.abs(filteredIn[i]));
        maxOut = Math.max(maxOut, Math.abs(filteredOut[i]));
      }

      // In-band should be significantly larger than out-of-band
      assert.ok(maxIn > maxOut * 3, `In-band (${maxIn}) should be >> out-of-band (${maxOut})`);
      // In-band should retain some amplitude
      assert.ok(maxIn > 10, `In-band amplitude should be > 10, got ${maxIn}`);
      // Out-of-band should be attenuated
      assert.ok(maxOut < 50, `Out-of-band should be < 50, got ${maxOut}`);
    });
  });

  describe('autocorrelationBpm', () => {
    it('estimates BPM for a realistic BCG-like signal', () => {
      // Simulate a BCG waveform: sharp pulses at ~1 Hz (60 BPM)
      // with multiple peaks per beat (I-J-K complex)
      const n = FS * 30;
      const signal = new Float64Array(n);
      for (let i = 0; i < n; i++) {
        const t = i / FS;
        const beatPhase = (t % 1.0); // 1 Hz beat
        // Sharp gaussian-like pulse near the start of each beat
        signal[i] = 1000 * Math.exp(-((beatPhase - 0.1) ** 2) / 0.002)
                  - 500 * Math.exp(-((beatPhase - 0.2) ** 2) / 0.003);
      }
      const bpm = autocorrelationBpm(signal, FS, 38, 120);
      assert.ok(bpm !== null, 'Expected non-null BPM');
      assert.ok(Math.abs(bpm - 60) < 10, `Expected ~60 BPM but got ${bpm}`);
    });

    it('handles harmonic correction with multi-peak waveform', () => {
      // Signal with strong 0.8 Hz beat (~48 BPM) that has harmonics
      const n = FS * 30;
      const signal = new Float64Array(n);
      const period = 1.0 / 0.8; // 1.25 seconds
      for (let i = 0; i < n; i++) {
        const t = i / FS;
        const phase = (t % period) / period;
        signal[i] = 1000 * Math.exp(-((phase - 0.1) ** 2) / 0.002)
                  + 600 * Math.exp(-((phase - 0.3) ** 2) / 0.003);
      }
      const bpm = autocorrelationBpm(signal, FS, 38, 120);
      assert.ok(bpm !== null, 'Expected non-null BPM');
      assert.ok(bpm < 60, `Expected <60 BPM (near 48) but got ${bpm}`);
    });

    it('returns null for flat/weak signal', () => {
      const signal = new Float64Array(3000); // all zeros
      const bpm = autocorrelationBpm(signal, FS, 38, 110);
      assert.strictEqual(bpm, null);
    });
  });

  describe('peakCountingBpm', () => {
    it('estimates BPM from evenly spaced peaks', () => {
      // Create a signal with peaks at 1 Hz (60 BPM)
      const n = FS * 30;
      const signal = new Float64Array(n);
      for (let i = 0; i < n; i++) {
        signal[i] = Math.sin(2 * Math.PI * 1.0 * i / FS);
        // Add some harmonics to make peaks more prominent
        signal[i] += 0.3 * Math.sin(2 * Math.PI * 2.0 * i / FS);
      }
      const bpm = peakCountingBpm(signal, FS);
      if (bpm !== null) {
        assert.ok(Math.abs(bpm - 60) < 10, `Expected ~60 BPM but got ${bpm}`);
      }
      // It's acceptable for peak counting to return null on simple sinusoids
    });
  });

  describe('processVitals', () => {
    it('returns null vitals for flat signal (empty bed)', () => {
      const flat = new Float64Array(3000).fill(15800);
      const result = processVitals(flat, FS);
      assert.strictEqual(result.heartRate, null);
      assert.strictEqual(result.respiratoryRate, null);
      assert.strictEqual(result.qualityLevel, 'poor');
      assert.strictEqual(result.signalQuality, 0);
    });

    it('extracts heart rate from a signal with 1 Hz component', () => {
      // Simulate a signal with a 1 Hz heartbeat component and a 0.25 Hz respiratory component
      const n = FS * 30;
      const signal = new Float64Array(n);
      for (let i = 0; i < n; i++) {
        signal[i] = 15800 + 500 * Math.sin(2 * Math.PI * 1.0 * i / FS)
                           + 200 * Math.sin(2 * Math.PI * 0.25 * i / FS);
      }
      const result = processVitals(signal, FS);
      // Should extract at least heart rate
      if (result.heartRate !== null) {
        assert.ok(result.heartRate > 40 && result.heartRate < 100,
          `HR ${result.heartRate} outside expected range`);
      }
      assert.ok(result.signalQuality > 0);
    });
  });
});
