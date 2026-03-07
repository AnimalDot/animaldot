import mqtt from 'mqtt';
import type { MqttConfig, VitalReading } from './types';

export interface MqttCallbacks {
  onHeartRate: (reading: VitalReading) => void;
  onRespRate: (reading: VitalReading) => void;
  onTemperature: (reading: VitalReading) => void;
  onHumidity: (reading: VitalReading) => void;
  onWeight: (reading: VitalReading) => void;
  onRawGeophone?: (samples: number[]) => void;
  onConnect: () => void;
  onDisconnect: () => void;
  onError: (err: Error) => void;
}

const MEASUREMENT_MAP: Record<string, keyof Pick<MqttCallbacks, 'onHeartRate' | 'onRespRate' | 'onTemperature' | 'onHumidity' | 'onWeight'>> = {
  heartrate: 'onHeartRate',
  resprate: 'onRespRate',
  temperature: 'onTemperature',
  humidity: 'onHumidity',
  weight: 'onWeight',
};

const HEADER_SIZE = 20;

function parseBedDotPayload(buf: ArrayBuffer): number | null {
  if (buf.byteLength < HEADER_SIZE + 4) return null;
  const dv = new DataView(buf);
  // Skip header (6B MAC + 2B count + 8B timestamp + 4B interval)
  // Read first int32 data value (little-endian), divide by 10
  const raw = dv.getInt32(HEADER_SIZE, true);
  return raw / 10;
}

export function connectMqtt(
  config: MqttConfig,
  callbacks: MqttCallbacks,
): () => void {
  const client = mqtt.connect(config.brokerUrl);
  const topic = `/${config.org}/${config.macHex}/#`;

  client.on('connect', () => {
    client.subscribe(topic, (err) => {
      if (err) {
        callbacks.onError(new Error(`Subscribe failed: ${err.message}`));
      } else {
        callbacks.onConnect();
      }
    });
  });

  client.on('message', (receivedTopic: string, message: Buffer) => {
    const parts = receivedTopic.split('/');
    const measurement = parts[parts.length - 1];

    // Raw geophone packets: decode all 100 int32 LE samples from bytes 20–420
    if (measurement === 'geophone' && callbacks.onRawGeophone) {
      const arrayBuffer = message.buffer.slice(message.byteOffset, message.byteOffset + message.byteLength) as ArrayBuffer;
      if (arrayBuffer.byteLength < HEADER_SIZE + 4) return;
      const dv = new DataView(arrayBuffer);
      const samples: number[] = [];
      for (let i = HEADER_SIZE; i + 4 <= arrayBuffer.byteLength; i += 4) {
        samples.push(dv.getInt32(i, true));
      }
      callbacks.onRawGeophone(samples);
      return;
    }

    const callbackKey = MEASUREMENT_MAP[measurement];
    if (!callbackKey) return;

    const arrayBuffer = message.buffer.slice(message.byteOffset, message.byteOffset + message.byteLength) as ArrayBuffer;
    const value = parseBedDotPayload(arrayBuffer);
    if (value === null) return;

    callbacks[callbackKey]({ value: parseFloat(value.toFixed(1)), timestamp: Date.now() });
  });

  client.on('error', (err) => callbacks.onError(err));
  client.on('close', () => callbacks.onDisconnect());

  return () => {
    client.end(true);
  };
}
