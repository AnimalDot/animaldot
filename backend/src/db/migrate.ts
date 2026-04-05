import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { pool } from './pool.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Idempotent column adds for DBs created before schema.sql included these fields. */
const VITALS_EVOLVE_SQL = `
ALTER TABLE vitals ADD COLUMN IF NOT EXISTS heart_rate INTEGER;
ALTER TABLE vitals ADD COLUMN IF NOT EXISTS respiratory_rate INTEGER;
ALTER TABLE vitals ADD COLUMN IF NOT EXISTS temperature_f NUMERIC(4,2);
ALTER TABLE vitals ADD COLUMN IF NOT EXISTS weight_lbs NUMERIC(6,2);
ALTER TABLE vitals ADD COLUMN IF NOT EXISTS systolic_mmhg INTEGER;
ALTER TABLE vitals ADD COLUMN IF NOT EXISTS diastolic_mmhg INTEGER;
ALTER TABLE vitals ADD COLUMN IF NOT EXISTS signal_quality NUMERIC(3,2);
ALTER TABLE vitals ADD COLUMN IF NOT EXISTS quality_level TEXT;
`;

async function migrate() {
  const sql = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
  await pool.query(sql);
  console.log('Schema applied.');
  await pool.query(VITALS_EVOLVE_SQL);
  console.log('Vitals columns ensured (ALTER IF NOT EXISTS).');
  await pool.end();
}

migrate().catch((e) => {
  console.error(e);
  process.exit(1);
});
