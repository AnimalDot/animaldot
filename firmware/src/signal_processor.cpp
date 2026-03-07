/**
 * @file signal_processor.cpp
 * @brief AnimalDot Smart Bed — DSP Implementation
 *
 * Amplitude-demodulation pipeline for extracting HR and RR from
 * geophone vibration data, based on the research paper:
 *
 *   "Advanced Signal Processing and Machine Learning Methodologies
 *    for Contactless Vital Sign Extraction via Bed-Mounted
 *    Geophone Sensors"
 *
 * Key corrections over the previous implementation:
 *   - RR via amplitude demodulation (geophones are HP, can't see RR directly)
 *   - Envelope-based peak detection avoids BCG sub-wave double-counting
 *   - 10-second window for statistical robustness
 *   - Kurtosis-based movement artifact rejection
 *   - Zero-phase biquad bandpass (forward + backward)
 *   - Truncated IBI statistics for outlier rejection
 */

#include "signal_processor.h"
#include <math.h>
#include <string.h>

/* ===================================================================== */
/* Constructor / Reset                                                   */
/* ===================================================================== */

SignalProcessor::SignalProcessor()
    : _signalMean(0.0f), _signalStdDev(0.0f),
      _baselineNoise(10.0f),
      _prevHR(80.0f), _prevRR(20.0f) {
    memset(_rawFloat, 0, sizeof(_rawFloat));
    memset(_envelope, 0, sizeof(_envelope));
    memset(_ibis, 0, sizeof(_ibis));
}

void SignalProcessor::addSample(int16_t sample) {
    _sampleBuf.push(sample);
}

void SignalProcessor::reset() {
    _sampleBuf.clear();
    _prevHR       = 80.0f;
    _prevRR       = 20.0f;
    _signalMean   = 0.0f;
    _signalStdDev = 0.0f;
}

/* ===================================================================== */
/* Main processing entry point                                           */
/* ===================================================================== */

VitalSigns SignalProcessor::processSignals() {
    VitalSigns result;
    result.isValid          = false;
    result.movementDetected = false;
    result.timestamp        = millis();

    /* ---- Guard: need a full 10-second window ---- */
    if (!_sampleBuf.isFull()) {
        result.heartRate       = _prevHR;
        result.respiratoryRate = _prevRR;
        result.signalQuality   = 0.0f;
        result.qualityLevel    = QUALITY_POOR;
        return result;
    }

    const size_t N = _sampleBuf.size();

    /* ================================================================= */
    /* Step 1: Copy ring buffer → _rawFloat, DC removal                  */
    /* ================================================================= */
    float sum = 0.0f;
    for (size_t i = 0; i < N; i++) {
        _rawFloat[i] = static_cast<float>(_sampleBuf.get(i));
        sum += _rawFloat[i];
    }
    _signalMean = sum / N;
    for (size_t i = 0; i < N; i++) _rawFloat[i] -= _signalMean;

    /* ================================================================= */
    /* Step 2: Z-score normalization (mean=0, std=1)                     */
    /* ================================================================= */
    float sumSq = 0.0f;
    for (size_t i = 0; i < N; i++) sumSq += _rawFloat[i] * _rawFloat[i];
    _signalStdDev = sqrtf(sumSq / N);

    if (_signalStdDev < 1e-6f) {
        /* Dead signal — no energy at all */
        result.heartRate       = _prevHR;
        result.respiratoryRate = _prevRR;
        result.signalQuality   = 0.0f;
        result.qualityLevel    = QUALITY_POOR;
        return result;
    }

    float invStd = 1.0f / _signalStdDev;
    for (size_t i = 0; i < N; i++) _rawFloat[i] *= invStd;

    /* ================================================================= */
    /* Step 3: Kurtosis-based movement detection                         */
    /* ================================================================= */
    float kurtosis = _computeKurtosis(_rawFloat, N);
    if (kurtosis > KURTOSIS_MOVEMENT_THRESHOLD) {
        result.movementDetected = true;
        result.heartRate        = _prevHR;
        result.respiratoryRate  = _prevRR;
        result.signalQuality    = 0.1f;
        result.qualityLevel     = QUALITY_POOR;
        return result;
    }

    /* ================================================================= */
    /* Step 4: Biquad bandpass into HR band (0.67–3 Hz), zero-phase      */
    /* ================================================================= */
    /* _biquadFilter operates in-place, so copy normalized data first */
    /* We reuse _rawFloat as the HR-filtered signal after this step   */
    _biquadFilter(_rawFloat, N, HR_FREQ_MIN_HZ, HR_FREQ_MAX_HZ);

    /* ================================================================= */
    /* Step 5: Compute signal envelope via moving RMS                    */
    /* ================================================================= */
    _computeEnvelope(_rawFloat, _envelope, N);

    /* ================================================================= */
    /* Step 6: Peak detection on envelope → extract IBIs                 */
    /* ================================================================= */
    int ibiCount = _extractIBIs(_envelope, N, _ibis, MAX_BEATS_PER_WINDOW);

    /* ================================================================= */
    /* Step 7: Truncated statistics → HR                                 */
    /* ================================================================= */
    float measuredHR = 0.0f;
    float peakAmps[MAX_BEATS_PER_WINDOW];
    int   peakCount = 0;

    if (ibiCount >= 3) {
        float meanIBI = _trimmedMeanIBI(_ibis, ibiCount);
        if (meanIBI > 0.0f) {
            measuredHR = 60.0f / meanIBI;
        }
    }

    /* Collect peak amplitudes for RR extraction.
       Peaks are at cumulative IBI positions from the envelope. */
    {
        /* Re-find peaks to get their locations and amplitudes */
        const size_t minSpacing =
            (size_t)(0.3f * GEOPHONE_SAMPLE_RATE_HZ); /* 300 ms */
        float envRms = _rms(_envelope, N);
        float threshold = envRms * 0.4f;

        size_t lastPk = 0;
        for (size_t i = 1; i + 1 < N && peakCount < MAX_BEATS_PER_WINDOW; i++) {
            if (_envelope[i] > threshold &&
                _envelope[i] > _envelope[i - 1] &&
                _envelope[i] > _envelope[i + 1]) {
                if (peakCount == 0 || (i - lastPk) >= minSpacing) {
                    peakAmps[peakCount] = _envelope[i];
                    peakCount++;
                    lastPk = i;
                }
            }
        }
    }

    /* ================================================================= */
    /* Step 8: Respiratory rate via amplitude demodulation                */
    /* ================================================================= */
    float measuredRR = 0.0f;
    if (peakCount >= 4) {
        measuredRR = _extractRespRate(_envelope, N, peakAmps, peakCount);
    }

    /* ================================================================= */
    /* Step 9: Validate & exponential smooth                             */
    /* ================================================================= */
    if (measuredHR >= HR_MIN_BPM && measuredHR <= HR_MAX_BPM) {
        result.heartRate = 0.7f * measuredHR + 0.3f * _prevHR;
        _prevHR = result.heartRate;
    } else {
        result.heartRate = _prevHR;
    }

    if (measuredRR >= RR_MIN_BPM && measuredRR <= RR_MAX_BPM) {
        result.respiratoryRate = 0.7f * measuredRR + 0.3f * _prevRR;
        _prevRR = result.respiratoryRate;
    } else {
        result.respiratoryRate = _prevRR;
    }

    /* ================================================================= */
    /* Step 10: Multi-feature signal quality                             */
    /* ================================================================= */
    result.signalQuality = _calcSignalQuality(_rawFloat, N);
    result.qualityLevel  = (result.signalQuality >= SIGNAL_QUALITY_GOOD)
                               ? QUALITY_GOOD
                           : (result.signalQuality >= SIGNAL_QUALITY_FAIR)
                               ? QUALITY_FAIR
                               : QUALITY_POOR;
    result.isValid = (result.qualityLevel != QUALITY_POOR);

    return result;
}

/* ===================================================================== */
/* Kurtosis — movement artifact detection                                */
/* ===================================================================== */

float SignalProcessor::_computeKurtosis(const float* data, size_t len) {
    /* Input is already zero-mean, unit-variance (Z-scored).
       Kurtosis = E[x^4] / (E[x^2])^2.
       For Z-scored data, E[x^2] ≈ 1, so kurtosis ≈ E[x^4].
       Normal distribution has kurtosis = 3; movement artifacts >> 5. */
    float m4 = 0.0f;
    float m2 = 0.0f;
    for (size_t i = 0; i < len; i++) {
        float x2 = data[i] * data[i];
        m2 += x2;
        m4 += x2 * x2;
    }
    m2 /= len;
    m4 /= len;
    if (m2 < 1e-10f) return 0.0f;
    return m4 / (m2 * m2);
}

/* ===================================================================== */
/* Zero-phase biquad bandpass filter                                     */
/* ===================================================================== */

/**
 * @brief Second-order Butterworth bandpass, applied forward then backward
 *        (filtfilt) for zero phase distortion.
 *
 * Implements cascaded high-pass + low-pass biquad sections.
 * Operates in-place on the data array.
 */
void SignalProcessor::_biquadFilter(float* data, size_t len,
                                    float loHz, float hiHz) {
    const float fs = static_cast<float>(GEOPHONE_SAMPLE_RATE_HZ);
    const float pi = 3.14159265358979f;

    /* ---- High-pass biquad coefficients (Butterworth, 2nd order) ---- */
    float wHP = tanf(pi * loHz / fs);
    float wHP2 = wHP * wHP;
    float qHP = 0.7071067811865f; /* 1/sqrt(2) for Butterworth */
    float normHP = 1.0f / (1.0f + wHP / qHP + wHP2);
    float b0hp =  normHP;
    float b1hp = -2.0f * normHP;
    float b2hp =  normHP;
    float a1hp = 2.0f * (wHP2 - 1.0f) * normHP;
    float a2hp = (1.0f - wHP / qHP + wHP2) * normHP;

    /* ---- Low-pass biquad coefficients (Butterworth, 2nd order) ---- */
    float wLP = tanf(pi * hiHz / fs);
    float wLP2 = wLP * wLP;
    float qLP = 0.7071067811865f;
    float normLP = 1.0f / (1.0f + wLP / qLP + wLP2);
    float b0lp = wLP2 * normLP;
    float b1lp = 2.0f * wLP2 * normLP;
    float b2lp = wLP2 * normLP;
    float a1lp = 2.0f * (wLP2 - 1.0f) * normLP;
    float a2lp = (1.0f - wLP / qLP + wLP2) * normLP;

    /* ---- Forward pass: HP then LP ---- */
    {
        float x1 = 0, x2 = 0, y1 = 0, y2 = 0;
        for (size_t i = 0; i < len; i++) {
            float x0 = data[i];
            float y0 = b0hp * x0 + b1hp * x1 + b2hp * x2
                                  - a1hp * y1 - a2hp * y2;
            x2 = x1; x1 = x0;
            y2 = y1; y1 = y0;
            data[i] = y0;
        }
    }
    {
        float x1 = 0, x2 = 0, y1 = 0, y2 = 0;
        for (size_t i = 0; i < len; i++) {
            float x0 = data[i];
            float y0 = b0lp * x0 + b1lp * x1 + b2lp * x2
                                  - a1lp * y1 - a2lp * y2;
            x2 = x1; x1 = x0;
            y2 = y1; y1 = y0;
            data[i] = y0;
        }
    }

    /* ---- Backward pass: LP then HP (reverse for zero phase) ---- */
    {
        float x1 = 0, x2 = 0, y1 = 0, y2 = 0;
        for (size_t i = len; i > 0; i--) {
            float x0 = data[i - 1];
            float y0 = b0lp * x0 + b1lp * x1 + b2lp * x2
                                  - a1lp * y1 - a2lp * y2;
            x2 = x1; x1 = x0;
            y2 = y1; y1 = y0;
            data[i - 1] = y0;
        }
    }
    {
        float x1 = 0, x2 = 0, y1 = 0, y2 = 0;
        for (size_t i = len; i > 0; i--) {
            float x0 = data[i - 1];
            float y0 = b0hp * x0 + b1hp * x1 + b2hp * x2
                                  - a1hp * y1 - a2hp * y2;
            x2 = x1; x1 = x0;
            y2 = y1; y1 = y0;
            data[i - 1] = y0;
        }
    }
}

/* ===================================================================== */
/* Envelope via moving RMS                                               */
/* ===================================================================== */

void SignalProcessor::_computeEnvelope(const float* sig, float* env,
                                       size_t len) {
    const int halfWin = ENVELOPE_WINDOW_SAMPLES / 2;

    /* Running sum-of-squares with sliding window */
    float sumSq = 0.0f;

    /* Initialize window: [0, min(halfWin, len)) */
    size_t initEnd = (size_t)halfWin < len ? (size_t)halfWin : len;
    for (size_t j = 0; j < initEnd; j++) {
        sumSq += sig[j] * sig[j];
    }

    for (size_t i = 0; i < len; i++) {
        /* Add entering sample on the right */
        int right = (int)i + halfWin;
        if (right >= 0 && (size_t)right < len) {
            sumSq += sig[right] * sig[right];
        }

        /* Remove exiting sample on the left */
        int left = (int)i - halfWin - 1;
        if (left >= 0 && (size_t)left < len) {
            sumSq -= sig[left] * sig[left];
        }

        /* Guard against numerical drift causing negative sumSq */
        if (sumSq < 0.0f) sumSq = 0.0f;

        /* Compute actual window size for this position */
        int winStart = (int)i - halfWin;
        if (winStart < 0) winStart = 0;
        int winEnd = (int)i + halfWin;
        if ((size_t)winEnd >= len) winEnd = (int)(len - 1);
        int winSize = winEnd - winStart + 1;

        env[i] = sqrtf(sumSq / (float)winSize);
    }
}

/* ===================================================================== */
/* IBI extraction — peak detection on envelope                           */
/* ===================================================================== */

/**
 * @brief Find peaks in the envelope and compute inter-beat intervals.
 * @return Number of IBIs found (= number of peaks - 1).
 */
int SignalProcessor::_extractIBIs(const float* envelope, size_t len,
                                  float* ibis, int maxIbis) {
    const size_t minSpacing =
        (size_t)(0.3f * GEOPHONE_SAMPLE_RATE_HZ); /* 300 ms min for canine HR */
    const float fs = static_cast<float>(GEOPHONE_SAMPLE_RATE_HZ);

    /* Adaptive threshold: fraction of envelope RMS */
    float envRms = _rms(envelope, len);
    float threshold = envRms * 0.4f;

    /* Collect peak indices */
    size_t peakIndices[MAX_BEATS_PER_WINDOW + 1]; /* +1 because IBIs = peaks-1 */
    int nPeaks = 0;
    size_t lastPk = 0;

    for (size_t i = 1; i + 1 < len && nPeaks <= MAX_BEATS_PER_WINDOW; i++) {
        if (envelope[i] > threshold &&
            envelope[i] > envelope[i - 1] &&
            envelope[i] > envelope[i + 1]) {
            if (nPeaks == 0 || (i - lastPk) >= minSpacing) {
                peakIndices[nPeaks] = i;
                nPeaks++;
                lastPk = i;
            }
        }
    }

    /* Compute IBIs from consecutive peaks */
    int ibiCount = 0;
    for (int k = 1; k < nPeaks && ibiCount < maxIbis; k++) {
        float ibi = (float)(peakIndices[k] - peakIndices[k - 1]) / fs;
        ibis[ibiCount++] = ibi;
    }

    return ibiCount;
}

/* ===================================================================== */
/* Truncated mean IBI — outlier-robust HR estimation                     */
/* ===================================================================== */

float SignalProcessor::_trimmedMeanIBI(float* ibis, int count) {
    if (count < 3) {
        /* Not enough IBIs — just return simple mean */
        float s = 0;
        for (int i = 0; i < count; i++) s += ibis[i];
        return count > 0 ? s / count : 0.0f;
    }

    /* Simple insertion sort (count is small, max ~40) */
    for (int i = 1; i < count; i++) {
        float key = ibis[i];
        int j = i - 1;
        while (j >= 0 && ibis[j] > key) {
            ibis[j + 1] = ibis[j];
            j--;
        }
        ibis[j + 1] = key;
    }

    /* Trim bottom and top IBI_TRIM_FRACTION */
    int trimN = (int)(count * IBI_TRIM_FRACTION);
    if (trimN < 1) trimN = 1;

    int start = trimN;
    int end   = count - trimN;
    if (end <= start) {
        /* Degenerate: just use all */
        start = 0;
        end = count;
    }

    float sum = 0.0f;
    for (int i = start; i < end; i++) sum += ibis[i];
    return sum / (float)(end - start);
}

/* ===================================================================== */
/* Respiratory rate via amplitude demodulation                           */
/* ===================================================================== */

/**
 * @brief Extract respiratory rate from the amplitude modulation of
 *        heartbeat peaks.
 *
 * The thoracic impedance changes with breathing modulate the amplitude
 * of each BCG heartbeat. By tracking the envelope peak amplitudes over
 * time, we recover the respiratory waveform. Zero-crossing counting
 * on the de-meaned amplitude series gives breaths per minute.
 */
float SignalProcessor::_extractRespRate(const float* /* envelope */,
                                        size_t /* len */,
                                        const float* peakAmps,
                                        int peakCount) {
    if (peakCount < 4) return 0.0f;

    /* De-mean the peak amplitude series */
    float ampMean = 0.0f;
    for (int i = 0; i < peakCount; i++) ampMean += peakAmps[i];
    ampMean /= peakCount;

    float demeaned[MAX_BEATS_PER_WINDOW];
    for (int i = 0; i < peakCount; i++) {
        demeaned[i] = peakAmps[i] - ampMean;
    }

    /* Count zero-crossings in the demeaned amplitude series.
       Each full respiratory cycle has 2 zero-crossings. */
    int zeroCrossings = 0;
    for (int i = 1; i < peakCount; i++) {
        if ((demeaned[i - 1] >= 0.0f && demeaned[i] < 0.0f) ||
            (demeaned[i - 1] < 0.0f  && demeaned[i] >= 0.0f)) {
            zeroCrossings++;
        }
    }

    /* Each breath = 2 zero-crossings.
       The peak amplitude series spans our 10 s window.
       RR (breaths/min) = (zeroCrossings / 2) * (60 / window_seconds) */
    float windowSec = (float)GEOPHONE_BUFFER_SIZE / (float)GEOPHONE_SAMPLE_RATE_HZ;
    float breathsInWindow = (float)zeroCrossings / 2.0f;
    float rr = breathsInWindow * (60.0f / windowSec);

    return rr;
}

/* ===================================================================== */
/* Signal quality metric                                                 */
/* ===================================================================== */

float SignalProcessor::_calcSignalQuality(const float* sig, size_t len) {
    float rmsVal = _rms(sig, len);
    float snr    = rmsVal / _baselineNoise;
    /* Clamp to [0, 1] */
    float q = snr / 10.0f;
    if (q < 0.0f) q = 0.0f;
    if (q > 1.0f) q = 1.0f;
    return q;
}

/* ===================================================================== */
/* Statistical helpers                                                   */
/* ===================================================================== */

float SignalProcessor::_mean(const float* d, size_t n) {
    if (n == 0) return 0.0f;
    float s = 0.0f;
    for (size_t i = 0; i < n; i++) s += d[i];
    return s / n;
}

float SignalProcessor::_stddev(const float* d, size_t n, float m) {
    if (n <= 1) return 0.0f;
    float s = 0.0f;
    for (size_t i = 0; i < n; i++) { float diff = d[i] - m; s += diff * diff; }
    return sqrtf(s / (n - 1));
}

float SignalProcessor::_rms(const float* d, size_t n) {
    if (n == 0) return 0.0f;
    float s = 0.0f;
    for (size_t i = 0; i < n; i++) s += d[i] * d[i];
    return sqrtf(s / n);
}
