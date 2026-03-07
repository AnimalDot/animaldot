/**
 * Backend environment configuration.
 * Validate and expose env vars for Kafka, Redis, TSDB, WebSocket.
 */

function env(key: string, defaultValue?: string): string {
  const v = process.env[key] ?? defaultValue;
  if (v === undefined) throw new Error(`Missing env: ${key}`);
  return v;
}

export const config = {
  kafka: {
    bootstrapServers: env('KAFKA_BOOTSTRAP_SERVERS', 'localhost:9092'),
    topicVitals: env('KAFKA_TOPIC_VITALS', 'animaldot.vitals'),
  },
  redis: {
    url: env('REDIS_URL', 'redis://localhost:6379'),
    streamVitals: env('REDIS_STREAM_VITALS', 'animaldot:vitals'),
  },
  influx: {
    url: env('INFLUX_URL', 'http://localhost:8086'),
    token: env('INFLUX_TOKEN', ''),
    org: env('INFLUX_ORG', 'animaldot'),
    bucket: env('INFLUX_BUCKET', 'vitals'),
  },
  websocket: {
    port: parseInt(env('WS_PORT', '3001'), 10),
    path: env('WS_PATH', '/vitals'),
  },
  mqtt: {
    brokerUrl: env('MQTT_BROKER_URL', ''),
    topicVitals: env('MQTT_TOPIC_VITALS', 'devices/+/vitals'),
  },
} as const;
