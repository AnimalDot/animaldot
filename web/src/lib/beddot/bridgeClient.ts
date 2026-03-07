/**
 * Client for the local MQTT bridge (bridge.js).
 * Connect to ws://localhost:8080 to receive MQTT messages forwarded as JSON
 * with base64-encoded raw bytes. Payload layout: bytes 0–19 header, bytes 20+ int32 LE samples.
 */

const BRIDGE_WS_URL = 'ws://localhost:8080';
const HEADER_SIZE = 20;
const SAMPLE_BYTES = 4;

export interface BridgePacket {
  topic: string;
  data?: string; // base64 (geophone)
  temperature?: string; // DHT20 plain-text °F
}

export interface BridgeCallbacks {
  onOpen?: () => void;
  onMessage: (packet: { topic: string; bytes: Uint8Array }) => void;
  onTemperature?: (valueF: number) => void;
  onClose?: () => void;
  onError?: (err: Event) => void;
}

/**
 * Decode base64 string to raw bytes (Uint8Array). Unpack payload from byte 20 per BedDot layout.
 */
function base64ToBytes(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Decode BedDot geophone payload: bytes 20+ are int32 LE samples.
 */
export function decodeGeophoneSamples(bytes: Uint8Array): number[] {
  if (bytes.length < HEADER_SIZE + SAMPLE_BYTES) return [];
  const samples: number[] = [];
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let i = HEADER_SIZE; i + SAMPLE_BYTES <= bytes.length; i += SAMPLE_BYTES) {
    samples.push(dv.getInt32(i, true));
  }
  return samples;
}

/**
 * Connect to the local MQTT bridge. Messages are JSON { topic, data } with data as base64.
 * Returns a disconnect function.
 */
export function connectLocalBridge(callbacks: BridgeCallbacks): () => void {
  const socket = new WebSocket(BRIDGE_WS_URL);

  socket.onopen = () => {
    console.log('Connected to local MQTT Bridge!');
    callbacks.onOpen?.();
  };

  socket.onmessage = (event: MessageEvent<string>) => {
    const packet = JSON.parse(event.data) as BridgePacket;
    if (packet.temperature != null) {
      const valueF = parseFloat(packet.temperature);
      if (!Number.isNaN(valueF)) callbacks.onTemperature?.(valueF);
      return;
    }
    if (packet.data) {
      const bytes = base64ToBytes(packet.data);
      callbacks.onMessage({ topic: packet.topic, bytes });
    }
  };

  socket.onclose = () => {
    callbacks.onClose?.();
  };

  socket.onerror = (err) => {
    callbacks.onError?.(err);
  };

  return () => {
    socket.close();
  };
}
