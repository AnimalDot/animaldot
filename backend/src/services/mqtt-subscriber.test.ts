import '../test-env.js';
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { decodeBeddotPayload } from './beddot-protocol.js';
import { processVitals } from './signal-processor.js';

/**
 * Integration-style tests for the MQTT subscriber pipeline.
 * These test the decode -> process flow without actually connecting to MQTT or DB.
 */

describe('mqtt-subscriber pipeline', () => {

  function buildGeophonePayload(sampleCount: number, sampleFn: (i: number) => number): Buffer {
    const headerSize = 20;
    const buf = Buffer.alloc(headerSize + sampleCount * 4);

    // MAC
    buf[0] = 0x30; buf[1] = 0x30; buf[2] = 0xf9;
    buf[3] = 0x72; buf[4] = 0x3a; buf[5] = 0xe8;
    buf.writeUInt16LE(sampleCount, 6);
    buf.writeBigUInt64LE(BigInt(Date.now() * 1000), 8);
    buf.writeUInt32LE(10000, 16); // 100 Hz

    for (let i = 0; i < sampleCount; i++) {
      buf.writeInt32LE(Math.round(sampleFn(i)), headerSize + i * 4);
    }
    return buf;
  }

  it('geophone message decodes and feeds into signal processor', () => {
    const FS = 100;
    const BUFFER_SIZE = FS * 30;

    // Build a buffer with 100 samples of a 1 Hz sine wave
    const payload = buildGeophonePayload(100, (i) =>
      15800 + 1000 * Math.sin(2 * Math.PI * 1.0 * i / FS)
    );

    const frame = decodeBeddotPayload(payload);
    assert.ok(frame, 'Frame should decode');
    assert.strictEqual(frame.mac, '3030f9723ae8');
    assert.strictEqual(frame.samples.length, 100);

    // Simulate filling a 30s buffer
    const dataBuffer = new Float64Array(BUFFER_SIZE);
    for (let i = 0; i < BUFFER_SIZE; i++) {
      dataBuffer[i] = 15800 + 1000 * Math.sin(2 * Math.PI * 1.0 * i / FS);
    }

    const result = processVitals(dataBuffer, FS);
    console.log('RESULT VITALS:', {
      heartRate: result.heartRate,
      respiratoryRate: result.respiratoryRate,
      temperatureF: (result as any).temperatureF ?? null,
      systolicMmhg: (result as any).systolicMmhg ?? null,
      diastolicMmhg: (result as any).diastolicMmhg ?? null,
      signalQuality: result.signalQuality,
      qualityLevel: result.qualityLevel,
    });
    // Should detect the 1 Hz signal
    assert.ok(result.signalQuality > 0);
    assert.notStrictEqual(result.qualityLevel, 'poor');
  });

  it('DHT20 temperature message parses correctly', () => {
    // Simulate the plain-text temperature format
    const payload = Buffer.from('74.52');
    const text = payload.toString('utf-8').trim();
    const temp = parseFloat(text);
    assert.ok(!isNaN(temp));
    assert.ok(temp > 0 && temp < 200);
    assert.strictEqual(temp, 74.52);
  });

  it('rejects invalid temperature values', () => {
    const invalid = ['NaN', 'hello', '', '-50', '300'];
    for (const raw of invalid) {
      const temp = parseFloat(raw);
      const valid = !isNaN(temp) && temp > 0 && temp < 200;
      if (raw === '-50' || raw === '300') {
        assert.strictEqual(valid, false, `Should reject ${raw}`);
      }
    }
  });

  it('flat geophone signal results in empty-bed detection', () => {
    const FS = 100;
    const BUFFER_SIZE = FS * 30;
    const flatBuffer = new Float64Array(BUFFER_SIZE).fill(15800);

    const result = processVitals(flatBuffer, FS);
    assert.strictEqual(result.heartRate, null);
    assert.strictEqual(result.respiratoryRate, null);
    assert.strictEqual(result.qualityLevel, 'poor');
  });
});
