require('dotenv').config({ path: require('path').join(__dirname, 'backend', '.env') });

const mqtt = require('mqtt');
const WebSocket = require('ws');

const org = (process.env.MQTT_ORG || 'sensorweb').trim();
const mac = (process.env.MQTT_GEOPHONE_DEVICE_ID || '3030f9723ae8').trim();
const dhtId = (process.env.MQTT_DHT20_DEVICE_ID || 'DHT20').trim();
const brokerUrl = (process.env.MQTT_BROKER_URL || 'mqtt://sensorweb.us:1883').trim();
const topicGeophone =
  (process.env.MQTT_TOPIC_GEOPHONE && process.env.MQTT_TOPIC_GEOPHONE.trim()) ||
  `/${org}/${mac}/geophone`;
const topicTemperature =
  (process.env.MQTT_TOPIC_TEMPERATURE && process.env.MQTT_TOPIC_TEMPERATURE.trim()) ||
  `/${org}/${dhtId}/temperature`;

// 1. Connect to your MQTT broker (same settings as backend/.env)
const mqttClient = mqtt.connect(brokerUrl);

// 2. Start a local WebSocket server for your frontend to connect to
const wss = new WebSocket.Server({ port: 8080 });

// Ping clients every 25s so the connection is not considered idle (avoids spurious disconnects)
const PING_INTERVAL_MS = 25000;
setInterval(() => {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.ping();
        }
    });
}, PING_INTERVAL_MS);

mqttClient.on('connect', () => {
    console.log(`✅ MQTT connected to ${brokerUrl}`);
    mqttClient.subscribe(topicGeophone);
    mqttClient.subscribe(topicTemperature);
});

// 3. Forward MQTT to web app: geophone as base64, DHT20 temperature as plain string
mqttClient.on('message', (topic, message) => {
    let payload;
    if (topic === topicTemperature) {
        payload = { topic, temperature: message.toString() };
    } else {
        payload = { topic, data: message.toString('base64') };
    }
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(payload));
        }
    });
});

console.log('Bridge is running! Point your frontend to ws://localhost:8080');