# WebSocket bridge for real-time vitals

Per the brief: "Bridge MQTT streams to WebSockets at the cloud perimeter so the moment the time-series database registers a shift in a vital sign, the end-user's dashboard updates instantaneously."

## Options

1. **After TSDB write**: When the stream processor writes a new aggregate or point to InfluxDB/TimescaleDB, trigger a WebSocket broadcast to subscribed clients (by deviceId or userId).
2. **From stream processor**: Emit to both TSDB and a WebSocket server (e.g. Socket.IO or ws) so clients get minimal-latency updates without waiting for DB write.

## Suggested flow

- Clients (Next.js dashboard, React Native app) open a WebSocket to `wss://api.animaldot.com/vitals`.
- Client sends subscription: `{ type: 'subscribe', deviceId: '...' }`.
- Backend maintains a map of deviceId → connected sockets.
- When a new vitals payload is processed (from Kafka consumer or after TSDB write), broadcast to all sockets subscribed to that deviceId.

## Implementation

- Use the same backend process that consumes Kafka/Redis and writes to TSDB to also call a WebSocket server's broadcast helper.
- Or run a small WebSocket server that subscribes to a Redis Pub/Sub channel; the stream processor publishes to that channel after each write.
