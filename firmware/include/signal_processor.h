/**
 * @file signal_processor.h
 * @brief AnimalDot Smart Bed — DSP Module
 *
 * Extracts heart rate (HR) and respiratory rate (RR) from raw
 * geophone vibration samples using amplitude-demodulation pipeline
 * derived from the research paper:
 *
 *   "Advanced Signal Processing and Machine Learning Methodologies
 *    for Contactless Vital Sign Extraction via Bed-Mounted
 *    Geophone Sensors"
 *
 * Processing pipeline:
 *   1.  Accumulate 10 s of 200 Hz samples (2000 pts) in a ring buffer.
 *   2.  Copy to float array, DC removal, Z-score normalization.
 *   3.  Kurtosis-based movement artifact detection.
 *   4.  Zero-phase biquad bandpass into HR band (0.67–3 Hz).
 *   5.  Moving-RMS envelope extraction.
 *   6.  Peak detection on envelope → inter-beat intervals (IBIs).
 *   7.  Truncated statistics on IBIs → HR (bpm).
 *   8.  Amplitude demodulation of envelope peaks → RR (brpm).
 *   9.  Exponential smoothing.
 *   10. Multi-feature signal quality metric.
 *
 * @version 3.0.0
 */

#ifndef SIGNAL_PROCESSOR_H
#define SIGNAL_PROCESSOR_H

#include <cstdint>
#include <cstddef>
#if !defined(ANIMALDOT_CLANGD) && !defined(__clang__)
#  include <Arduino.h>
#endif
#include "config.h"

/* ---- Enumerations ---------------------------------------------------- */

/**
 * @brief Qualitative signal-quality level.
 */
enum SignalQuality : uint8_t {
    QUALITY_POOR = 0,
    QUALITY_FAIR = 1,
    QUALITY_GOOD = 2
};

/* ---- Data Structures ------------------------------------------------- */

/**
 * @brief Processed vital signs derived from geophone data.
 */
struct VitalSigns {
    float         heartRate;          /**< Beats per minute               */
    float         respiratoryRate;    /**< Breaths per minute             */
    float         signalQuality;      /**< 0.0 – 1.0                     */
    SignalQuality qualityLevel;
    bool          isValid;            /**< true when qualityLevel >= FAIR */
    bool          movementDetected;   /**< true when kurtosis > threshold */
    unsigned long timestamp;
};

/* ---- Circular Buffer ------------------------------------------------- */

/**
 * @brief Fixed-capacity ring buffer (stack-allocated).
 * @tparam T    Element type.
 * @tparam SIZE Maximum number of elements.
 */
template<typename T, size_t SIZE>
class CircularBuffer {
public:
    CircularBuffer() : _head(0), _count(0) {}

    void   push(T value)            { _buf[_head] = value;
                                      _head = (_head + 1) % SIZE;
                                      if (_count < SIZE) ++_count; }
    T      get(size_t i) const      { if (i >= _count) return T();
                                      return _buf[(_head - _count + i + SIZE) % SIZE]; }
    size_t size()    const          { return _count; }
    bool   isFull()  const          { return _count == SIZE; }
    void   clear()                  { _head = 0; _count = 0; }
    T*     data()                   { return _buf; }
    size_t capacity() const         { return SIZE; }

private:
    T      _buf[SIZE];
    size_t _head;
    size_t _count;
};

/* ---- Class ----------------------------------------------------------- */

class SignalProcessor {
public:
    SignalProcessor();

    /** @brief Feed one raw 12-bit geophone sample (centred around 0). */
    void addSample(int16_t sample);

    /**
     * @brief Run the full DSP pipeline on the current buffer.
     * @return VitalSigns snapshot; isValid=false if buffer incomplete.
     */
    VitalSigns processSignals();

    /** @name Statistics */
    ///@{
    float getSignalMean()   const { return _signalMean; }
    float getSignalStdDev() const { return _signalStdDev; }
    ///@}

    /** @brief Discard all samples and reset smoothing state. */
    void reset();

    /** @name Baseline noise (set once during initial quiet period). */
    ///@{
    void  setBaselineNoise(float n) { _baselineNoise = n; }
    float getBaselineNoise() const  { return _baselineNoise; }
    ///@}

private:
    CircularBuffer<int16_t, GEOPHONE_BUFFER_SIZE> _sampleBuf;

    /* Pre-allocated work buffers (avoid stack blowout on ESP32) */
    float _rawFloat[GEOPHONE_BUFFER_SIZE];
    float _envelope[GEOPHONE_BUFFER_SIZE];

    /* Inter-beat interval storage */
    float _ibis[MAX_BEATS_PER_WINDOW];

    float _signalMean;
    float _signalStdDev;
    float _baselineNoise;

    float _prevHR;
    float _prevRR;

    /* Research-paper pipeline methods */
    float _computeKurtosis(const float* data, size_t len);
    void  _computeEnvelope(const float* sig, float* env, size_t len);
    int   _extractIBIs(const float* envelope, size_t len,
                       float* ibis, int maxIbis);
    float _trimmedMeanIBI(float* ibis, int count);
    float _extractRespRate(const float* envelope, size_t len,
                           const float* peakAmps, int peakCount);
    void  _biquadFilter(float* data, size_t len, float loHz, float hiHz);

    /* Statistical / utility helpers */
    float _mean(const float* d, size_t n);
    float _stddev(const float* d, size_t n, float m);
    float _rms(const float* d, size_t n);
    float _calcSignalQuality(const float* sig, size_t len);
};

#endif /* SIGNAL_PROCESSOR_H */
