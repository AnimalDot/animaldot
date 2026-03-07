import { Router, Request, Response } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';

export const devicesRouter = Router();

devicesRouter.get('/', requireAuth, async (req: Request, res: Response) => {
  const { userId } = (req as Request & { auth: { userId: string } }).auth;
  const result = await pool.query(
    `SELECT d.id, d.device_id as "deviceId", d.name, d.pet_id as "petId", d.last_seen_at as "lastSeenAt",
            d.firmware_version as "firmwareVersion", d.battery_level as "batteryLevel",
            d.created_at as "createdAt", d.updated_at as "updatedAt"
     FROM devices d WHERE d.user_id = $1 ORDER BY d.last_seen_at DESC NULLS LAST`,
    [userId]
  );
  res.json(result.rows);
});

devicesRouter.post('/register', requireAuth, async (req: Request, res: Response) => {
  const { userId } = (req as Request & { auth: { userId: string } }).auth;
  const { deviceId, name, petId } = req.body;
  if (!deviceId || typeof deviceId !== 'string') {
    res.status(400).json({ error: 'Bad request', message: 'deviceId required' });
    return;
  }
  const existing = await pool.query(
    `SELECT id, device_id as "deviceId", name, pet_id as "petId", last_seen_at as "lastSeenAt", created_at as "createdAt"
     FROM devices WHERE device_id = $1`,
    [deviceId.trim()]
  );
  if (existing.rows.length > 0) {
    await pool.query(
      `UPDATE devices SET user_id = $1, name = COALESCE($2, name), pet_id = COALESCE($3, pet_id), updated_at = now() WHERE device_id = $4`,
      [userId, (name ?? 'AnimalDot Bed').trim(), petId ?? null, deviceId.trim()]
    );
    const updated = await pool.query(
      `SELECT id, device_id as "deviceId", name, pet_id as "petId", last_seen_at as "lastSeenAt", created_at as "createdAt"
       FROM devices WHERE device_id = $1`,
      [deviceId.trim()]
    );
    res.status(200).json(updated.rows[0]);
    return;
  }
  const result = await pool.query(
    `INSERT INTO devices (device_id, user_id, name, pet_id)
     VALUES ($1, $2, $3, $4)
     RETURNING id, device_id as "deviceId", name, pet_id as "petId", last_seen_at as "lastSeenAt", created_at as "createdAt"`,
    [deviceId.trim(), userId, (name ?? 'AnimalDot Bed').trim(), petId ?? null]
  );
  res.status(201).json(result.rows[0]);
});

devicesRouter.patch('/:id', requireAuth, async (req: Request, res: Response) => {
  const { userId } = (req as Request & { auth: { userId: string } }).auth;
  const { id } = req.params;
  const { name, petId } = req.body;
  const result = await pool.query(
    `UPDATE devices SET name = COALESCE($2, name), pet_id = COALESCE($3, pet_id), updated_at = now()
     WHERE id = $4 AND user_id = $5
     RETURNING id, device_id as "deviceId", name, pet_id as "petId", last_seen_at as "lastSeenAt"`,
    [name ?? null, petId ?? null, id, userId]
  );
  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json(result.rows[0]);
});

devicesRouter.get('/:id', requireAuth, async (req: Request, res: Response) => {
  const { userId } = (req as Request & { auth: { userId: string } }).auth;
  const { id } = req.params;
  const result = await pool.query(
    `SELECT id, device_id as "deviceId", name, pet_id as "petId", last_seen_at as "lastSeenAt",
            firmware_version as "firmwareVersion", battery_level as "batteryLevel", created_at as "createdAt"
     FROM devices WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json(result.rows[0]);
});

devicesRouter.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  const { userId } = (req as Request & { auth: { userId: string } }).auth;
  const { id } = req.params;
  const result = await pool.query(`DELETE FROM devices WHERE id = $1 AND user_id = $2 RETURNING id`, [id, userId]);
  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.status(204).send();
});
