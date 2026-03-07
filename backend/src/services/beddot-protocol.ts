/**
 * BedDot binary payload decoder.
 *
 * Payload layout (424 bytes for 100 samples):
 *   Bytes  0-5:   MAC address (6 bytes)
 *   Bytes  6-7:   data-item count (uint16 LE)
 *   Bytes  8-15:  timestamp microseconds (uint64 LE)
 *   Bytes 16-19:  sample interval microseconds (uint32 LE)
 *   Bytes 20+:    int32 LE samples (4 bytes each)
 */

const HEADER_SIZE = 20;
const SAMPLE_BYTES = 4; // int32

export interface BeddotFrame {
  mac: string;
  sampleCount: number;
  timestampUs: bigint;
  intervalUs: number;
  samples: Int32Array;
}

export function decodeBeddotPayload(buf: Buffer): BeddotFrame | null {
  if (buf.length < HEADER_SIZE + SAMPLE_BYTES) return null;

  const expectedSamples = (buf.length - HEADER_SIZE) / SAMPLE_BYTES;
  if (!Number.isInteger(expectedSamples)) return null;

  // MAC address (bytes 0-5)
  const macBytes: string[] = [];
  for (let i = 0; i < 6; i++) {
    macBytes.push(buf[i].toString(16).padStart(2, '0'));
  }
  const mac = macBytes.join('');

  const sampleCount = buf.readUInt16LE(6);
  const timestampUs = buf.readBigUInt64LE(8);
  const intervalUs = buf.readUInt32LE(16);

  // Decode int32 samples
  const samples = new Int32Array(expectedSamples);
  for (let i = 0; i < expectedSamples; i++) {
    samples[i] = buf.readInt32LE(HEADER_SIZE + i * SAMPLE_BYTES);
  }

  return { mac, sampleCount, timestampUs, intervalUs, samples };
}
