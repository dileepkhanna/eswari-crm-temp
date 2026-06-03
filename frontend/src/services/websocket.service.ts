/**
 * WebSocket Service for Real-Time Updates
 * 
 * Connects to the Django Channels WebSocket endpoint and handles real-time notifications
 * for leads, customers, tasks, and other entities.
 */

import { logger } from '@/lib/logger';

export type WebSocketEventType =
  | 'connection_established'
  | 'lead_created'
  | 'lead_deleted'
  | 'customer_created'
  | 'customer_updated'
  | 'task_created'
  | 'task_updated'
  | 'task_deleted'
  | 'ase_data_changed'
  | 'notification'
  | 'announcement'
  | 'status_update';

export interface WebSocketMessage {
  type: WebSocketEventType;
  data?: any;
}

export type WebSocketEventHandler = (message: WebSocketMessage) => void;

class WebSocketService {
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000; // 3 seconds
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private eventHandlers: Map<WebSocketEventType | 'all', Set<WebSocketEventHandler>> = new Map();
  private isIntentionallyClosed = false;

  constructor() {
    logger.log('🔌 WebSocketService initialized');
  }

  /**
   * Connect to the WebSocket server
   */
  connect(token: string): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      logger.log('🔌 WebSocket already connected');
      return;
    }

    this.isIntentionallyClosed = false;
    
    // Get WebSocket URL from environment or construct from API URL
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const wsProtocol = apiUrl.startsWith('https') ? 'wss' : 'ws';
    const wsHost = apiUrl.replace(/^https?:\/\//, '');
    const wsUrl = `${wsProtocol}://${wsHost}/ws/notifications/?token=${token}`;

    logger.log('🔌 Connecting to WebSocket:', wsUrl.replace(token, '***'));

    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        logger.log('✅ WebSocket connected successfully');
        this.reconnectAttempts = 0;
        this.startPingInterval();
      };

      this.socket.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          logger.log('📨 WebSocket message received:', message.type);
          
          // Call specific event handlers
          const handlers = this.eventHandlers.get(message.type);
          if (handlers) {
            handlers.forEach(handler => handler(message));
          }

          // Call global handlers
          const globalHandlers = this.eventHandlers.get('all');
          if (globalHandlers) {
            globalHandlers.forEach(handler => handler(message));
          }
        } catch (error) {
          logger.error('❌ Error parsing WebSocket message:', error);
        }
      };

      this.socket.onerror = (error) => {
        logger.error('❌ WebSocket error:', error);
      };

      this.socket.onclose = (event) => {
        logger.log('🔌 WebSocket closed:', event.code, event.reason);
        this.stopPingInterval();

        // Attempt to reconnect unless intentionally closed
        if (!this.isIntentionallyClosed && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          logger.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
          
          this.reconnectTimer = setTimeout(() => {
            this.connect(token);
          }, this.reconnectDelay * this.reconnectAttempts);
        } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          logger.error('❌ Max reconnection attempts reached. Please refresh the page.');
        }
      };
    } catch (error) {
      logger.error('❌ Error creating WebSocket connection:', error);
    }
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect(): void {
    this.isIntentionallyClosed = true;
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.stopPingInterval();

    if (this.socket) {
      this.socket.close();
      this.socket = null;
      logger.log('🔌 WebSocket disconnected');
    }
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  /**
   * Send a message to the server
   */
  send(message: any): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    } else {
      logger.warn('⚠️ WebSocket not connected. Cannot send message.');
    }
  }

  /**
   * Subscribe to a specific event type
   */
  on(eventType: WebSocketEventType | 'all', handler: WebSocketEventHandler): () => void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set());
    }
    
    this.eventHandlers.get(eventType)!.add(handler);
    logger.log(`📡 Subscribed to ${eventType} events`);

    // Return unsubscribe function
    return () => {
      this.off(eventType, handler);
    };
  }

  /**
   * Unsubscribe from a specific event type
   */
  off(eventType: WebSocketEventType | 'all', handler: WebSocketEventHandler): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      handlers.delete(handler);
      logger.log(`📡 Unsubscribed from ${eventType} events`);
    }
  }

  /**
   * Start sending periodic ping messages to keep connection alive
   */
  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        this.send({ type: 'ping' });
      }
    }, 30000); // Ping every 30 seconds
  }

  /**
   * Stop sending ping messages
   */
  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }
}

// Export singleton instance
export const websocketService = new WebSocketService();
