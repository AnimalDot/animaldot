import { Router, Request, Response } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';

export const alertsRouter = Router();

alertsRouter.get('/', requireAuth, async (req: Request, res: Response) => {
  const { userId } = (req as Request & { auth: { userId: string } }).auth;
  const { limit = '50' } = req.query;
  const result = await pool.query(
    `SELECT id, type, message, severity, acknowledged_at as "acknowledgedAt", created_at as "createdAt"
     FROM alerts WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [userId, Math.min(parseInt(String(limit), 10) || 50, 100)]
  );
  res.json(result.rows);
});

alertsRouter.post('/:id/acknowledge', requireAuth, async (req: Request, res: Response) => {
  const { userId } = (req as Request & { auth: { userId: string } }).auth;
  const { id } = req.params;
  const result = await pool.query(
    `UPDATE alerts SET acknowledged_at = now() WHERE id = $1 AND user_id = $2 RETURNING id`,
    [id, userId]
  );
  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json({ acknowledged: true });
});

alertsRouter.get('/rules', requireAuth, async (req: Request, res: Response) => {
  const { userId } = (req as Request & { auth: { userId: string } }).auth;
  const result = await pool.query(
    `SELECT id, pet_id as "petId", rule_type as "ruleType", threshold_value as "thresholdValue", enabled
     FROM alert_rules WHERE user_id = $1`,
    [userId]
  );
  res.json(result.rows);
});

alertsRouter.put('/rules/:id', requireAuth, async (req: Request, res: Response) => {
  const { userId } = (req as Request & { auth: { userId: string } }).auth;
  const { id } = req.params;
  const { enabled, thresholdValue } = req.body;
  const result = await pool.query(
    `UPDATE alert_rules SET enabled = COALESCE($2, enabled), threshold_value = COALESCE($3, threshold_value), updated_at = now()
     WHERE id = $4 AND user_id = $5 RETURNING id, pet_id as "petId", rule_type as "ruleType", threshold_value as "thresholdValue", enabled`,
    [enabled ?? null, thresholdValue ?? null, id, userId]
  );
  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json(result.rows[0]);
});
