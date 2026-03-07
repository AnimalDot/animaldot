import '../test-env.js';
import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  hashPassword,
  verifyPassword,
  hashRefreshToken,
  issueAccessToken,
  issueRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from './auth.js';

describe('auth service', () => {

  it('hashPassword produces a hash different from plain text', async () => {
    const password = 'test-password-123';
    const hash = await hashPassword(password);
    assert.ok(hash !== password);
    assert.ok(hash.length > 20);
    assert.ok(hash.startsWith('$2'));
  });

  it('verifyPassword returns true for correct password', async () => {
    const password = 'correct-horse-battery';
    const hash = await hashPassword(password);
    const ok = await verifyPassword(password, hash);
    assert.strictEqual(ok, true);
  });

  it('verifyPassword returns false for wrong password', async () => {
    const hash = await hashPassword('right-password');
    const ok = await verifyPassword('wrong-password', hash);
    assert.strictEqual(ok, false);
  });

  it('hashRefreshToken returns deterministic hex string', () => {
    const token = 'my-refresh-token';
    const h1 = hashRefreshToken(token);
    const h2 = hashRefreshToken(token);
    assert.strictEqual(h1, h2);
    assert.ok(/^[a-f0-9]{64}$/.test(h1));
  });

  it('issueAccessToken and verifyAccessToken round-trip', () => {
    const userId = 'user-123';
    const email = 'user@example.com';
    const token = issueAccessToken(userId, email);
    assert.ok(typeof token === 'string' && token.length > 0);
    const payload = verifyAccessToken(token);
    assert.strictEqual(payload.userId, userId);
    assert.strictEqual(payload.email, email);
  });

  it('issueRefreshToken and verifyRefreshToken round-trip', () => {
    const userId = 'user-456';
    const token = issueRefreshToken(userId);
    assert.ok(typeof token === 'string' && token.length > 0);
    const payload = verifyRefreshToken(token);
    assert.strictEqual(payload.userId, userId);
  });
});
