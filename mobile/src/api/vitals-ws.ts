/**
 * WebSocket client for real-time vitals from the backend.
 */
import { getAccessToken } from './client';
import { API_BASE } from './config';

export interface WsVitalsPayload {
  deviceId: string;
  heartRate?: number;
  respiratoryRate?: number;
  temperatureF?: number;
  weightLbs?: number;
  signalQuality?: number;
  qualityLevel?: string;
  recordedAt: string;
}

type VitalsHandler = (payload: WsVitalsPayload) => void;

let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

function getWsUrl(): string {
  // Convert http(s) base to ws(s)
  const base = API_BASE.replace(/\/api$/, '');
  return base.replace(/^http/, 'ws') + '/vitals';
}

export function connectVitalsWs(onMessage: VitalsHandler): void {
  disconnectVitalsWs();

  const token = getAccessToken();
  if (!token) return;

  const url = `${getWsUrl()}?token=${encodeURIComponent(token)}`;
  ws = new WebSocket(url);

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data as string);
      if (msg.type === 'vitals' && msg.payload) {
        onMessage(msg.payload as WsVitalsPayload);
      }
    } catch {
      // ignore parse errors
    }
  };

  ws.onclose = () => {
    // Auto-reconnect after 5s
    reconnectTimer = setTimeout(() => connectVitalsWs(onMessage), 5000);
  };

  ws.onerror = () => {
    ws?.close();
  };
}

export function disconnectVitalsWs(): void {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (ws) {
    ws.onclose = null; // prevent auto-reconnect
    ws.close();
    ws = null;
  }
}
