import { Router, Request, Response } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';

export const usersRouter = Router();

usersRouter.get('/me', requireAuth, async (req: Request, res: Response) => {
  const { userId } = (req as Request & { auth: { userId: string } }).auth;
  const result = await pool.query(
    `SELECT u.id, u.email, u.name, u.created_at,
            p.temperature_unit as "temperatureUnit", p.weight_unit as "weightUnit",
            p.theme, p.notifications_enabled as "notificationsEnabled"
     FROM users u
     LEFT JOIN user_preferences p ON p.user_id = u.id
     WHERE u.id = $1`,
    [userId]
  );
  const row = result.rows[0];
  if (!row) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json({
    id: row.id,
    email: row.email,
    name: row.name,
    createdAt: row.created_at,
    preferences: {
      temperatureUnit: row.temperatureUnit ?? 'F',
      weightUnit: row.weightUnit ?? 'lbs',
      theme: row.theme ?? 'system',
      notificationsEnabled: row.notificationsEnabled ?? true,
    },
  });
});

usersRouter.patch('/me', requireAuth, async (req: Request, res: Response) => {
  const { userId } = (req as Request & { auth: { userId: string } }).auth;
  const { name } = req.body;
  if (name !== undefined) {
    await pool.query(`UPDATE users SET name = $1, updated_at = now() WHERE id = $2`, [name.trim(), userId]);
  }
  const result = await pool.query(`SELECT id, email, name, created_at FROM users WHERE id = $1`, [userId]);
  res.json(result.rows[0]);
});

usersRouter.get('/me/preferences', requireAuth, async (req: Request, res: Response) => {
  const { userId } = (req as Request & { auth: { userId: string } }).auth;
  const result = await pool.query(
    `SELECT temperature_unit as "temperatureUnit", weight_unit as "weightUnit",
            theme, notifications_enabled as "notificationsEnabled"
     FROM user_preferences WHERE user_id = $1`,
    [userId]
  );
  const row = result.rows[0];
  if (!row) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json(row);
});

usersRouter.patch('/me/preferences', requireAuth, async (req: Request, res: Response) => {
  const { userId } = (req as Request & { auth: { userId: string } }).auth;
  const { temperatureUnit, weightUnit, theme, notificationsEnabled } = req.body;
  await pool.query(
    `INSERT INTO user_preferences (user_id, temperature_unit, weight_unit, theme, notifications_enabled, updated_at)
     VALUES ($1, $2, $3, $4, $5, now())
     ON CONFLICT (user_id) DO UPDATE SET
       temperature_unit = COALESCE($2, user_preferences.temperature_unit),
       weight_unit = COALESCE($3, user_preferences.weight_unit),
       theme = COALESCE($4, user_preferences.theme),
       notifications_enabled = COALESCE($5, user_preferences.notifications_enabled),
       updated_at = now()`,
    [
      userId,
      temperatureUnit ?? null,
      weightUnit ?? null,
      theme ?? null,
      notificationsEnabled ?? null,
    ]
  );
  const result = await pool.query(
    `SELECT temperature_unit as "temperatureUnit", weight_unit as "weightUnit", theme, notifications_enabled as "notificationsEnabled"
     FROM user_preferences WHERE user_id = $1`,
    [userId]
  );
  res.json(result.rows[0]);
});
