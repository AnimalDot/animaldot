import http from 'http';
import { config } from './config.js';
import { createWebSocketServer } from './websocket/server.js';
import { startMqttSubscriber } from './services/mqtt-subscriber.js';
import { app } from './app.js';

const server = http.createServer(app);
createWebSocketServer(server, config.websocket.path);

server.listen(config.port, () => {
  console.log(`API listening on port ${config.port}`);
  startMqttSubscriber().catch((err) => {
    console.error('Failed to start MQTT subscriber:', err);
  });
});
