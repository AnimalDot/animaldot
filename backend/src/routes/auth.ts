import { Router, Request, Response } from 'express';
import { pool } from '../db/pool.js';
import {
  hashPassword,
  verifyPassword,
  issueAccessToken,
  issueRefreshToken,
  verifyRefreshToken,
  hashRefreshToken,
} from '../services/auth.js';
import { requireAuth } from '../middleware/auth.js';

export const authRouter = Router();

authRouter.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      res.status(400).json({ error: 'Bad request', message: 'email, password, and name required' });
      return;
    }
    const passwordHash = await hashPassword(password);
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3)
       RETURNING id, email, name, created_at`,
      [email.trim().toLowerCase(), passwordHash, name.trim()]
    );
    const user = result.rows[0];
    await pool.query(
      `INSERT INTO user_preferences (user_id) VALUES ($1)`,
      [user.id]
    );
    const accessToken = issueAccessToken(user.id, user.email);
    const refreshToken = issueRefreshToken(user.id);
    const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
      [user.id, hashRefreshToken(refreshToken), refreshExpires]
    );
    res.status(201).json({
      user: { id: user.id, email: user.email, name: user.name },
      accessToken,
      refreshToken,
      expiresIn: 900,
    });
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === '23505') {
      res.status(409).json({ error: 'Conflict', message: 'Email already registered' });
      return;
    }
    throw e;
  }
});

authRouter.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'Bad request', message: 'email and password required' });
    return;
  }
  const result = await pool.query(
    `SELECT id, email, name, password_hash FROM users WHERE email = $1`,
    [email.trim().toLowerCase()]
  );
  const user = result.rows[0];
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    res.status(401).json({ error: 'Unauthorized', message: 'Invalid email or password' });
    return;
  }
  const accessToken = issueAccessToken(user.id, user.email);
  const refreshToken = issueRefreshToken(user.id);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await pool.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
    [user.id, hashRefreshToken(refreshToken), refreshExpires]
  );
  res.json({
    user: { id: user.id, email: user.email, name: user.name },
    accessToken,
    refreshToken,
    expiresIn: 900,
  });
});

authRouter.post('/refresh', async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    res.status(400).json({ error: 'Bad request', message: 'refreshToken required' });
    return;
  }
  let payload: { userId: string };
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    res.status(401).json({ error: 'Unauthorized', message: 'Invalid or expired refresh token' });
    return;
  }
  const hash = hashRefreshToken(refreshToken);
  const tokenRow = await pool.query(
    `SELECT id, user_id FROM refresh_tokens WHERE token_hash = $1 AND expires_at > now()`,
    [hash]
  );
  if (tokenRow.rows.length === 0) {
    res.status(401).json({ error: 'Unauthorized', message: 'Refresh token not found or expired' });
    return;
  }
  await pool.query(`DELETE FROM refresh_tokens WHERE token_hash = $1`, [hash]);
  const userId = payload.userId;
  const userRow = await pool.query(`SELECT id, email, name FROM users WHERE id = $1`, [userId]);
  const user = userRow.rows[0];
  if (!user) {
    res.status(401).json({ error: 'Unauthorized', message: 'User not found' });
    return;
  }
  const newAccessToken = issueAccessToken(user.id, user.email);
  const newRefreshToken = issueRefreshToken(user.id);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await pool.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
    [user.id, hashRefreshToken(newRefreshToken), refreshExpires]
  );
  res.json({
    user: { id: user.id, email: user.email, name: user.name },
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    expiresIn: 900,
  });
});

authRouter.post('/logout', requireAuth, async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    const hash = hashRefreshToken(refreshToken);
    await pool.query(`DELETE FROM refresh_tokens WHERE token_hash = $1`, [hash]);
  }
  res.status(204).send();
});
