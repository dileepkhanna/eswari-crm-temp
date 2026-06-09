/**
 * WebSocket hook for ASE real-time data updates.
 *
 * Reuses the app-level WebSocketProvider connection and listens for
 * `ase_data_changed` events. Falls back to polling every 30 seconds if the
 * shared WebSocket is unavailable.
 */

import { useEffect, useRef } from 'react';
import { useWebSocket } from '@/contexts/WebSocketContext';

const POLL_INTERVAL = 30000;

function isASEDataChangedPayload(
  data: Record<string, unknown> | undefined
): data is { entity: string; action: string; record_id?: number } {
  return typeof data?.entity === 'string' && typeof data.action === 'string';
}

export function useASEWebSocket(
  entity: 'calls' | 'leads' | 'tasks' | null,
  onDataChanged: (data: { entity: string; action: string; record_id?: number }) => void
) {
  const { isConnected, subscribe } = useWebSocket();
  const callbackRef = useRef(onDataChanged);
  callbackRef.current = onDataChanged;

  useEffect(() => {
    return subscribe('ase_data_changed', (message) => {
      const data = message.data;
      if (isASEDataChangedPayload(data) && (entity === null || data.entity === entity)) {
        callbackRef.current(data);
      }
    });
  }, [entity, subscribe]);

  useEffect(() => {
    const pollInterval = setInterval(() => {
      if (!isConnected) {
        callbackRef.current({ entity: entity || 'all', action: 'poll' });
      }
    }, POLL_INTERVAL);

    return () => clearInterval(pollInterval);
  }, [entity, isConnected]);
}
