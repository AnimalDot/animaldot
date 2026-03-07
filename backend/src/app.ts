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
  res.status(500).json({ error: 'Internal server error' });
});

export { app };
