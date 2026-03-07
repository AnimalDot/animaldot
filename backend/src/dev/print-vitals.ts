/**
 * Live vitals printer: connects to the geophone MQTT stream, fills a 30s buffer,
 * and runs the real signal-processor formulas every second. Prints HR, RR, BP
 * (estimated from HR until a dedicated model exists), temperature, quality, and
 * raw geophone stats/sample with decimals.
 *
 * Prereqs: bridge or MQTT broker with geophone + DHT20 temperature.
 * Run: npm run dev:print-vitals
 */

import 'dotenv/config';
import mqtt from 'mqtt';
import { config } from '../config.js';
import { decodeBeddotPayload } from '../services/beddot-protocol.js';
import { processVitals, debugRespBand } from '../services/signal-processor.js';

const FS = config.mqtt.sampleRate;
const BUFFER_SIZE = FS * config.mqtt.bufferSeconds;
const PRINT_INTERVAL_MS = 1000;

const dataBuffer = new Float64Array(BUFFER_SIZE).fill(15800);
let latestTemperatureF: number | null = null;
let lastMessageAt = 0;

function pushGeophoneSamples(samples: Int32Array): void {
  const n = samples.length;
  if (n >= BUFFER_SIZE) {
    for (let i = 0; i < BUFFER_SIZE; i++) {
      dataBuffer[i] = samples[n - BUFFER_SIZE + i];
    }
  } else {
    dataBuffer.copyWithin(0, n);
    for (let i = 0; i < n; i++) {
      dataBuffer[BUFFER_SIZE - n + i] = samples[i];
    }
  }
}

function printVitals(): void {
  const result = processVitals(dataBuffer, FS);
  const timestamp = new Date().toISOString();

  const heartRate =
    result.heartRate != null ? Number(result.heartRate.toFixed(2)) : null;
  const respiratoryRate =
    result.respiratoryRate != null ? Number(result.respiratoryRate.toFixed(2)) : null;

  // Empirical BP estimate from HR (for display until a dedicated BP model is available)
  const systolicMmhg =
    heartRate != null ? Number((100 + heartRate * 0.35).toFixed(1)) : null;
  const diastolicMmhg =
    heartRate != null ? Number((60 + heartRate * 0.2).toFixed(1)) : null;

  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  for (let i = 0; i < BUFFER_SIZE; i++) {
    const v = dataBuffer[i];
    if (v < min) min = v;
    if (v > max) max = v;
    sum += v;
  }
  const mean = sum / BUFFER_SIZE;
  const rawSample = Array.from(dataBuffer.slice(0, 20)).map((v) =>
    Number(v.toFixed(2))
  );

  const respDebug = debugRespBand(dataBuffer, FS);
  const respSamplePreview = respDebug.sample.slice(0, 20).map((v) =>
    Number(v.toFixed(4))
  );

  const age = lastMessageAt ? Math.round((Date.now() - lastMessageAt) / 1000) : null;

  console.log(`[${timestamp}] VITALS (live geophone, formulas)`, {
    heartRate,
    respiratoryRate,
    temperatureF: latestTemperatureF != null ? Number(latestTemperatureF.toFixed(2)) : null,
    systolicMmhg,
    diastolicMmhg,
    signalQuality: Number(result.signalQuality.toFixed(3)),
    qualityLevel: result.qualityLevel,
    rawGeophoneStats: {
      min: Number(min.toFixed(2)),
      max: Number(max.toFixed(2)),
      mean: Number(mean.toFixed(2)),
    },
    rawGeophoneSample: rawSample,
    respBand: {
      std: Number(respDebug.std.toFixed(6)),
      min: Number(respDebug.min.toFixed(6)),
      max: Number(respDebug.max.toFixed(6)),
      sample: respSamplePreview,
    },
    lastGeophoneSecAgo: age,
  });
}

const client = mqtt.connect(config.mqtt.brokerUrl, {
  clientId: `animaldot-print-vitals-${Date.now()}`,
  keepalive: 60,
  reconnectPeriod: 5000,
});

client.on('connect', () => {
  console.log(`Connected to ${config.mqtt.brokerUrl}`);
  client.subscribe([config.mqtt.topicGeophone, config.mqtt.topicTemperature], (err) => {
    if (err) {
      console.error('Subscribe error:', err);
      process.exit(1);
    }
    console.log(`Subscribed to geophone + temperature. Printing vitals every ${PRINT_INTERVAL_MS}ms...`);
  });
});

client.on('message', (topic, payload) => {
  if (topic === config.mqtt.topicTemperature) {
    const text = payload.toString('utf-8').trim();
    const temp = parseFloat(text);
    if (!Number.isNaN(temp) && temp > 0 && temp < 200) {
      latestTemperatureF = temp;
    }
    return;
  }
  if (topic === config.mqtt.topicGeophone) {
    lastMessageAt = Date.now();
    const frame = decodeBeddotPayload(payload as Buffer);
    if (frame) {
      pushGeophoneSamples(frame.samples);
    }
  }
});

client.on('error', (err) => console.error('MQTT error:', err));

setInterval(printVitals, PRINT_INTERVAL_MS);

// Print once after 2s so user sees something before first interval
setTimeout(printVitals, 2000);
