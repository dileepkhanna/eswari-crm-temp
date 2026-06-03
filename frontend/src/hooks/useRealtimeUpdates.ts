/**
 * Custom hook for subscribing to real-time WebSocket updates
 * 
 * This hook allows components to listen for specific WebSocket events
 * and automatically refresh data when those events occur.
 */

import { useEffect } from 'react';
import { websocketService, WebSocketEventType } from '@/services/websocket.service';
import { logger } from '@/lib/logger';

interface UseRealtimeUpdatesOptions {
  /**
   * Array of event types to listen for
   */
  events: WebSocketEventType[];
  
  /**
   * Callback function to execute when any of the specified events occur
   */
  onUpdate: () => void;
  
  /**
   * Whether to enable real-time updates (default: true)
   */
  enabled?: boolean;
}

/**
 * Subscribe to real-time WebSocket updates
 * 
 * @example
 * ```tsx
 * // Refresh leads when lead_created or lead_deleted events occur
 * useRealtimeUpdates({
 *   events: ['lead_created', 'lead_deleted'],
 *   onUpdate: () => {
 *     fetchLeads();
 *   }
 * });
 * ```
 */
export function useRealtimeUpdates({ events, onUpdate, enabled = true }: UseRealtimeUpdatesOptions) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const unsubscribers: (() => void)[] = [];

    // Subscribe to each event type
    events.forEach(eventType => {
      const unsubscribe = websocketService.on(eventType, (message) => {
        logger.log(`🔔 Real-time update received: ${eventType}`, message.data);
        onUpdate();
      });
      
      unsubscribers.push(unsubscribe);
    });

    // Cleanup: unsubscribe from all events
    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, [events, onUpdate, enabled]);
}
