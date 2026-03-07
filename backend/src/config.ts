import 'dotenv/config';

function env(key: string, defaultValue?: string): string {
  const v = process.env[key] ?? defaultValue;
  if (v === undefined) throw new Error(`Missing env: ${key}`);
  return v;
}

export const config = {
  port: parseInt(env('API_PORT', '3000'), 10),
  nodeEnv: env('NODE_ENV', 'development'),
  database: {
    url: env('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/animaldot'),
  },
  jwt: {
    accessSecret: env('JWT_ACCESS_SECRET', 'dev-access-secret-change-in-production'),
    refreshSecret: env('JWT_REFRESH_SECRET', 'dev-refresh-secret-change-in-production'),
    accessExpiresIn: '15m',
    refreshExpiresIn: '7d',
  },
  cors: {
    origin: env('CORS_ORIGIN', 'http://localhost:5173'),
  },
  mqtt: {
    brokerUrl: env('MQTT_BROKER_URL', 'mqtt://sensorweb.us:1883'),
    topicGeophone: env('MQTT_TOPIC_GEOPHONE', '/sensorweb/3030f9723ae8/geophone'),
    topicTemperature: env('MQTT_TOPIC_TEMPERATURE', '/sensorweb/DHT20/temperature'),
    geophoneDeviceId: env('MQTT_GEOPHONE_DEVICE_ID', '3030f9723ae8'),
    dht20DeviceId: env('MQTT_DHT20_DEVICE_ID', 'DHT20'),
    sampleRate: 100,
    bufferSeconds: 30,
    processIntervalMs: 3000,
  },
  websocket: {
    path: env('WS_PATH', '/vitals'),
  },
} as const;
