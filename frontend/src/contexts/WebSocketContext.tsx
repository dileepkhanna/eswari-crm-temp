/**
 * WebSocket Context Provider
 * 
 * Manages WebSocket connection lifecycle and provides real-time event subscription
 * for all components in the application.
 */

import React, { createContext, useContext, useEffect, useCallback, useState } from 'react';
import { useAuth } from './AuthContextDjango';
import { websocketService, WebSocketEventType, WebSocketMessage, WebSocketEventHandler } from '@/services/websocket.service';
import { logger } from '@/lib/logger';

interface WebSocketContextType {
  isConnected: boolean;
  subscribe: (eventType: WebSocketEventType | 'all', handler: WebSocketEventHandler) => () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}

interface WebSocketProviderProps {
  children: React.ReactNode;
}

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);

  // Connect to WebSocket when user is authenticated
  useEffect(() => {
    if (user) {
      const token = localStorage.getItem('access_token');
      if (token) {
        logger.log('🔌 User authenticated, connecting to WebSocket...');
        websocketService.connect(token);
        
        // Subscribe to connection established event
        const unsubscribe = websocketService.on('connection_established', () => {
          logger.log('✅ WebSocket connection established');
          setIsConnected(true);
        });

        // Check connection status periodically
        const checkConnectionInterval = setInterval(() => {
          setIsConnected(websocketService.isConnected());
        }, 5000);

        return () => {
          unsubscribe();
          clearInterval(checkConnectionInterval);
          logger.log('🔌 Disconnecting WebSocket...');
          websocketService.disconnect();
          setIsConnected(false);
        };
      }
    } else {
      // User logged out, disconnect WebSocket
      websocketService.disconnect();
      setIsConnected(false);
    }
  }, [user]);

  // Subscribe to WebSocket events
  const subscribe = useCallback((eventType: WebSocketEventType | 'all', handler: WebSocketEventHandler) => {
    return websocketService.on(eventType, handler);
  }, []);

  const value: WebSocketContextType = {
    isConnected,
    subscribe,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}
