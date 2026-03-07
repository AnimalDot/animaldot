/**
 * MQTT service for AnimalDot mobile app.
 * Connects to MQTT broker via WebSocket, receives raw geophone packets,
 * decodes them, and runs the signal processing pipeline to extract vitals.
 */

import mqtt from 'mqtt';
import { Buffer } from 'buffer';
import { processVitals } from './signalProcessor';

const FS = 100;
const VITALS_BUFFER_SECONDS = 30;
const VITALS_BUFFER_SIZE = FS * VITALS_BUFFER_SECONDS; // 3000 samples
const VITALS_UPDATE_MS = 500;
const HEADER_SIZE = 20;
const BPM_HISTORY_MAX = 10;
const RPM_HISTORY_MAX = 5;
const BED_EMPTY_THRESHOLD = 100;

export interface MqttConfig {
  brokerUrl: string;
  org: string;
  macHex: string;
}

export interface MqttVitals {
  heartRate: number | null;
  respiratoryRate: number | null;
  bedEmpty: boolean;
  signalQuality: number;
  qualityLevel: 'poor' | 'fair' | 'good';
}

export interface MqttServiceCallbacks {
  onVitalsUpdate: (vitals: MqttVitals) => void;
  onConnect: () => void;
  onDisconnect: () => void;
  onError: (err: Error) => void;
}

/**
 * Decode BedDot geophone payload: bytes 20+ are int32 LE samples.
 */
function decodeGeophoneSamples(buf: Buffer): number[] {
  if (buf.length < HEADER_SIZE + 4) return [];
  const samples: number[] = [];
  for (let i = HEADER_SIZE; i + 4 <= buf.length; i += 4) {
    samples.push(buf.readInt32LE(i));
  }
  return samples;
}

/**
 * Connect to MQTT broker and start processing raw geophone data.
 * Returns a disconnect function.
 */
export function connectMqtt(
  config: MqttConfig,
  callbacks: MqttServiceCallbacks,
): () => void {
  const client = mqtt.connect(config.brokerUrl);
  const topic = `/${config.org}/${config.macHex}/geophone`;

  // Circular buffer for 30 seconds of geophone data
  const buffer = new Float64Array(VITALS_BUFFER_SIZE);
  let writePosition = 0;

  // Smoothing history (matching Python script)
  const bpmHistory: number[] = [];
  const rpmHistory: number[] = [];

  // Periodic vitals processing
  const vitalsIntervalId = setInterval(() => {
    if (writePosition < VITALS_BUFFER_SIZE) return;

    // Extract contiguous buffer from circular buffer
    const contiguous = new Float64Array(VITALS_BUFFER_SIZE);
    for (let i = 0; i < VITALS_BUFFER_SIZE; i++) {
      contiguous[i] = buffer[(writePosition - VITALS_BUFFER_SIZE + i) % VITALS_BUFFER_SIZE];
    }

    // Bed-empty detection: signal range < threshold
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < VITALS_BUFFER_SIZE; i++) {
      if (contiguous[i] < min) min = contiguous[i];
      if (contiguous[i] > max) max = contiguous[i];
    }
    if (max - min < BED_EMPTY_THRESHOLD) {
      bpmHistory.length = 0;
      rpmHistory.length = 0;
      callbacks.onVitalsUpdate({
        heartRate: null,
        respiratoryRate: null,
        bedEmpty: true,
        signalQuality: 0,
        qualityLevel: 'poor',
      });
      return;
    }

    const result = processVitals(contiguous, FS);

    let smoothedBpm: number | null = null;
    if (result.heartRate != null) {
      bpmHistory.push(result.heartRate);
      if (bpmHistory.length > BPM_HISTORY_MAX) bpmHistory.shift();
      smoothedBpm = Math.round(
        (bpmHistory.reduce((a, b) => a + b, 0) / bpmHistory.length) * 10
      ) / 10;
    }

    let smoothedRpm: number | null = null;
    if (result.respiratoryRate != null) {
      rpmHistory.push(result.respiratoryRate);
      if (rpmHistory.length > RPM_HISTORY_MAX) rpmHistory.shift();
      smoothedRpm = Math.round(
        (rpmHistory.reduce((a, b) => a + b, 0) / rpmHistory.length) * 10
      ) / 10;
    }

    callbacks.onVitalsUpdate({
      heartRate: smoothedBpm,
      respiratoryRate: smoothedRpm,
      bedEmpty: false,
      signalQuality: result.signalQuality,
      qualityLevel: result.qualityLevel,
    });
  }, VITALS_UPDATE_MS);

  client.on('connect', () => {
    client.subscribe(topic, (err) => {
      if (err) {
        callbacks.onError(new Error(`Subscribe failed: ${err.message}`));
      } else {
        callbacks.onConnect();
      }
    });
  });

  client.on('message', (_receivedTopic: string, message: Buffer) => {
    const samples = decodeGeophoneSamples(message);
    for (const s of samples) {
      buffer[writePosition % VITALS_BUFFER_SIZE] = s;
      writePosition += 1;
    }
  });

  client.on('error', (err) => callbacks.onError(err));
  client.on('close', () => callbacks.onDisconnect());

  return () => {
    clearInterval(vitalsIntervalId);
    client.end(true);
  };
}
