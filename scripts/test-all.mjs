#!/usr/bin/env node
/**
 * AnimalDot — run all tests across the repo (self-checking).
 * Runs typecheck, lint, build, and test in every project so every file is exercised.
 * Exits 0 only if every step passes; otherwise exits 1 and reports failures.
 *
 * Usage: node scripts/test-all.mjs   OR   npm test   (from repo root)
 */

import { spawnSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

function run(name, cwd, command, args = [], opts = {}) {
  const { shell = true } = opts;
  const result = spawnSync(command, args, {
    cwd: cwd || ROOT,
    shell,
    stdio: 'inherit',
    env: { ...process.env, FORCE_COLOR: '1' },
  });
  return { name, ok: result.status === 0, status: result.status };
}

function hasScript(pkgPath, scriptName) {
  try {
    const pkg = JSON.parse(readFileSync(join(pkgPath, 'package.json'), 'utf8'));
    return pkg.scripts && scriptName in pkg.scripts;
  } catch {
    return false;
  }
}

function hasTsconfig(pkgPath) {
  return (
    existsSync(join(pkgPath, 'tsconfig.json')) ||
    existsSync(join(pkgPath, 'jsconfig.json'))
  );
}

function runSteps(projectName, dir, steps) {
  const results = [];
  for (const step of steps) {
    if (step.type === 'script') {
      if (!hasScript(dir, step.script)) continue;
      results.push(
        run(`${projectName} (${step.script})`, dir, 'npm', ['run', step.script])
      );
    } else if (step.type === 'tsc') {
      if (!hasTsconfig(dir)) continue;
      results.push(
        run(`${projectName} (tsc --noEmit)`, dir, 'npx', ['tsc', '--noEmit'])
      );
    } else if (step.type === 'command') {
      const { command, args = [], optional } = step;
      const res = spawnSync(command, args, {
        cwd: dir,
        shell: true,
        stdio: 'inherit',
        env: { ...process.env, FORCE_COLOR: '1' },
      });
      if (optional && res.status === 127) {
        console.log(`(skipped — ${command} not installed)\n`);
        continue;
      }
      results.push({
        name: `${projectName} (${step.label || command})`,
        ok: res.status === 0,
        status: res.status,
      });
    }
  }
  return results;
}

function main() {
  const results = [];

  console.log('AnimalDot — running all checks (typecheck, lint, build, test)\n');

  // --- Backend (every .ts file: typecheck via build, lint, test) ---
  console.log('--- backend ---');
  const backendDir = join(ROOT, 'backend');
  if (existsSync(join(backendDir, 'package.json'))) {
    results.push(
      ...runSteps('backend', backendDir, [
        { type: 'script', script: 'build' },
        { type: 'script', script: 'lint' },
        { type: 'script', script: 'test' },
      ])
    );
  }
  console.log('');

  // --- Web (every file: typecheck, build) ---
  console.log('--- web ---');
  const webDir = join(ROOT, 'web');
  if (existsSync(join(webDir, 'package.json'))) {
    const webSteps = [];
    if (hasTsconfig(webDir)) webSteps.push({ type: 'tsc' });
    if (hasScript(webDir, 'test:run')) webSteps.push({ type: 'script', script: 'test:run' });
    webSteps.push({ type: 'script', script: 'build' });
    results.push(...runSteps('web', webDir, webSteps));
  }
  console.log('');

  // --- Mobile (every file: typecheck, lint, test) ---
  console.log('--- mobile ---');
  const mobileDir = join(ROOT, 'mobile');
  if (existsSync(join(mobileDir, 'package.json'))) {
    results.push(
      ...runSteps('mobile', mobileDir, [
        { type: 'tsc' },
        { type: 'script', script: 'lint' },
        { type: 'script', script: 'test' },
      ])
    );
  }
  console.log('');

  // --- Dashboard (every file: lint, build) ---
  console.log('--- dashboard ---');
  const dashboardDir = join(ROOT, 'dashboard');
  if (existsSync(join(dashboardDir, 'package.json'))) {
    results.push(
      ...runSteps('dashboard', dashboardDir, [
        { type: 'script', script: 'lint' },
        { type: 'script', script: 'build' },
      ])
    );
  }
  console.log('');

  // --- Firmware (every .cpp/.h: build; optional if pio not installed) ---
  console.log('--- firmware ---');
  const firmwareDir = join(ROOT, 'firmware');
  if (existsSync(join(firmwareDir, 'platformio.ini'))) {
    const res = spawnSync('pio', ['run'], {
      cwd: firmwareDir,
      shell: true,
      stdio: ['inherit', 'inherit', 'pipe'],
      env: { ...process.env, FORCE_COLOR: '1' },
    });
    if (res.stderr && res.stderr.length) process.stderr.write(res.stderr);
    const pioNotFound =
      res.status === 127 ||
      (res.status !== 0 &&
        res.stderr &&
        (res.stderr.toString().includes('not recognized') || res.stderr.toString().includes('not found')));
    if (pioNotFound) {
      console.log('(skipped — pio not installed or not in PATH; run: pipx install platformio)\n');
    } else {
      results.push({ name: 'firmware (build)', ok: res.status === 0, status: res.status });
    }
  }
  console.log('');

  // --- Root / scripts (syntax-check the runner) ---
  console.log('--- root ---');
  const checkRes = spawnSync('node', ['--check', 'scripts/test-all.mjs'], {
    cwd: ROOT,
    shell: true,
    stdio: 'pipe',
  });
  results.push({
    name: 'root (scripts syntax)',
    ok: checkRes.status === 0,
    status: checkRes.status,
  });
  if (checkRes.status !== 0 && checkRes.stderr) {
    process.stderr.write(checkRes.stderr);
  }
  console.log('');

  // --- Design-system (validate JSON if present) ---
  console.log('--- design-system ---');
  const designSystemDir = join(ROOT, 'design-system');
  const tokensPath = join(designSystemDir, 'tokens.json');
  if (existsSync(tokensPath)) {
    try {
      JSON.parse(readFileSync(tokensPath, 'utf8'));
      results.push({ name: 'design-system (tokens.json)', ok: true, status: 0 });
      console.log('tokens.json valid\n');
    } catch (e) {
      results.push({ name: 'design-system (tokens.json)', ok: false, status: 1 });
      console.error('tokens.json invalid:', e.message, '\n');
    }
  } else {
    console.log('(no tokens.json)\n');
  }
  console.log('');

  // Summary
  const failed = results.filter((r) => !r.ok);
  if (failed.length > 0) {
    console.log('FAILED:', failed.map((r) => r.name).join(', '));
    process.exit(1);
  }
  console.log('All checks passed.');
  process.exit(0);
}

main();
