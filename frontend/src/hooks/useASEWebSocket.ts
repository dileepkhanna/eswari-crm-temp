/**
 * WebSocket hook for ASE real-time data updates.
 * 
 * Connects to the backend WebSocket and listens for `ase_data_changed` events.
 * Falls back to polling every 30 seconds if WebSocket is unavailable.
 * 
 * Usage:
 *   useASEWebSocket('leads', () => { refetchLeads(); });
 *   useASEWebSocket('calls', () => { refetchCalls(); });
 *   useASEWebSocket('tasks', () => { refetchTasks(); });
 */

import { useEffect, useRef } from 'react';

const WS_BASE = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const WS_HOST = window.location.host;

// Poll interval fallback (ms) when WebSocket is not connected
const POLL_INTERVAL = 30000;

export function useASEWebSocket(
  entity: 'calls' | 'leads' | 'tasks' | null,
  onDataChanged: (data: { entity: string; action: string; record_id?: number }) => void
) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(onDataChanged);
  const isConnectedRef = useRef(false);
  callbackRef.current = onDataChanged;

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    let isMounted = true;

    const connect = () => {
      if (!isMounted) return;

      try {
        const ws = new WebSocket(`${WS_BASE}//${WS_HOST}/ws/notifications/?token=${token}`);
        wsRef.current = ws;

        ws.onopen = () => {
          isConnectedRef.current = true;
          if (reconnectTimerRef.current) {
            clearTimeout(reconnectTimerRef.current);
            reconnectTimerRef.current = null;
          }
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'ase_data_changed') {
              const data = msg.data;
              if (entity === null || data.entity === entity) {
                callbackRef.current(data);
              }
            }
          } catch {
            // Ignore parse errors
          }
        };

        ws.onclose = () => {
          isConnectedRef.current = false;
          // Reconnect after 3 seconds
          if (isMounted) {
            reconnectTimerRef.current = setTimeout(connect, 3000);
          }
        };

        ws.onerror = () => {
          isConnectedRef.current = false;
          ws.close();
        };
      } catch {
        // WebSocket connection failed — polling fallback will handle it
        isConnectedRef.current = false;
      }
    };

    connect();

    // Keepalive ping every 30 seconds
    const pingInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);

    // Polling fallback: if WebSocket is NOT connected, poll every 30 seconds
    // This ensures admin sees new data even if WebSocket fails
    const pollInterval = setInterval(() => {
      if (!isConnectedRef.current) {
        // WebSocket disconnected — trigger a refresh as fallback
        callbackRef.current({ entity: entity || 'all', action: 'poll' });
      }
    }, POLL_INTERVAL);

    return () => {
      isMounted = false;
      clearInterval(pingInterval);
      clearInterval(pollInterval);
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [entity]);
}
