/**
 * AnimalDot Smart Bed - Signal Processing Module
 * 
 * Implements digital signal processing for extracting heart rate
 * and respiratory rate from geophone vibration data.
 */

#ifndef SIGNAL_PROCESSOR_H
#define SIGNAL_PROCESSOR_H

#include <Arduino.h>
#include "config.h"

// Signal quality enumeration
enum SignalQuality {
    QUALITY_POOR = 0,
    QUALITY_FAIR = 1,
    QUALITY_GOOD = 2
};

// Vital signs data structure
struct VitalSigns {
    float heartRate;        // beats per minute
    float respiratoryRate;  // breaths per minute
    float signalQuality;    // 0.0 to 1.0
    SignalQuality qualityLevel;
    bool isValid;
    unsigned long timestamp;
};

// Circular buffer for efficient sample storage
template<typename T, size_t SIZE>
class CircularBuffer {
private:
    T buffer[SIZE];
    size_t head = 0;
    size_t count = 0;
    
public:
    void push(T value) {
        buffer[head] = value;
        head = (head + 1) % SIZE;
        if (count < SIZE) count++;
    }
    
    T get(size_t index) const {
        if (index >= count) return T();
        size_t actualIndex = (head - count + index + SIZE) % SIZE;
        return buffer[actualIndex];
    }
    
    size_t size() const { return count; }
    bool isFull() const { return count == SIZE; }
    void clear() { head = 0; count = 0; }
    
    T* data() { return buffer; }
    size_t capacity() const { return SIZE; }
};

class SignalProcessor {
public:
    SignalProcessor();
    
    // Add a new geophone sample
    void addSample(int16_t sample);
    
    // Process accumulated samples and extract vital signs
    VitalSigns processSignals();
    
    // Get raw signal statistics
    float getSignalMean() const { return signalMean; }
    float getSignalStdDev() const { return signalStdDev; }
    
    // Reset processor state
    void reset();
    
    // Calibration
    void setBaselineNoise(float noise) { baselineNoise = noise; }
    float getBaselineNoise() const { return baselineNoise; }
    
private:
    // Sample buffer
    CircularBuffer<int16_t, GEOPHONE_BUFFER_SIZE> sampleBuffer;
    
    // Filtered signals
    float hrFilteredBuffer[GEOPHONE_BUFFER_SIZE];
    float rrFilteredBuffer[GEOPHONE_BUFFER_SIZE];
    
    // Signal statistics
    float signalMean;
    float signalStdDev;
    float baselineNoise;
    
    // Previous vital signs for smoothing
    float prevHeartRate;
    float prevRespRate;
    
    // Processing functions
    void applyBandpassFilter(const int16_t* input, float* output, 
                            size_t length, float lowFreq, float highFreq);
    float detectPeakFrequency(const float* signal, size_t length,
                             float minFreq, float maxFreq);
    float calculateSignalQuality(const float* signal, size_t length);
    
    // Butterworth filter implementation
    void butterworthBandpass(const float* input, float* output, size_t length,
                            float lowCutoff, float highCutoff, int order);
    
    // Peak detection
    int countPeaks(const float* signal, size_t length, float threshold);
    
    // Statistical functions
    float calculateMean(const float* data, size_t length);
    float calculateStdDev(const float* data, size_t length, float mean);
    float calculateRMS(const float* data, size_t length);
};

#endif // SIGNAL_PROCESSOR_H
