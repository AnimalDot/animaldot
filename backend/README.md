# AnimalDot API and Pipeline

This folder contains the **runnable API server** (Node.js, Express, TypeScript) and scaffolding for the ingestion pipeline.

## API Server

- **Run:** `npm install && npm run db:migrate && npm run dev` (or `npm start` after `npm run build`).
- **Port:** Set `API_PORT` (default 3000). Requires PostgreSQL (`DATABASE_URL`).
- **Endpoints:** `/api/auth` (register, login, refresh, logout), `/api/users`, `/api/pets`, `/api/devices`, `/api/vitals`, `/api/alerts`. WebSocket at path `WS_PATH` (default `/vitals`) with `?token=<accessToken>`.
- **Schema:** Apply with `npm run db:migrate` (runs `src/db/schema.sql`).

## Pipeline (optional)

1. **Perception/Network**: BedDot hardware → MQTT (device-to-cloud).
2. **Data processing**: Message broker (Kafka or AWS Kinesis) → Redis Streams → stream processing.
3. **Platform/Storage**: Vitals stored in PostgreSQL (`vitals` table); optional InfluxDB/TimescaleDB for scale.
4. **Application**: REST + WebSocket (same server) for web and mobile clients.

## Environment

Copy `.env.example` to `.env` and set values for your deployment.

## MQTT

Devices publish telemetry to the broker. Use MQTTS (TLS). Bridge MQTT topics to Kafka/Kinesis if using a separate message broker.

## Kafka / Kinesis

- **Kafka**: `backend/config/kafka.ts` and connection in `backend/connections/kafka.ts`.
- **Kinesis**: Use AWS SDK and stream name from env.

## Redis

- Redis Streams for high-frequency buffer and routing. See `backend/connections/redis.ts`.

## Time-Series DB

- **InfluxDB** or **TimescaleDB**: connection and write path in `backend/connections/tsdb.ts`. Queries for aggregates (e.g. 90-day avg heart rate) go here.

## WebSocket

- Bridge from TSDB or from the stream processor so the Next.js dashboard and mobile app receive real-time updates without polling. See `backend/connections/websocket.md`.
