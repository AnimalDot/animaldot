import { Router, Request, Response } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';

export const petsRouter = Router();

petsRouter.get('/', requireAuth, async (req: Request, res: Response) => {
  const { userId } = (req as Request & { auth: { userId: string } }).auth;
  const result = await pool.query(
    `SELECT id, name, breed, species_class as "speciesClass", age, baseline_weight_lbs as "baselineWeight",
            medical_notes as "medicalNotes", created_at as "createdAt", updated_at as "updatedAt"
     FROM pets WHERE user_id = $1 ORDER BY created_at`,
    [userId]
  );
  res.json(result.rows);
});

petsRouter.post('/', requireAuth, async (req: Request, res: Response) => {
  const { userId } = (req as Request & { auth: { userId: string } }).auth;
  const { name, breed, speciesClass, age, baselineWeight, medicalNotes } = req.body;
  const result = await pool.query(
    `INSERT INTO pets (user_id, name, breed, species_class, age, baseline_weight_lbs, medical_notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, name, breed, species_class as "speciesClass", age, baseline_weight_lbs as "baselineWeight",
               medical_notes as "medicalNotes", created_at as "createdAt", updated_at as "updatedAt"`,
    [
      userId,
      name ?? '',
      breed ?? '',
      speciesClass ?? null,
      age ?? 0,
      baselineWeight ?? 0,
      medicalNotes ?? '',
    ]
  );
  res.status(201).json(result.rows[0]);
});

petsRouter.get('/:id', requireAuth, async (req: Request, res: Response) => {
  const { userId } = (req as Request & { auth: { userId: string } }).auth;
  const { id } = req.params;
  const result = await pool.query(
    `SELECT id, name, breed, species_class as "speciesClass", age, baseline_weight_lbs as "baselineWeight",
            medical_notes as "medicalNotes", created_at as "createdAt", updated_at as "updatedAt"
     FROM pets WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json(result.rows[0]);
});

petsRouter.patch('/:id', requireAuth, async (req: Request, res: Response) => {
  const { userId } = (req as Request & { auth: { userId: string } }).auth;
  const { id } = req.params;
  const { name, breed, speciesClass, age, baselineWeight, medicalNotes } = req.body;
  const result = await pool.query(
    `UPDATE pets SET
       name = COALESCE($2, name), breed = COALESCE($3, breed), species_class = COALESCE($4, species_class),
       age = COALESCE($5, age), baseline_weight_lbs = COALESCE($6, baseline_weight_lbs),
       medical_notes = COALESCE($7, medical_notes), updated_at = now()
     WHERE id = $1 AND user_id = $8
     RETURNING id, name, breed, species_class as "speciesClass", age, baseline_weight_lbs as "baselineWeight",
               medical_notes as "medicalNotes", created_at as "createdAt", updated_at as "updatedAt"`,
    [id, name ?? null, breed ?? null, speciesClass ?? null, age ?? null, baselineWeight ?? null, medicalNotes ?? null, userId]
  );
  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json(result.rows[0]);
});

petsRouter.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  const { userId } = (req as Request & { auth: { userId: string } }).auth;
  const { id } = req.params;
  const result = await pool.query(`DELETE FROM pets WHERE id = $1 AND user_id = $2 RETURNING id`, [id, userId]);
  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.status(204).send();
});
