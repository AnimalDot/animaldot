import Foundation
import Accelerate
import Combine

// MARK: - Configuration

/// All constants match test/visual_vitals.py exactly.
private let kFS: Double = 100.0
private let kBufferSeconds = 30
private let kBufferSize = Int(kFS) * kBufferSeconds          // 3000
private let kBPMHistoryMax = 10
private let kRPMHistoryMax = 5
private let kBedEmptyThreshold: Double = 100.0
private let kDSPFrameInterval = 10                           // run DSP every 10 frames

// 2nd-order Butterworth bandpass coefficients (scipy.signal.butter output at fs=100).
// These are 4th-order IIR (order = len(b)-1 = 4) because bandpass doubles the order.

/// Respiration band: 0.1 – 0.5 Hz
private let respB: [Double] = [
    0.00036216815149286824, 0, -0.0007243363029857365, 0, 0.00036216815149286824
]
private let respA: [Double] = [
    1, -3.9461068440066254, 5.8396791020498395, -3.8461506264946987, 0.9526131025975979
]

/// Heart rate band: 0.8 – 2.0 Hz
private let hrB: [Double] = [
    0.002080567135492847, 0, -0.004161134270985694, 0, 0.002080567135492847
]
private let hrA: [Double] = [
    1, -3.7554591573498667, 5.3220545860498855, -3.3717803750093735, 0.805773804293826
]

// MARK: - SignalProcessor

final class SignalProcessor: ObservableObject {

    // MARK: Published outputs

    @Published private(set) var rawSamples: [Double] = []
    @Published private(set) var respSamples: [Double] = []
    @Published private(set) var hrSamples: [Double] = []
    @Published private(set) var currentBPM: Double?
    @Published private(set) var currentRPM: Double?

    // MARK: Internal state

    private var buffer = [Double](repeating: 15800, count: kBufferSize)
    private var bpmHistory: [Double] = []
    private var rpmHistory: [Double] = []
    private var frameCount = 0

    // MARK: - Public API

    /// Feed new samples (typically 100 per packet) into the rolling buffer.
    /// DSP runs every `kDSPFrameInterval` calls.
    func push(samples: [Int32]) {
        let incoming = samples.map(Double.init)
        let n = incoming.count

        if n >= kBufferSize {
            buffer = Array(incoming.suffix(kBufferSize))
        } else {
            buffer.removeFirst(n)
            buffer.append(contentsOf: incoming)
        }

        // Always publish the raw waveform so the chart updates every packet.
        rawSamples = buffer

        frameCount += 1
        guard frameCount % kDSPFrameInterval == 0 else { return }

        processBuffer()
    }

    /// Reset all state (e.g. on disconnect).
    func reset() {
        buffer = [Double](repeating: 15800, count: kBufferSize)
        bpmHistory.removeAll()
        rpmHistory.removeAll()
        frameCount = 0
        rawSamples = []
        respSamples = []
        hrSamples = []
        currentBPM = nil
        currentRPM = nil
    }

    // MARK: - DSP Pipeline (mirrors update_gui in visual_vitals.py)

    private func processBuffer() {

        // --- Bed-empty detection ---
        var minVal: Double = 0, maxVal: Double = 0
        vDSP_minvD(buffer, 1, &minVal, vDSP_Length(kBufferSize))
        vDSP_maxvD(buffer, 1, &maxVal, vDSP_Length(kBufferSize))
        let signalRange = maxVal - minVal

        if signalRange < kBedEmptyThreshold {
            respSamples = [Double](repeating: 0, count: kBufferSize)
            hrSamples = [Double](repeating: 0, count: kBufferSize)
            bpmHistory.removeAll()
            rpmHistory.removeAll()
            currentBPM = nil
            currentRPM = nil
            return
        }

        // --- DC removal ---
        var mean: Double = 0
        vDSP_meanvD(buffer, 1, &mean, vDSP_Length(kBufferSize))
        var negMean = -mean
        var centered = [Double](repeating: 0, count: kBufferSize)
        vDSP_vsaddD(buffer, 1, &negMean, &centered, 1, vDSP_Length(kBufferSize))

        // --- Bandpass filtering (filtfilt = zero-phase) ---
        let respSignal = filtfilt(b: respB, a: respA, x: centered)
        let hrSignal   = filtfilt(b: hrB, a: hrA, x: centered)

        respSamples = respSignal
        hrSamples = hrSignal

        // --- Respiration rate via peak detection ---
        computeRespirationRate(respSignal: respSignal)

        // --- Heart rate ---
        computeHeartRate(hrSignal: hrSignal)
    }

    // MARK: - Respiration Rate (matches Python lines 207-219)

    private func computeRespirationRate(respSignal: [Double]) {
        let respProminence = standardDeviation(respSignal) * 0.5
        let minDist = Int(kFS * 1.5)  // 150 samples

        let peaks = findPeaks(respSignal, minDistance: minDist, minProminence: respProminence)

        guard peaks.count > 2 else { return }

        var validIntervals: [Double] = []
        for i in 1 ..< peaks.count {
            let interval = Double(peaks[i] - peaks[i - 1]) / kFS
            if interval >= 2.0 && interval <= 10.0 {
                validIntervals.append(interval)
            }
        }
        guard validIntervals.count >= 2 else { return }

        let medianInterval = median(validIntervals)
        let breathsPerMin = 60.0 / medianInterval

        rpmHistory.append(breathsPerMin)
        if rpmHistory.count > kRPMHistoryMax { rpmHistory.removeFirst() }
        currentRPM = vDSP.mean(rpmHistory)
    }

    // MARK: - Heart Rate (matches Python lines 222-255)

    private func computeHeartRate(hrSignal: [Double]) {
        let acfBPM  = autocorrelationBPM(signal: hrSignal, fs: kFS, bpmLow: 38, bpmHigh: 110)
        let peakBPM = peakCountingBPM(hrSignal: hrSignal, fs: kFS)

        var chosen: Double?

        if let acf = acfBPM {
            if let pk = peakBPM, abs(acf - pk) / acf < 0.15 {
                chosen = (acf + pk) / 2.0
            } else {
                chosen = acf
            }
        } else if let pk = peakBPM {
            chosen = pk
        }

        if let bpm = chosen {
            bpmHistory.append(bpm)
            if bpmHistory.count > kBPMHistoryMax { bpmHistory.removeFirst() }
            currentBPM = vDSP.mean(bpmHistory)
        } else {
            bpmHistory.removeAll()
            rpmHistory.removeAll()
            currentBPM = nil
            currentRPM = nil
        }
    }

    // MARK: - Autocorrelation BPM (matches Python autocorrelation_bpm)

    private func autocorrelationBPM(signal: [Double], fs: Double, bpmLow: Double, bpmHigh: Double) -> Double? {
        let n = signal.count

        // envelope = signal ** 2
        var envelope = [Double](repeating: 0, count: n)
        vDSP_vsqD(signal, 1, &envelope, 1, vDSP_Length(n))

        // subtract mean
        var envMean: Double = 0
        vDSP_meanvD(envelope, 1, &envMean, vDSP_Length(n))
        var negEnvMean = -envMean
        vDSP_vsaddD(envelope, 1, &negEnvMean, &envelope, 1, vDSP_Length(n))

        // normalize
        var sumSq: Double = 0
        vDSP_dotprD(envelope, 1, envelope, 1, &sumSq, vDSP_Length(n))
        let norm = sqrt(sumSq)
        guard norm > 1e-10 else { return nil }
        var invNorm = 1.0 / norm
        vDSP_vsmulD(envelope, 1, &invNorm, &envelope, 1, vDSP_Length(n))

        // Autocorrelation via FFT: ACF = IFFT(|FFT(x)|^2)
        let fftSize = nextPow2(2 * n)
        let log2n = vDSP_Length(log2(Double(fftSize)))
        guard let fftSetup = vDSP_create_fftsetupD(log2n, FFTRadix(kFFTRadix2)) else { return nil }
        defer { vDSP_destroy_fftsetupD(fftSetup) }

        // Pack into split complex (real part = envelope, zero-padded)
        var realPart = [Double](repeating: 0, count: fftSize)
        for i in 0 ..< n { realPart[i] = envelope[i] }
        var imagPart = [Double](repeating: 0, count: fftSize)

        // Convert to split complex for vDSP
        var splitReal = [Double](repeating: 0, count: fftSize / 2)
        var splitImag = [Double](repeating: 0, count: fftSize / 2)

        // Interleaved -> split
        realPart.withUnsafeBufferPointer { rBuf in
            imagPart.withUnsafeBufferPointer { iBuf in
                var interleaved = DSPDoubleSplitComplex(realp: UnsafeMutablePointer(mutating: rBuf.baseAddress!),
                                                        imagp: UnsafeMutablePointer(mutating: iBuf.baseAddress!))
                splitReal.withUnsafeMutableBufferPointer { sr in
                    splitImag.withUnsafeMutableBufferPointer { si in
                        var split = DSPDoubleSplitComplex(realp: sr.baseAddress!, imagp: si.baseAddress!)
                        vDSP_ctozD(&interleaved, 2, &split, 1, vDSP_Length(fftSize / 2))
                    }
                }
            }
        }

        // Forward FFT
        splitReal.withUnsafeMutableBufferPointer { sr in
            splitImag.withUnsafeMutableBufferPointer { si in
                var split = DSPDoubleSplitComplex(realp: sr.baseAddress!, imagp: si.baseAddress!)
                vDSP_fft_zripD(fftSetup, &split, 1, log2n, FFTDirection(kFFTDirection_Forward))
            }
        }

        // Power spectrum: re[i] = re[i]^2 + im[i]^2, im[i] = 0
        for i in 0 ..< splitReal.count {
            splitReal[i] = splitReal[i] * splitReal[i] + splitImag[i] * splitImag[i]
            splitImag[i] = 0
        }

        // Inverse FFT
        splitReal.withUnsafeMutableBufferPointer { sr in
            splitImag.withUnsafeMutableBufferPointer { si in
                var split = DSPDoubleSplitComplex(realp: sr.baseAddress!, imagp: si.baseAddress!)
                vDSP_fft_zripD(fftSetup, &split, 1, log2n, FFTDirection(kFFTDirection_Inverse))
            }
        }

        // Unpack split -> interleaved to get the ACF
        var acfFull = [Double](repeating: 0, count: fftSize)
        var acfImag = [Double](repeating: 0, count: fftSize)
        splitReal.withUnsafeMutableBufferPointer { sr in
            splitImag.withUnsafeMutableBufferPointer { si in
                var split = DSPDoubleSplitComplex(realp: sr.baseAddress!, imagp: si.baseAddress!)
                acfFull.withUnsafeMutableBufferPointer { ar in
                    acfImag.withUnsafeMutableBufferPointer { ai in
                        var inter = DSPDoubleSplitComplex(realp: ar.baseAddress!, imagp: ai.baseAddress!)
                        vDSP_ztocD(&split, 1, &inter, 2, vDSP_Length(fftSize / 2))
                    }
                }
            }
        }

        // Normalize: vDSP inverse FFT doesn't divide by N, and we also need acf/acf[0].
        // Scale factor for vDSP_fft_zripD round-trip is fftSize/2.
        let scale = 2.0 / Double(fftSize)
        var acf = [Double](repeating: 0, count: n)
        for i in 0 ..< n {
            acf[i] = acfFull[i] * scale
        }
        guard acf[0] != 0 else { return nil }
        let invAcf0 = 1.0 / acf[0]
        for i in 0 ..< n { acf[i] *= invAcf0 }

        // --- Search for peaks in the valid lag range ---
        let minLag = Int(fs * 60.0 / bpmHigh)   // 110 BPM -> ~55
        let maxLag = min(Int(fs * 60.0 / bpmLow), n - 1) // 38 BPM -> ~158

        guard maxLag > minLag else { return nil }

        let searchRegion = Array(acf[minLag ... maxLag])

        let peaks = findPeaksWithProminence(searchRegion, minProminence: 0.02)
        guard !peaks.isEmpty else { return nil }

        // Sort by prominence descending
        let sorted = peaks.sorted { $0.prominence > $1.prominence }
        var bestLag = sorted[0].index + minLag
        let bestProm = sorted[0].prominence

        // --- Harmonic correction (Python lines 72-97) ---
        let doubleLag = bestLag * 2
        if doubleLag <= maxLag {
            let searchLo = max(0, Int(Double(doubleLag) * 0.85) - minLag)
            let searchHi = min(searchRegion.count - 1, Int(Double(doubleLag) * 1.15) - minLag)

            if searchHi > searchLo {
                let subRegion = Array(searchRegion[searchLo ... searchHi])
                let subPeaks = findPeaksWithProminence(subRegion, minProminence: 0.01)
                if let best = subPeaks.max(by: { $0.prominence < $1.prominence }) {
                    if best.prominence > bestProm * 0.30 {
                        bestLag = best.index + searchLo + minLag
                    }
                }
            }
        }

        return 60.0 * fs / Double(bestLag)
    }

    // MARK: - Peak-Counting BPM (matches Python peak_counting_bpm)

    private func peakCountingBPM(hrSignal: [Double], fs: Double) -> Double? {
        let n = hrSignal.count
        var envelope = [Double](repeating: 0, count: n)
        vDSP_vsqD(hrSignal, 1, &envelope, 1, vDSP_Length(n))

        // 80th percentile prominence threshold
        let sortedEnv = envelope.sorted()
        let prominenceThresh = sortedEnv[Int(Double(n) * 0.8)]

        let minDistance = Int(fs * 0.85)

        // Find peaks with minimum distance and prominence
        var peaks: [Int] = []
        for i in 1 ..< n - 1 {
            if envelope[i] > envelope[i - 1] && envelope[i] > envelope[i + 1] {
                if envelope[i] > prominenceThresh {
                    if peaks.isEmpty || (i - peaks.last!) >= minDistance {
                        peaks.append(i)
                    }
                }
            }
        }

        guard peaks.count >= 4 else { return nil }

        var validIntervals: [Double] = []
        for i in 1 ..< peaks.count {
            let interval = Double(peaks[i] - peaks[i - 1]) / fs
            if interval >= 0.5 && interval <= 1.6 {
                validIntervals.append(interval)
            }
        }

        guard validIntervals.count >= 3 else { return nil }

        return 60.0 / median(validIntervals)
    }

    // MARK: - IIR Filter (forward pass)

    /// Direct-form II transposed IIR filter, matching scipy.signal.lfilter.
    private static func iirFilter(b: [Double], a: [Double], x: [Double]) -> [Double] {
        let n = x.count
        let order = b.count - 1
        var y = [Double](repeating: 0, count: n)

        for i in 0 ..< n {
            var sum = 0.0
            for j in 0 ... order where i - j >= 0 {
                sum += b[j] * x[i - j]
            }
            for j in 1 ... order where i - j >= 0 {
                sum -= a[j] * y[i - j]
            }
            y[i] = sum
        }
        return y
    }

    // MARK: - filtfilt (zero-phase filtering, matches scipy.signal.filtfilt)

    /// Zero-phase digital filtering: forward then backward IIR pass with edge padding.
    private func filtfilt(b: [Double], a: [Double], x: [Double]) -> [Double] {
        let n = x.count
        let padLen = min(3 * max(b.count, a.count), n - 1)

        // Reflect-pad the signal at both ends
        var padded = [Double](repeating: 0, count: n + 2 * padLen)
        for i in 0 ..< padLen {
            padded[i] = 2.0 * x[0] - x[padLen - i]
        }
        for i in 0 ..< n {
            padded[padLen + i] = x[i]
        }
        for i in 0 ..< padLen {
            padded[padLen + n + i] = 2.0 * x[n - 1] - x[n - 2 - i]
        }

        // Forward pass
        let forward = SignalProcessor.iirFilter(b: b, a: a, x: padded)

        // Reverse
        let reversed = [Double](forward.reversed())

        // Backward pass
        let backward = SignalProcessor.iirFilter(b: b, a: a, x: reversed)

        // Extract the valid center portion (reversed again)
        var result = [Double](repeating: 0, count: n)
        for i in 0 ..< n {
            result[i] = backward[backward.count - 1 - padLen - i]
        }
        return result
    }

    // MARK: - Peak Detection Helpers

    private struct PeakInfo {
        let index: Int
        let prominence: Double
    }

    /// Find peaks with local prominence (difference from neighbors).
    /// Used for autocorrelation search regions.
    private func findPeaksWithProminence(_ data: [Double], minProminence: Double) -> [PeakInfo] {
        var peaks: [PeakInfo] = []
        for i in 1 ..< data.count - 1 {
            if data[i] > data[i - 1] && data[i] > data[i + 1] {
                let prominence = data[i] - max(data[i - 1], data[i + 1])
                if prominence >= minProminence {
                    peaks.append(PeakInfo(index: i, prominence: prominence))
                }
            }
        }
        return peaks
    }

    /// Find peaks with minimum distance and minimum value threshold.
    /// Used for respiration and peak-counting BPM.
    private func findPeaks(_ data: [Double], minDistance: Int, minProminence: Double) -> [Int] {
        var peaks: [Int] = []
        for i in 1 ..< data.count - 1 {
            if data[i] > data[i - 1] && data[i] > data[i + 1] {
                let prominence = data[i] - max(data[i - 1], data[i + 1])
                if prominence >= minProminence {
                    if peaks.isEmpty || (i - peaks.last!) >= minDistance {
                        peaks.append(i)
                    }
                }
            }
        }
        return peaks
    }

    // MARK: - Utility

    private func nextPow2(_ n: Int) -> Int {
        var p = 1
        while p < n { p <<= 1 }
        return p
    }

    private func standardDeviation(_ data: [Double]) -> Double {
        let n = vDSP_Length(data.count)
        var mean: Double = 0
        vDSP_meanvD(data, 1, &mean, n)
        var negMean = -mean
        var centered = [Double](repeating: 0, count: data.count)
        vDSP_vsaddD(data, 1, &negMean, &centered, 1, n)
        var sumSq: Double = 0
        vDSP_dotprD(centered, 1, centered, 1, &sumSq, n)
        return sqrt(sumSq / Double(data.count))
    }

    private func median(_ values: [Double]) -> Double {
        let sorted = values.sorted()
        let mid = sorted.count / 2
        if sorted.count % 2 == 0 {
            return (sorted[mid - 1] + sorted[mid]) / 2.0
        }
        return sorted[mid]
    }
}
