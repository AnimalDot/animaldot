/**
 * @file signal_processor.cpp
 * @brief AnimalDot Smart Bed — DSP Implementation
 *
 * Band-pass → peak-count → exponential-smooth pipeline for
 * extracting HR and RR from geophone vibration data.
 */

#include "signal_processor.h"
#include <math.h>

/* ===================================================================== */
/* Constructor / Reset                                                   */
/* ===================================================================== */

SignalProcessor::SignalProcessor()
    : _signalMean(0.0f), _signalStdDev(0.0f),
      _baselineNoise(10.0f),
      _prevHR(80.0f), _prevRR(20.0f) {
    memset(_hrFiltered, 0, sizeof(_hrFiltered));
    memset(_rrFiltered, 0, sizeof(_rrFiltered));
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
    result.isValid   = false;
    result.timestamp = millis();

    /* ---- Guard: need a full 2-second window ---- */
    if (!_sampleBuf.isFull()) {
        result.heartRate       = _prevHR;
        result.respiratoryRate = _prevRR;
        result.signalQuality   = 0.0f;
        result.qualityLevel    = QUALITY_POOR;
        return result;
    }

    const size_t N = _sampleBuf.size();

    /* ---- Convert to float, compute DC offset ---- */
    float rawSignal[GEOPHONE_BUFFER_SIZE];
    float sum = 0.0f;
    for (size_t i = 0; i < N; i++) {
        rawSignal[i] = static_cast<float>(_sampleBuf.get(i));
        sum += rawSignal[i];
    }
    _signalMean = sum / N;

    /* Remove DC */
    for (size_t i = 0; i < N; i++) rawSignal[i] -= _signalMean;

    /* ---- Standard deviation (signal energy) ---- */
    float sumSq = 0.0f;
    for (size_t i = 0; i < N; i++) sumSq += rawSignal[i] * rawSignal[i];
    _signalStdDev = sqrtf(sumSq / N);

    /* ---- Reject weak signal (pet not on bed, etc.) ---- */
    if (_signalStdDev < _baselineNoise * 1.5f) {
        result.heartRate       = _prevHR;
        result.respiratoryRate = _prevRR;
        result.signalQuality   = 0.1f;
        result.qualityLevel    = QUALITY_POOR;
        return result;
    }

    /* ---- Band-pass for HR (0.67–3 Hz = 40–180 bpm) ---- */
    _applyBandpass(_sampleBuf.data(), _hrFiltered, N,
                   HR_FREQ_MIN_HZ, HR_FREQ_MAX_HZ);

    /* ---- Band-pass for RR (0.083–1 Hz = 5–60 brpm) ---- */
    _applyBandpass(_sampleBuf.data(), _rrFiltered, N,
                   RR_FREQ_MIN_HZ, RR_FREQ_MAX_HZ);

    /* ---- Peak counting → BPM ---- */
    float hrThr = _rms(_hrFiltered, N) * PEAK_THRESHOLD_FRACTION;
    int   hrPeaks = _countPeaks(_hrFiltered, N, hrThr);
    float measuredHR = (hrPeaks / 2.0f) * 60.0f;   /* 2-s window */

    float rrThr = _rms(_rrFiltered, N) * PEAK_THRESHOLD_FRACTION;
    int   rrPeaks = _countPeaks(_rrFiltered, N, rrThr);
    float measuredRR = (rrPeaks / 2.0f) * 60.0f;

    /* ---- Validate & exponential smooth ---- */
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

    /* ---- Signal quality ---- */
    result.signalQuality = _calcSignalQuality(_hrFiltered, N);
    result.qualityLevel  = (result.signalQuality >= SIGNAL_QUALITY_GOOD)
                               ? QUALITY_GOOD
                           : (result.signalQuality >= SIGNAL_QUALITY_FAIR)
                               ? QUALITY_FAIR
                               : QUALITY_POOR;
    result.isValid = (result.qualityLevel != QUALITY_POOR);

    return result;
}

/* ===================================================================== */
/* DSP building blocks                                                   */
/* ===================================================================== */

/**
 * @brief Simple cascaded HP + LP IIR acting as a band-pass.
 *
 * Uses first-order RC-style coefficients.  Good enough for the
 * resolution we need; a proper Butterworth implementation is
 * available via _butterworthBandpass() for future upgrades.
 */
void SignalProcessor::_applyBandpass(const int16_t* in, float* out,
                                    size_t len, float loHz, float hiHz) {
    const float fs      = static_cast<float>(GEOPHONE_SAMPLE_RATE_HZ);
    float loNorm  = constrain(loHz / (fs / 2.0f), 0.001f, 0.499f);
    float hiNorm  = constrain(hiHz / (fs / 2.0f), 0.001f, 0.499f);

    float alphaHP = 1.0f / (1.0f + 2.0f * M_PI * loNorm);
    float alphaLP = 2.0f * M_PI * hiNorm / (1.0f + 2.0f * M_PI * hiNorm);

    /* High-pass */
    float hpPrev = 0.0f, hpOut = 0.0f;
    for (size_t i = 0; i < len; i++) {
        float x = static_cast<float>(in[i]);
        hpOut = alphaHP * (hpOut + x - hpPrev);
        hpPrev = x;
        out[i] = hpOut;
    }

    /* Low-pass */
    float lpPrev = 0.0f;
    for (size_t i = 0; i < len; i++) {
        lpPrev += alphaLP * (out[i] - lpPrev);
        out[i] = lpPrev;
    }
}

int SignalProcessor::_countPeaks(const float* sig, size_t len, float thr) {
    int    peaks = 0;
    size_t lastPk = 0;
    const size_t minDist =
        (GEOPHONE_SAMPLE_RATE_HZ * MIN_PEAK_INTERVAL_MS) / 1000;

    for (size_t i = 1; i + 1 < len; i++) {
        if (sig[i] > thr && sig[i] > sig[i - 1] && sig[i] > sig[i + 1]) {
            if (peaks == 0 || (i - lastPk) >= minDist) {
                peaks++;
                lastPk = i;
            }
        }
    }
    return peaks;
}

float SignalProcessor::_calcSignalQuality(const float* sig, size_t len) {
    float rmsVal = _rms(sig, len);
    float snr    = rmsVal / _baselineNoise;
    return constrain(snr / 10.0f, 0.0f, 1.0f);
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

void SignalProcessor::_butterworthBandpass(const float* in, float* out,
                                          size_t len, float lo, float hi,
                                          int order) {
    /* Cascaded first-order passes as a quick approximation.
       Replace with biquad SOS sections for production quality. */
    float* tmp = new (std::nothrow) float[len];
    if (!tmp) {
        /* Heap exhausted — fall back to single-pass */
        _applyBandpass(reinterpret_cast<const int16_t*>(in), out,
                       len, lo, hi);
        return;
    }
    memcpy(tmp, in, len * sizeof(float));
    for (int o = 0; o < order; o++) {
        _applyBandpass(reinterpret_cast<const int16_t*>(tmp), out, len, lo, hi);
        memcpy(tmp, out, len * sizeof(float));
    }
    delete[] tmp;
}
