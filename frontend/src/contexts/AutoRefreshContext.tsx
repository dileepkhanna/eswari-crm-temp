import React, { createContext, useContext, useState, useCallback } from 'react';

interface AutoRefreshContextType {
  globalRefreshEnabled: boolean;
  setGlobalRefreshEnabled: (enabled: boolean) => void;
  refreshInterval: number;
  setRefreshInterval: (interval: number) => void;
  triggerGlobalRefresh: () => void;
  registerRefreshCallback: (id: string, callback: () => void) => void;
  unregisterRefreshCallback: (id: string) => void;
}

const AutoRefreshContext = createContext<AutoRefreshContextType | undefined>(undefined);

export function useAutoRefreshContext() {
  const context = useContext(AutoRefreshContext);
  if (!context) {
    throw new Error('useAutoRefreshContext must be used within an AutoRefreshProvider');
  }
  return context;
}

interface AutoRefreshProviderProps {
  children: React.ReactNode;
}

export function AutoRefreshProvider({ children }: AutoRefreshProviderProps) {
  const [globalRefreshEnabled, setGlobalRefreshEnabled] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30); // seconds
  const [refreshCallbacks, setRefreshCallbacks] = useState<Map<string, () => void>>(new Map());

  const registerRefreshCallback = useCallback((id: string, callback: () => void) => {
    setRefreshCallbacks(prev => new Map(prev).set(id, callback));
  }, []);

  const unregisterRefreshCallback = useCallback((id: string) => {
    setRefreshCallbacks(prev => {
      const newMap = new Map(prev);
      newMap.delete(id);
      return newMap;
    });
  }, []);

  const triggerGlobalRefresh = useCallback(() => {
    refreshCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Error in refresh callback:', error);
      }
    });
  }, [refreshCallbacks]);

  const value: AutoRefreshContextType = {
    globalRefreshEnabled,
    setGlobalRefreshEnabled,
    refreshInterval,
    setRefreshInterval,
    triggerGlobalRefresh,
    registerRefreshCallback,
    unregisterRefreshCallback,
  };

  return (
    <AutoRefreshContext.Provider value={value}>
      {children}
    </AutoRefreshContext.Provider>
  );
}