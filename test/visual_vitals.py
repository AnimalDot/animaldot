import sys
import struct
import threading
import numpy as np
import pyqtgraph as pg
from PyQt6.QtWidgets import QApplication
from PyQt6.QtCore import QTimer
from scipy.signal import butter, filtfilt, find_peaks
import paho.mqtt.client as mqtt
import collections

# --- CONFIGURATION ---
FS = 100
BUFFER_SECONDS = 30
BUFFER_SIZE = FS * BUFFER_SECONDS
bpm_history = collections.deque(maxlen=10)
rpm_history = collections.deque(maxlen=5)

new_data_queue = []
queue_lock = threading.Lock()
data_buffer = np.full(BUFFER_SIZE, 15800, dtype=np.float64)

# --- CREATE FILTERS ---
b_resp, a_resp = butter(2, [0.1, 0.5], btype='bandpass', fs=FS)
b_hr, a_hr = butter(2, [0.8, 2.0], btype='bandpass', fs=FS)


def autocorrelation_bpm(signal, fs, bpm_low=38, bpm_high=110):
    """
    Estimate heart rate using autocorrelation with harmonic/sub-harmonic correction.

    The BCG waveform produces multiple peaks per beat (I-J-K-L-M complex).
    This causes autocorrelation to sometimes lock onto a harmonic (half the true period).
    We detect this by checking whether a peak exists at ~2x the candidate lag.
    If so, the true rate is the sub-harmonic (longer period = lower BPM).
    """
    envelope = signal ** 2

    envelope = envelope - np.mean(envelope)
    norm = np.sqrt(np.sum(envelope ** 2))
    if norm < 1e-10:
        return None
    envelope = envelope / norm

    n = len(envelope)
    fft_size = 2 * n
    fft_env = np.fft.rfft(envelope, fft_size)
    acf = np.fft.irfft(fft_env * np.conj(fft_env), fft_size)[:n]
    acf = acf / acf[0]

    min_lag = int(fs * 60 / bpm_high)  # 110 BPM -> ~55 samples
    max_lag = int(fs * 60 / bpm_low)   #  38 BPM -> ~158 samples
    max_lag = min(max_lag, n - 1)

    search_region = acf[min_lag:max_lag + 1]
    if len(search_region) == 0:
        return None

    peaks, props = find_peaks(search_region, prominence=0.02)
    if len(peaks) == 0:
        return None

    # Sort peaks by prominence (strongest first)
    sorted_idx = np.argsort(props['prominences'])[::-1]
    peaks_sorted = peaks[sorted_idx]
    proms_sorted = props['prominences'][sorted_idx]

    best_lag = peaks_sorted[0] + min_lag
    best_prom = proms_sorted[0]

    # --- HARMONIC CORRECTION ---
    # Check if a peak exists near 2x the best lag (the sub-harmonic / true fundamental).
    # If the signal has a strong peak at lag L and also one near 2L,
    # then L is likely a harmonic and 2L is the real beat-to-beat interval.
    double_lag = best_lag * 2
    if double_lag <= max_lag:
        # Search for a peak near 2x the candidate lag (within ±15% tolerance)
        search_lo = int(double_lag * 0.85) - min_lag
        search_hi = int(double_lag * 1.15) - min_lag

        search_lo = max(0, search_lo)
        search_hi = min(len(search_region) - 1, search_hi)

        if search_hi > search_lo:
            sub_region = search_region[search_lo:search_hi + 1]
            sub_peaks, sub_props = find_peaks(sub_region, prominence=0.01)

            if len(sub_peaks) > 0:
                best_sub_idx = np.argmax(sub_props['prominences'])
                sub_prom = sub_props['prominences'][best_sub_idx]
                sub_lag = sub_peaks[best_sub_idx] + search_lo + min_lag

                # Accept the sub-harmonic if its prominence is at least 30%
                # of the harmonic peak. BCG fundamentals are often weaker
                # than their harmonics due to the multi-peak waveform shape.
                if sub_prom > best_prom * 0.30:
                    best_lag = sub_lag

    bpm = 60.0 * fs / best_lag
    return bpm


def peak_counting_bpm(hr_signal, fs):
    """Fallback peak counting with conservative gating."""
    envelope = hr_signal ** 2
    prominence_thresh = np.percentile(envelope, 80)

    peaks, _ = find_peaks(
        envelope,
        distance=int(fs * 0.85),  # Increased to 0.85s (~70 BPM max from peaks alone)
        prominence=prominence_thresh,
    )

    if len(peaks) < 4:
        return None

    intervals = np.diff(peaks) / fs
    valid = [i for i in intervals if 0.5 <= i <= 1.6]

    if len(valid) < 3:
        return None

    return 60.0 / np.median(valid)


# --- MQTT ---
def on_message(client, userdata, msg):
    if len(msg.payload) == 424:
        raw_data = msg.payload[20:420]
        samples = struct.unpack('<100i', raw_data)
        with queue_lock:
            new_data_queue.extend(samples)

client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
client.on_message = on_message
print("Connecting to sensorweb.us...")
client.connect("sensorweb.us", 1883, 60)
client.subscribe("/sensorweb/3030f9723ae8/geophone")
client.loop_start()

# --- GUI ---
app = QApplication(sys.argv)
win = pg.GraphicsLayoutWidget(show=True, title="Live Vitals Dashboard")
win.resize(1200, 800)

header_label = win.addLabel(
    text="<span style='font-size: 20pt'>Initializing... Please Lie Still.</span>", col=0
)
win.nextRow()

p_raw = win.addPlot(title="Raw Geophone Signal (Movement)")
p_raw.showGrid(x=True, y=True, alpha=0.3)
curve_raw = p_raw.plot(pen=pg.mkPen('w', width=1))
win.nextRow()

p_resp = win.addPlot(title="Filtered Respiration Wave (0.1 - 0.5 Hz)")
p_resp.showGrid(x=True, y=True, alpha=0.3)
curve_resp = p_resp.plot(pen=pg.mkPen('c', width=2))
win.nextRow()

p_hr = win.addPlot(title="Filtered Heartbeat Wave (BCG) (0.8 - 2.0 Hz)")
p_hr.showGrid(x=True, y=True, alpha=0.3)
curve_hr = p_hr.plot(pen=pg.mkPen('r', width=2))

frame_count = 0

def update_gui():
    global data_buffer, frame_count

    with queue_lock:
        if not new_data_queue:
            return
        new_samples = np.array(new_data_queue, dtype=np.float64)
        new_data_queue.clear()

    n = len(new_samples)
    if n >= BUFFER_SIZE:
        data_buffer[:] = new_samples[-BUFFER_SIZE:]
    else:
        data_buffer[:-n] = data_buffer[n:]
        data_buffer[-n:] = new_samples

    curve_raw.setData(data_buffer)

    signal_range = np.max(data_buffer) - np.min(data_buffer)
    if signal_range < 100:
        header_label.setText(
            "<span style='font-size: 20pt; color: #aaaaaa'>Status: Bed appears to be empty.</span>"
        )
        curve_resp.setData(np.zeros(BUFFER_SIZE))
        curve_hr.setData(np.zeros(BUFFER_SIZE))
        bpm_history.clear()
        rpm_history.clear()
        return

    centered = data_buffer - np.mean(data_buffer)

    resp_signal = filtfilt(b_resp, a_resp, centered)
    hr_signal = filtfilt(b_hr, a_hr, centered)

    curve_resp.setData(resp_signal)
    curve_hr.setData(hr_signal)

    frame_count += 1
    if frame_count % 10 == 0:
        # Respiration
        resp_prominence = np.std(resp_signal) * 0.5
        resp_peaks, _ = find_peaks(
            resp_signal, distance=int(FS * 1.5), prominence=resp_prominence
        )

        breaths_per_min = None
        if len(resp_peaks) > 2:
            resp_intervals = np.diff(resp_peaks) / FS
            valid_resp = [i for i in resp_intervals if 2.0 <= i <= 10.0]
            if len(valid_resp) >= 2:
                breaths_per_min = 60 / np.median(valid_resp)
                rpm_history.append(breaths_per_min)
                breaths_per_min = np.mean(rpm_history)

        # Heart Rate
        acf_bpm = autocorrelation_bpm(hr_signal, FS, bpm_low=38, bpm_high=110)
        peak_bpm = peak_counting_bpm(hr_signal, FS)

        smoothed_bpm = None

        if acf_bpm is not None:
            if peak_bpm is not None and abs(acf_bpm - peak_bpm) / acf_bpm < 0.15:
                bpm_history.append((acf_bpm + peak_bpm) / 2.0)
            else:
                bpm_history.append(acf_bpm)
            smoothed_bpm = np.mean(bpm_history)
        elif peak_bpm is not None:
            bpm_history.append(peak_bpm)
            smoothed_bpm = np.mean(bpm_history)

        # Display
        if smoothed_bpm is not None and breaths_per_min is not None:
            header_label.setText(
                f"<span style='font-size: 26pt; color: #ff5555'> Heart Rate: <b>{smoothed_bpm:.0f} BPM</b></span>"
                f"&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"
                f"<span style='font-size: 26pt; color: #55ffff'> Respiratory Rate: <b>{breaths_per_min:.0f} RPM</b></span>"
            )
        elif smoothed_bpm is not None:
            header_label.setText(
                f"<span style='font-size: 26pt; color: #ff5555'> Heart Rate: <b>{smoothed_bpm:.0f} BPM</b></span>"
                f"&nbsp;&nbsp;&nbsp;&nbsp;"
                f"<span style='font-size: 20pt; color: #ffff55'> Resp: Calculating...</span>"
            )
        else:
            header_label.setText(
                "<span style='font-size: 20pt; color: #ffff55'>Status: Calculating... (Please stay still)</span>"
            )
            bpm_history.clear()
            rpm_history.clear()


timer = QTimer()
timer.timeout.connect(update_gui)
timer.start(30)

try:
    print("Vitals Dashboard Active. Close window to exit.")
    sys.exit(app.exec())
finally:
    client.loop_stop()
    client.disconnect()