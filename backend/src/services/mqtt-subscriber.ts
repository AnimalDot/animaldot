/**
 * MQTT subscriber for BedDot geophone and DHT20 temperature data.
 *
 * - Connects to MQTT_BROKER_URL (default: sensorweb.us)
 * - Decodes binary geophone payloads into a 30s circular buffer
 * - Processes vitals every 3 seconds via signal-processor
 * - Smooths BPM/RPM using a rolling history
 * - Inserts vitals into the database and broadcasts via WebSocket
 * - Accepts plain-text temperature from DHT20 topic
 */

import mqtt from 'mqtt';
import { config } from '../config.js';
import { pool } from '../db/pool.js';
import { decodeBeddotPayload } from './beddot-protocol.js';
import { processVitals } from './signal-processor.js';
import { broadcastVitalsToDevice } from '../websocket/server.js';

const FS = config.mqtt.sampleRate;
const BUFFER_SIZE = FS * config.mqtt.bufferSeconds;

// Circular sample buffer
const dataBuffer = new Float64Array(BUFFER_SIZE).fill(15800);

// Rolling history for smoothing
const bpmHistory: number[] = [];
const rpmHistory: number[] = [];
const BPM_HISTORY_MAX = 10;
const RPM_HISTORY_MAX = 5;

// Latest DHT20 temperature (plain-text Fahrenheit)
let latestTemperatureF: number | null = null;

// Track the device DB id for the geophone MAC
let geophoneDeviceDbId: string | null = null;

/**
 * Ensure a device row exists for the given MAC, returning its DB id.
 */
async function ensureDevice(mac: string): Promise<string> {
  const existing = await pool.query(
    'SELECT id FROM devices WHERE device_id = $1',
    [mac]
  );
  if (existing.rows.length > 0) return existing.rows[0].id;

  const inserted = await pool.query(
    `INSERT INTO devices (device_id, name) VALUES ($1, $2)
     ON CONFLICT (device_id) DO UPDATE SET last_seen_at = now()
     RETURNING id`,
    [mac, `BedDot ${mac}`]
  );
  return inserted.rows[0].id;
}

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  let sum = 0;
  for (const v of arr) sum += v;
  return sum / arr.length;
}

function handleGeophoneMessage(payload: Buffer): void {
  const frame = decodeBeddotPayload(payload);
  if (!frame) return;

  // Append samples to circular buffer
  const n = frame.samples.length;
  if (n >= BUFFER_SIZE) {
    for (let i = 0; i < BUFFER_SIZE; i++) {
      dataBuffer[i] = frame.samples[n - BUFFER_SIZE + i];
    }
  } else {
    // Shift left and append
    dataBuffer.copyWithin(0, n);
    for (let i = 0; i < n; i++) {
      dataBuffer[BUFFER_SIZE - n + i] = frame.samples[i];
    }
  }
}

let processTimer: ReturnType<typeof setInterval> | null = null;

async function processAndBroadcast(): Promise<void> {
  if (!geophoneDeviceDbId) return;

  const result = processVitals(dataBuffer, FS);

  // Smooth using history (only when metric is present and quality is not poor)
  let smoothedHr: number | null = null;
  let smoothedRr: number | null = null;

  if (result.heartRate !== null && result.qualityLevel !== 'poor') {
    bpmHistory.push(result.heartRate);
    if (bpmHistory.length > BPM_HISTORY_MAX) bpmHistory.shift();
    smoothedHr = Math.round(mean(bpmHistory));
  } else {
    bpmHistory.length = 0;
  }

  if (result.respiratoryRate !== null && result.qualityLevel !== 'poor') {
    rpmHistory.push(result.respiratoryRate);
    if (rpmHistory.length > RPM_HISTORY_MAX) rpmHistory.shift();
    smoothedRr = Math.round(mean(rpmHistory));
  } else {
    rpmHistory.length = 0;
  }

  const now = new Date().toISOString();

  try {
    // Insert vitals row
    await pool.query(
      `INSERT INTO vitals (device_id, heart_rate, respiratory_rate, temperature_f, systolic_mmhg, diastolic_mmhg, signal_quality, quality_level, recorded_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        geophoneDeviceDbId,
        smoothedHr,
        smoothedRr,
        latestTemperatureF,
        null,
        null,
        result.signalQuality,
        result.qualityLevel,
        now,
      ]
    );

    // Update device last_seen_at
    await pool.query(
      'UPDATE devices SET last_seen_at = $1 WHERE id = $2',
      [now, geophoneDeviceDbId]
    );

    // Broadcast via WebSocket
    broadcastVitalsToDevice(geophoneDeviceDbId, {
      deviceId: geophoneDeviceDbId,
      heartRate: smoothedHr ?? undefined,
      respiratoryRate: smoothedRr ?? undefined,
      temperatureF: latestTemperatureF ?? undefined,
      systolicMmhg: undefined,
      diastolicMmhg: undefined,
      signalQuality: result.signalQuality,
      qualityLevel: result.qualityLevel,
      recordedAt: now,
    });
  } catch (err) {
    console.error('Failed to insert/broadcast vitals:', err);
  }
}

function handleTemperatureMessage(payload: Buffer): void {
  const text = payload.toString('utf-8').trim();
  const temp = parseFloat(text);
  if (!isNaN(temp) && temp > 0 && temp < 200) {
    latestTemperatureF = temp;
  }
}

export async function startMqttSubscriber(): Promise<void> {
  const { brokerUrl, topicGeophone, topicTemperature, geophoneDeviceId, org } = config.mqtt;

  if (!/^[0-9a-fA-F]{12}$/.test(geophoneDeviceId)) {
    console.warn(
      '[MQTT] MQTT_GEOPHONE_DEVICE_ID should be 12 hex chars (ESP32 Wi‑Fi MAC, no colons) so topics match the firmware.',
    );
  }

  // Ensure device exists in DB
  try {
    geophoneDeviceDbId = await ensureDevice(geophoneDeviceId);
    console.log(`Geophone device DB id: ${geophoneDeviceDbId}`);
  } catch (err) {
    console.error('Failed to ensure device in DB:', err);
  }

  const client = mqtt.connect(brokerUrl, {
    clientId: `animaldot-backend-${Date.now()}`,
    keepalive: 60,
    reconnectPeriod: 5000,
  });

  client.on('connect', () => {
    console.log(`MQTT connected to ${brokerUrl} (org=${org})`);
    client.subscribe([topicGeophone, topicTemperature], (err) => {
      if (err) {
        console.error('MQTT subscribe error:', err);
      } else {
        console.log(`Subscribed to ${topicGeophone} and ${topicTemperature}`);
      }
    });
  });

  client.on('message', (topic, payload) => {
    if (topic === topicGeophone) {
      handleGeophoneMessage(payload);
    } else if (topic === topicTemperature) {
      handleTemperatureMessage(payload);
    }
  });

  client.on('error', (err) => {
    console.error('MQTT error:', err);
  });

  client.on('offline', () => {
    console.log('MQTT offline, will reconnect...');
  });

  // Process vitals at regular intervals
  processTimer = setInterval(() => {
    processAndBroadcast().catch((err) =>
      console.error('Process error:', err)
    );
  }, config.mqtt.processIntervalMs);
}
