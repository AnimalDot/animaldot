/**
 * AnimalDot Smart Bed - Signal Processing Implementation
 * 
 * Digital signal processing for extracting heart rate and 
 * respiratory rate from geophone vibration data.
 */

#include "signal_processor.h"
#include <math.h>

// Constructor
SignalProcessor::SignalProcessor() 
    : signalMean(0), signalStdDev(0), baselineNoise(10.0f),
      prevHeartRate(80.0f), prevRespRate(20.0f) {
    memset(hrFilteredBuffer, 0, sizeof(hrFilteredBuffer));
    memset(rrFilteredBuffer, 0, sizeof(rrFilteredBuffer));
}

void SignalProcessor::addSample(int16_t sample) {
    sampleBuffer.push(sample);
}

void SignalProcessor::reset() {
    sampleBuffer.clear();
    prevHeartRate = 80.0f;
    prevRespRate = 20.0f;
    signalMean = 0;
    signalStdDev = 0;
}

VitalSigns SignalProcessor::processSignals() {
    VitalSigns result;
    result.isValid = false;
    result.timestamp = millis();
    
    // Need full buffer for processing
    if (!sampleBuffer.isFull()) {
        result.heartRate = prevHeartRate;
        result.respiratoryRate = prevRespRate;
        result.signalQuality = 0;
        result.qualityLevel = QUALITY_POOR;
        return result;
    }
    
    size_t length = sampleBuffer.size();
    
    // Convert samples to float and remove DC offset
    float rawSignal[GEOPHONE_BUFFER_SIZE];
    float sum = 0;
    for (size_t i = 0; i < length; i++) {
        rawSignal[i] = (float)sampleBuffer.get(i);
        sum += rawSignal[i];
    }
    signalMean = sum / length;
    
    // Remove DC offset
    for (size_t i = 0; i < length; i++) {
        rawSignal[i] -= signalMean;
    }
    
    // Calculate standard deviation
    float sumSq = 0;
    for (size_t i = 0; i < length; i++) {
        sumSq += rawSignal[i] * rawSignal[i];
    }
    signalStdDev = sqrt(sumSq / length);
    
    // Check if signal is too weak
    if (signalStdDev < baselineNoise * 1.5f) {
        result.heartRate = prevHeartRate;
        result.respiratoryRate = prevRespRate;
        result.signalQuality = 0.1f;
        result.qualityLevel = QUALITY_POOR;
        return result;
    }
    
    // Apply bandpass filter for heart rate (1-3 Hz = 60-180 bpm)
    applyBandpassFilter(sampleBuffer.data(), hrFilteredBuffer, length, 
                       HR_FREQ_MIN_HZ, HR_FREQ_MAX_HZ);
    
    // Apply bandpass filter for respiratory rate (0.1-1 Hz = 6-60 breaths/min)
    applyBandpassFilter(sampleBuffer.data(), rrFilteredBuffer, length,
                       RR_FREQ_MIN_HZ, RR_FREQ_MAX_HZ);
    
    // Detect heart rate using peak counting
    float hrThreshold = calculateRMS(hrFilteredBuffer, length) * PEAK_THRESHOLD_FRACTION;
    int hrPeaks = countPeaks(hrFilteredBuffer, length, hrThreshold);
    
    // Convert peaks to BPM (2 seconds of data)
    float measuredHR = (hrPeaks / 2.0f) * 60.0f;
    
    // Detect respiratory rate
    float rrThreshold = calculateRMS(rrFilteredBuffer, length) * PEAK_THRESHOLD_FRACTION;
    int rrPeaks = countPeaks(rrFilteredBuffer, length, rrThreshold);
    float measuredRR = (rrPeaks / 2.0f) * 60.0f;
    
    // Validate and constrain values
    if (measuredHR >= HR_MIN_BPM && measuredHR <= HR_MAX_BPM) {
        // Apply exponential smoothing
        result.heartRate = 0.7f * measuredHR + 0.3f * prevHeartRate;
        prevHeartRate = result.heartRate;
    } else {
        result.heartRate = prevHeartRate;
    }
    
    if (measuredRR >= RR_MIN_BPM && measuredRR <= RR_MAX_BPM) {
        result.respiratoryRate = 0.7f * measuredRR + 0.3f * prevRespRate;
        prevRespRate = result.respiratoryRate;
    } else {
        result.respiratoryRate = prevRespRate;
    }
    
    // Calculate signal quality
    result.signalQuality = calculateSignalQuality(hrFilteredBuffer, length);
    
    if (result.signalQuality >= SIGNAL_QUALITY_GOOD) {
        result.qualityLevel = QUALITY_GOOD;
    } else if (result.signalQuality >= SIGNAL_QUALITY_FAIR) {
        result.qualityLevel = QUALITY_FAIR;
    } else {
        result.qualityLevel = QUALITY_POOR;
    }
    
    result.isValid = (result.qualityLevel != QUALITY_POOR);
    
    return result;
}

void SignalProcessor::applyBandpassFilter(const int16_t* input, float* output,
                                         size_t length, float lowFreq, float highFreq) {
    // Simple IIR bandpass filter implementation
    // Convert frequency to normalized (0 to 0.5)
    float fs = GEOPHONE_SAMPLE_RATE_HZ;
    float lowNorm = lowFreq / (fs / 2.0f);
    float highNorm = highFreq / (fs / 2.0f);
    
    // Clamp normalized frequencies
    lowNorm = constrain(lowNorm, 0.001f, 0.499f);
    highNorm = constrain(highNorm, 0.001f, 0.499f);
    
    // First-order high-pass filter coefficients
    float alpha_hp = 1.0f / (1.0f + 2.0f * M_PI * lowNorm);
    
    // First-order low-pass filter coefficients  
    float alpha_lp = 2.0f * M_PI * highNorm / (1.0f + 2.0f * M_PI * highNorm);
    
    // Apply high-pass filter
    float hpPrev = 0;
    float hpOut = 0;
    for (size_t i = 0; i < length; i++) {
        float x = (float)input[i];
        hpOut = alpha_hp * (hpOut + x - hpPrev);
        hpPrev = x;
        output[i] = hpOut;
    }
    
    // Apply low-pass filter
    float lpPrev = 0;
    for (size_t i = 0; i < length; i++) {
        lpPrev = lpPrev + alpha_lp * (output[i] - lpPrev);
        output[i] = lpPrev;
    }
}

int SignalProcessor::countPeaks(const float* signal, size_t length, float threshold) {
    int peakCount = 0;
    bool aboveThreshold = false;
    size_t lastPeakIndex = 0;
    size_t minPeakDistance = (GEOPHONE_SAMPLE_RATE_HZ * MIN_PEAK_INTERVAL_MS) / 1000;
    
    for (size_t i = 1; i < length - 1; i++) {
        // Check if this is a local maximum above threshold
        if (signal[i] > threshold && 
            signal[i] > signal[i-1] && 
            signal[i] > signal[i+1]) {
            
            // Check minimum distance from last peak
            if (i - lastPeakIndex >= minPeakDistance || peakCount == 0) {
                peakCount++;
                lastPeakIndex = i;
            }
        }
    }
    
    return peakCount;
}

float SignalProcessor::calculateSignalQuality(const float* signal, size_t length) {
    // Calculate signal-to-noise ratio as quality metric
    float rms = calculateRMS(signal, length);
    
    // Higher RMS relative to baseline noise = better quality
    float snr = rms / baselineNoise;
    
    // Normalize to 0-1 range
    float quality = constrain(snr / 10.0f, 0.0f, 1.0f);
    
    return quality;
}

float SignalProcessor::calculateMean(const float* data, size_t length) {
    if (length == 0) return 0;
    float sum = 0;
    for (size_t i = 0; i < length; i++) {
        sum += data[i];
    }
    return sum / length;
}

float SignalProcessor::calculateStdDev(const float* data, size_t length, float mean) {
    if (length <= 1) return 0;
    float sumSq = 0;
    for (size_t i = 0; i < length; i++) {
        float diff = data[i] - mean;
        sumSq += diff * diff;
    }
    return sqrt(sumSq / (length - 1));
}

float SignalProcessor::calculateRMS(const float* data, size_t length) {
    if (length == 0) return 0;
    float sumSq = 0;
    for (size_t i = 0; i < length; i++) {
        sumSq += data[i] * data[i];
    }
    return sqrt(sumSq / length);
}

void SignalProcessor::butterworthBandpass(const float* input, float* output, 
                                         size_t length, float lowCutoff, 
                                         float highCutoff, int order) {
    // 2nd order Butterworth bandpass filter
    // Pre-calculated coefficients for common frequency ranges
    
    float fs = GEOPHONE_SAMPLE_RATE_HZ;
    float f1 = lowCutoff / fs;
    float f2 = highCutoff / fs;
    
    // Simplified implementation using cascaded first-order filters
    float* temp = new float[length];
    memcpy(temp, input, length * sizeof(float));
    
    for (int o = 0; o < order; o++) {
        applyBandpassFilter(reinterpret_cast<const int16_t*>(temp), output, 
                           length, lowCutoff, highCutoff);
        memcpy(temp, output, length * sizeof(float));
    }
    
    delete[] temp;
}
