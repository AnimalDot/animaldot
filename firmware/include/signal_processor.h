/**
 * @file signal_processor.h
 * @brief AnimalDot Smart Bed — DSP Module
 *
 * Extracts heart rate (HR) and respiratory rate (RR) from raw
 * geophone vibration samples.  Processing pipeline:
 *
 *   1. Accumulate 2 s of 200 Hz samples (400 pts) in a ring buffer.
 *   2. Remove DC offset.
 *   3. Band-pass filter into HR band (0.67–3 Hz) and RR band (0.08–1 Hz).
 *   4. Peak-count in each band → beats/breaths per minute.
 *   5. Exponential smoothing to reject transients.
 *   6. Signal-quality metric (SNR-based, 0–1).
 *
 * @version 2.0.0
 */

#ifndef SIGNAL_PROCESSOR_H
#define SIGNAL_PROCESSOR_H

#include <Arduino.h>
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
    bool          isValid;            /**< true when qualityLevel ≥ FAIR  */
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

    float _hrFiltered[GEOPHONE_BUFFER_SIZE];
    float _rrFiltered[GEOPHONE_BUFFER_SIZE];

    float _signalMean;
    float _signalStdDev;
    float _baselineNoise;

    float _prevHR;
    float _prevRR;

    /* DSP building blocks */
    void  _applyBandpass(const int16_t* in, float* out,
                         size_t len, float loHz, float hiHz);
    float _detectPeakFreq(const float* sig, size_t len,
                          float minHz, float maxHz);
    float _calcSignalQuality(const float* sig, size_t len);
    int   _countPeaks(const float* sig, size_t len, float threshold);

    /* Helpers */
    void  _butterworthBandpass(const float* in, float* out,
                               size_t len, float lo, float hi, int order);
    float _mean(const float* d, size_t n);
    float _stddev(const float* d, size_t n, float m);
    float _rms(const float* d, size_t n);
};

#endif /* SIGNAL_PROCESSOR_H */
