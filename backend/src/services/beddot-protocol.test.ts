import { describe, it } from 'node:test';
import assert from 'node:assert';
import { decodeBeddotPayload } from './beddot-protocol.js';

describe('beddot-protocol', () => {

  function buildPayload(sampleCount: number, sampleValues?: number[]): Buffer {
    const headerSize = 20;
    const buf = Buffer.alloc(headerSize + sampleCount * 4);

    // MAC: 30:30:f9:72:3a:e8
    buf[0] = 0x30; buf[1] = 0x30; buf[2] = 0xf9;
    buf[3] = 0x72; buf[4] = 0x3a; buf[5] = 0xe8;

    // Sample count
    buf.writeUInt16LE(sampleCount, 6);

    // Timestamp (arbitrary)
    buf.writeBigUInt64LE(BigInt(1234567890), 8);

    // Interval (10000 us = 100 Hz)
    buf.writeUInt32LE(10000, 16);

    // Samples
    for (let i = 0; i < sampleCount; i++) {
      const val = sampleValues ? sampleValues[i] : (i * 100 - 5000);
      buf.writeInt32LE(val, headerSize + i * 4);
    }

    return buf;
  }

  it('decodes a valid 424-byte payload (100 samples)', () => {
    const buf = buildPayload(100);
    assert.strictEqual(buf.length, 420);

    const frame = decodeBeddotPayload(buf);
    assert.ok(frame);
    assert.strictEqual(frame.mac, '3030f9723ae8');
    assert.strictEqual(frame.sampleCount, 100);
    assert.strictEqual(frame.intervalUs, 10000);
    assert.strictEqual(frame.samples.length, 100);
    assert.strictEqual(frame.samples[0], -5000);
    assert.strictEqual(frame.samples[50], 0);
    assert.strictEqual(frame.samples[99], 4900);
  });

  it('returns null for payload shorter than header + 1 sample', () => {
    const buf = Buffer.alloc(20); // header only, no samples
    assert.strictEqual(decodeBeddotPayload(buf), null);
  });

  it('returns null for non-aligned payload length', () => {
    // 23 bytes = 20 header + 3 (not divisible by 4)
    const buf = Buffer.alloc(23);
    assert.strictEqual(decodeBeddotPayload(buf), null);
  });

  it('correctly decodes negative int32 sample values', () => {
    const samples = [-32768, -1, 0, 1, 32767];
    const buf = buildPayload(5, samples);
    const frame = decodeBeddotPayload(buf);
    assert.ok(frame);
    assert.deepStrictEqual(Array.from(frame.samples), samples);
  });

  it('decodes single-sample payload', () => {
    const buf = buildPayload(1, [42]);
    assert.strictEqual(buf.length, 24);
    const frame = decodeBeddotPayload(buf);
    assert.ok(frame);
    assert.strictEqual(frame.samples.length, 1);
    assert.strictEqual(frame.samples[0], 42);
  });
});
