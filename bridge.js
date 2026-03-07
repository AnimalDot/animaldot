const mqtt = require('mqtt');
const WebSocket = require('ws');

// 1. Connect to the public beddot server using raw TCP
const mqttClient = mqtt.connect('mqtt://sensorweb.us:1883');

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

const TOPIC_GEOPHONE = '/sensorweb/3030f9723ae8/geophone';
const TOPIC_TEMP_F = '/sensorweb/DHT20/temperature';

mqttClient.on('connect', () => {
    console.log('✅ Connected to sensorweb.us (TCP)');
    mqttClient.subscribe(TOPIC_GEOPHONE);
    mqttClient.subscribe(TOPIC_TEMP_F);
});

// 3. Forward MQTT to web app: geophone as base64, DHT20 temperature as plain string
mqttClient.on('message', (topic, message) => {
    let payload;
    if (topic === TOPIC_TEMP_F) {
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