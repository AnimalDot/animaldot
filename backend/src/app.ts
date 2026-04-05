import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { authRouter } from './routes/auth.js';
import { usersRouter } from './routes/users.js';
import { petsRouter } from './routes/pets.js';
import { devicesRouter } from './routes/devices.js';
import { vitalsRouter } from './routes/vitals.js';
import { alertsRouter } from './routes/alerts.js';

const app = express();
app.use(cors({ origin: config.cors.origin, credentials: true }));
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/pets', petsRouter);
app.use('/api/devices', devicesRouter);
app.use('/api/vitals', vitalsRouter);
app.use('/api/alerts', alertsRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  const e = err as { status?: number; statusCode?: number; type?: string; expose?: boolean };
  const status = e.status ?? e.statusCode;
  // body-parser invalid JSON (common when PowerShell `curl` mangles -d)
  if (e.type === 'entity.parse.failed' || err instanceof SyntaxError) {
    res.status(400).json({
      error: 'Bad request',
      message:
        'Invalid JSON body. In PowerShell use curl.exe (not alias curl) or Invoke-RestMethod with a single-quoted -Body.',
    });
    return;
  }
  if (typeof status === 'number' && status >= 400 && status < 500) {
    res.status(status).json({
      error: 'Bad request',
      message: err instanceof Error ? err.message : 'Bad request',
    });
    return;
  }
  res.status(500).json({ error: 'Internal server error' });
});

export { app };
