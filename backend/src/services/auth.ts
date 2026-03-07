import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomBytes, createHash } from 'crypto';
import { config } from '../config.js';

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function issueAccessToken(userId: string, email: string): string {
  return jwt.sign(
    { sub: userId, email, type: 'access' },
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessExpiresIn }
  );
}

export function issueRefreshToken(userId: string): string {
  return jwt.sign(
    { sub: userId, type: 'refresh' },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiresIn }
  );
}

export function verifyAccessToken(token: string): { userId: string; email: string } {
  const payload = jwt.verify(token, config.jwt.accessSecret) as { sub: string; email: string };
  return { userId: payload.sub, email: payload.email };
}

export function verifyRefreshToken(token: string): { userId: string } {
  const payload = jwt.verify(token, config.jwt.refreshSecret) as { sub: string };
  return { userId: payload.sub };
}

export function generateTokenId(): string {
  return randomBytes(32).toString('hex');
}
