/**
 * Create a single local dev account (no real inbox required).
 * Run: npm run db:seed:dev
 *
 * Override defaults with env: DEV_USER_EMAIL, DEV_USER_PASSWORD, DEV_USER_NAME
 */
import 'dotenv/config';
import { pool } from './pool.js';
import { hashPassword } from '../services/auth.js';

const email = (process.env.DEV_USER_EMAIL ?? 'dev@animaldot.local').toLowerCase().trim();
const password = process.env.DEV_USER_PASSWORD ?? 'animaldot';
const name = process.env.DEV_USER_NAME ?? 'Local Dev';

async function main() {
  const existing = await pool.query('SELECT id FROM users WHERE LOWER(email) = $1', [email]);
  if (existing.rows.length > 0) {
    console.log(`User already exists: ${email}`);
    console.log('Use that email with the password you set, or pick new credentials:');
    console.log('  DEV_USER_EMAIL=you@test.com DEV_USER_PASSWORD=secret npm run db:seed:dev');
    await pool.end();
    return;
  }

  const hash = await hashPassword(password);
  const ins = await pool.query(
    `INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id`,
    [email, hash, name],
  );
  const userId = ins.rows[0].id as string;
  await pool.query(`INSERT INTO user_preferences (user_id) VALUES ($1)`, [userId]);
  await pool.end();

  console.log('');
  console.log('Created local dev user (use with POST /api/auth/login):');
  console.log(`  Email:    ${email}`);
  console.log(`  Password: ${password}`);
  console.log('');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
