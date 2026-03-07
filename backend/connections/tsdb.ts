/**
 * Time-Series Database connection scaffolding.
 * Use InfluxDB v2 client or TimescaleDB (pg) for writes and aggregate queries.
 */

import { config } from '../config/env';

export const influxConfig = {
  url: config.influx.url,
  token: config.influx.token,
  org: config.influx.org,
  bucket: config.influx.bucket,
};

// Example Influx write (concept):
// measurement: vitals
// tags: deviceId, petId
// fields: heartRate, respiratoryRate, temperature, weight
// timestamp: from payload

// Example query: average heart rate last 90 days
// FROM(bucket: "vitals") |> range(start: -90d) |> filter(fn: (r) => r._field == "heartRate") |> mean()
