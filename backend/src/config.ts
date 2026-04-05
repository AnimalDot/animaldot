import 'dotenv/config';

function env(key: string, defaultValue?: string): string {
  const v = process.env[key] ?? defaultValue;
  if (v === undefined) throw new Error(`Missing env: ${key}`);
  return v;
}

/** Trimmed env, or default when unset / empty. */
function envTrim(key: string, defaultValue: string): string {
  const v = process.env[key];
  if (v === undefined || v.trim() === '') return defaultValue;
  return v.trim();
}

const mqttOrg = envTrim('MQTT_ORG', 'sensorweb');
const mqttGeophoneMac = envTrim('MQTT_GEOPHONE_DEVICE_ID', '3030f9723ae8');
const mqttDhtId = envTrim('MQTT_DHT20_DEVICE_ID', 'DHT20');
const mqttBrokerUrl = envTrim('MQTT_BROKER_URL', 'mqtt://sensorweb.us:1883');
const mqttTopicGeophone = envTrim(
  'MQTT_TOPIC_GEOPHONE',
  `/${mqttOrg}/${mqttGeophoneMac}/geophone`,
);
const mqttTopicTemperature = envTrim(
  'MQTT_TOPIC_TEMPERATURE',
  `/${mqttOrg}/${mqttDhtId}/temperature`,
);

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
    brokerUrl: mqttBrokerUrl,
    topicGeophone: mqttTopicGeophone,
    topicTemperature: mqttTopicTemperature,
    geophoneDeviceId: mqttGeophoneMac,
    dht20DeviceId: mqttDhtId,
    org: mqttOrg,
    sampleRate: 100,
    bufferSeconds: 30,
    processIntervalMs: 3000,
  },
  websocket: {
    path: env('WS_PATH', '/vitals'),
  },
} as const;
