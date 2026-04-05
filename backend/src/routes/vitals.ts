import { Router, Request, Response } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { broadcastVitalsToUser } from '../websocket/server.js';

export const vitalsRouter = Router();

vitalsRouter.get('/aggregates', requireAuth, async (req: Request, res: Response) => {
  const { userId } = (req as Request & { auth: { userId: string } }).auth;
  const { deviceId, period } = req.query;
  if (!deviceId || typeof deviceId !== 'string') {
    res.status(400).json({ error: 'Bad request', message: 'deviceId required' });
    return;
  }
  const deviceCheck = await pool.query(
    `SELECT id FROM devices WHERE id = $1 AND user_id = $2`,
    [deviceId, userId]
  );
  if (deviceCheck.rows.length === 0) {
    res.status(404).json({ error: 'Not found', message: 'Device not found' });
    return;
  }
  const isWeek = period === 'week';
  const interval = isWeek ? 'day' : 'hour';
  const range = isWeek ? '7 days' : '24 hours';
  const result = await pool.query(
    `SELECT date_trunc($1, recorded_at AT TIME ZONE 'UTC') AS bucket,
            AVG(heart_rate)::int AS heart_rate,
            AVG(respiratory_rate)::int AS respiratory_rate,
            AVG(temperature_f)::numeric(4,2) AS temperature_f,
            AVG(weight_lbs)::numeric(6,2) AS weight_lbs,
            AVG(systolic_mmhg)::int AS systolic_mmhg,
            AVG(diastolic_mmhg)::int AS diastolic_mmhg
     FROM vitals
     WHERE device_id = $2 AND recorded_at >= now() - $3::interval
     GROUP BY date_trunc($1, recorded_at AT TIME ZONE 'UTC')
     ORDER BY bucket`,
    [interval, deviceId, range]
  );
  const formatBucket = (row: { bucket: Date }) => {
    if (isWeek) {
      const d = new Date(row.bucket);
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return days[d.getUTCDay()];
    }
    const d = new Date(row.bucket);
    const h = d.getUTCHours();
    return h === 0 ? '12am' : h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`;
  };
  const data = result.rows.map((row) => ({
    time: formatBucket(row),
    heartRate: row.heart_rate,
    respiratoryRate: row.respiratory_rate,
    temperatureF: Number(row.temperature_f),
    weightLbs: Number(row.weight_lbs),
    systolicMmhg: row.systolic_mmhg,
    diastolicMmhg: row.diastolic_mmhg,
  }));
  res.json({ period: isWeek ? 'week' : 'day', data });
});

vitalsRouter.get('/latest', requireAuth, async (req: Request, res: Response) => {
  const { userId } = (req as Request & { auth: { userId: string } }).auth;
  const { deviceId } = req.query;
  if (!deviceId || typeof deviceId !== 'string') {
    res.status(400).json({ error: 'Bad request', message: 'deviceId required' });
    return;
  }
  const deviceCheck = await pool.query(
    `SELECT id FROM devices WHERE id = $1 AND user_id = $2`,
    [deviceId, userId]
  );
  if (deviceCheck.rows.length === 0) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const result = await pool.query(
    `SELECT heart_rate as "heartRate", respiratory_rate as "respiratoryRate", temperature_f as "temperatureF",
            weight_lbs as "weightLbs", systolic_mmhg as "systolicMmhg", diastolic_mmhg as "diastolicMmhg",
            signal_quality as "signalQuality", quality_level as "qualityLevel", recorded_at as "recordedAt"
     FROM vitals WHERE device_id = $1 ORDER BY recorded_at DESC LIMIT 1`,
    [deviceId]
  );
  if (result.rows.length === 0) {
    res.json(null);
    return;
  }
  const row = result.rows[0];
  res.json({
    heartRate: row.heartRate,
    respiratoryRate: row.respiratoryRate,
    temperatureF: row.temperatureF != null ? Number(row.temperatureF) : null,
    weightLbs: row.weightLbs != null ? Number(row.weightLbs) : null,
    systolicMmhg: row.systolicMmhg,
    diastolicMmhg: row.diastolicMmhg,
    signalQuality: row.signalQuality != null ? Number(row.signalQuality) : null,
    qualityLevel: row.qualityLevel,
    recordedAt: row.recordedAt,
  });
});

vitalsRouter.post('/', requireAuth, async (req: Request, res: Response) => {
  const { userId } = (req as Request & { auth: { userId: string } }).auth;
  const {
    deviceId,
    heartRate,
    respiratoryRate,
    temperatureF,
    weightLbs,
    systolicMmhg,
    diastolicMmhg,
    signalQuality,
    qualityLevel,
  } = req.body;
  if (!deviceId) {
    res.status(400).json({ error: 'Bad request', message: 'deviceId required' });
    return;
  }
  const deviceCheck = await pool.query(
    `SELECT id FROM devices WHERE device_id = $1 AND (user_id = $2 OR user_id IS NULL)`,
    [deviceId, userId]
  );
  let deviceDbId: string;
  if (deviceCheck.rows.length === 0) {
    const insert = await pool.query(
      `INSERT INTO devices (device_id, user_id, name, last_seen_at) VALUES ($1, $2, $3, now()) RETURNING id`,
      [deviceId, userId, 'AnimalDot Bed']
    );
    deviceDbId = insert.rows[0].id;
  } else {
    deviceDbId = deviceCheck.rows[0].id;
    await pool.query(`UPDATE devices SET last_seen_at = now() WHERE id = $1`, [deviceDbId]);
  }
  await pool.query(
    `INSERT INTO vitals (device_id, heart_rate, respiratory_rate, temperature_f, weight_lbs, systolic_mmhg, diastolic_mmhg, signal_quality, quality_level)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      deviceDbId,
      heartRate ?? null,
      respiratoryRate ?? null,
      temperatureF ?? null,
      weightLbs ?? null,
      systolicMmhg ?? null,
      diastolicMmhg ?? null,
      signalQuality ?? null,
      qualityLevel ?? null,
    ]
  );
  broadcastVitalsToUser(userId, {
    deviceId: String(deviceId),
    heartRate: heartRate ?? undefined,
    respiratoryRate: respiratoryRate ?? undefined,
    temperatureF: temperatureF ?? undefined,
    weightLbs: weightLbs ?? undefined,
    systolicMmhg: systolicMmhg ?? undefined,
    diastolicMmhg: diastolicMmhg ?? undefined,
    signalQuality: signalQuality ?? undefined,
    qualityLevel: qualityLevel ?? undefined,
    recordedAt: new Date().toISOString(),
  });
  res.status(201).json({ ok: true });
});
