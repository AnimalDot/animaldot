import { WebSocketServer, WebSocket } from 'ws';
import { verifyAccessToken } from '../services/auth.js';
import { pool } from '../db/pool.js';

export type VitalsPayload = {
  deviceId: string;
  heartRate?: number;
  respiratoryRate?: number;
  temperatureF?: number;
  weightLbs?: number;
  systolicMmhg?: number;
  diastolicMmhg?: number;
  signalQuality?: number;
  qualityLevel?: string;
  recordedAt: string;
};

const clientsByUserId = new Map<string, Set<WebSocket>>();

function getUserIdFromUrl(url: string): string | null {
  try {
    const u = new URL(url, 'http://localhost');
    const token = u.searchParams.get('token');
    if (!token) return null;
    const payload = verifyAccessToken(token);
    return payload.userId;
  } catch {
    return null;
  }
}

export function createWebSocketServer(server: import('http').Server, path: string): WebSocketServer {
  const wss = new WebSocketServer({ server, path });

  wss.on('connection', (ws, req) => {
    const userId = getUserIdFromUrl(req.url ?? '');
    if (!userId) {
      ws.close(4401, 'Unauthorized');
      return;
    }
    if (!clientsByUserId.has(userId)) {
      clientsByUserId.set(userId, new Set());
    }
    clientsByUserId.get(userId)!.add(ws);
    ws.on('close', () => {
      clientsByUserId.get(userId)?.delete(ws);
      if (clientsByUserId.get(userId)?.size === 0) clientsByUserId.delete(userId);
    });
  });

  return wss;
}

export function broadcastVitalsToUser(userId: string, payload: VitalsPayload): void {
  const clients = clientsByUserId.get(userId);
  if (!clients) return;
  const msg = JSON.stringify({ type: 'vitals', payload });
  clients.forEach((ws) => {
    if (ws.readyState === 1) ws.send(msg);
  });
}

/**
 * Broadcast vitals to all users who own a device (by device DB id).
 * Looks up the user_id from the devices table and delegates to broadcastVitalsToUser.
 */
export async function broadcastVitalsToDevice(deviceDbId: string, payload: VitalsPayload): Promise<void> {
  try {
    const result = await pool.query(
      'SELECT user_id FROM devices WHERE id = $1 AND user_id IS NOT NULL',
      [deviceDbId]
    );
    for (const row of result.rows) {
      broadcastVitalsToUser(row.user_id, payload);
    }
  } catch {
    // Silently ignore — WebSocket broadcast is best-effort
  }
}
