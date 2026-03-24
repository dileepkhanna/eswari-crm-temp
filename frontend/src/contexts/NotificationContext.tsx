import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { notificationService, BackendNotification } from '@/utils/notificationService';
import { useAuth } from '@/contexts/AuthContextDjango';
import { toast } from 'sonner';

export interface NotificationMessage {
  id: string;
  title: string;
  message: string;
  createdAt: Date;
  read: boolean;
  type?: string;
  data?: any;
}

interface NotificationContextType {
  isSupported: boolean;
  isEnabled: boolean;
  isLoading: boolean;
  notifications: NotificationMessage[];
  unreadCount: number;
  enableNotifications: () => Promise<void>;
  disableNotifications: () => Promise<void>;
  testNotification: () => Promise<void>;
  addNotification: (notification: Omit<NotificationMessage, 'id' | 'read'>) => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearAll: () => Promise<void>;
  refresh: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
};

function toMessage(n: BackendNotification): NotificationMessage {
  return {
    id: String(n.id),
    title: n.title,
    message: n.message,
    createdAt: new Date(n.created_at),
    read: n.is_read,
    type: n.notification_type,
    data: n.data,
  };
}

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [notifications, setNotifications] = useState<NotificationMessage[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const loadNotifications = useCallback(async () => {
    // Don't fetch if not authenticated
    if (!localStorage.getItem('access_token')) return;
    const data = await notificationService.fetchNotifications();
    setNotifications((prev) => {
      const normalized = data.map((n) => ({ ...n, id: String(n.id) }));
      const backendIds = new Set(normalized.map((n) => n.id));
      const localOnly = prev.filter((n) => n.id.startsWith('local-') && !backendIds.has(n.id));
      const readLocally = new Set(prev.filter((n) => n.read).map((n) => n.id));
      const merged = normalized.map((n) => ({
        ...toMessage(n),
        read: n.is_read || readLocally.has(n.id),
      }));
      return [...localOnly, ...merged];
    });
  }, []);

  // Initialize and start polling only when authenticated
  useEffect(() => {
    if (authLoading) return; // Wait for auth to resolve

    if (!isAuthenticated) {
      // User logged out — clear state and stop polling
      setNotifications([]);
      setIsEnabled(false);
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    // User is authenticated — initialize
    const init = async () => {
      const supported = notificationService.isSupported();
      setIsSupported(supported);
      if (supported) {
        await notificationService.initialize();
        const alreadyEnabled = notificationService.isEnabled();
        setIsEnabled(alreadyEnabled);

        // Auto-register subscription with backend if browser already has permission
        // This ensures admin/HR who granted permission get push notifications
        if (Notification.permission === 'granted') {
          const existingSub = await notificationService.subscribe();
          if (existingSub) {
            await notificationService.sendSubscriptionToBackend(existingSub);
            setIsEnabled(true);
          }
        }
      }
      loadNotifications();
      pollRef.current = setInterval(loadNotifications, 30_000);
    };
    init();

    // Listen for messages from the service worker
    const onSWMessage = (event: MessageEvent) => {
      if (event.data?.type === 'PUSH_RECEIVED') {
        const { title, body } = event.data;
        // Show toast notification in the app
        toast(title, { description: body });
        // Also show system notification if page is visible (foreground)
        if (document.visibilityState === 'visible' && Notification.permission === 'granted') {
          // The service worker already showed the notification, just refresh the list
          setTimeout(loadNotifications, 500);
        } else {
          // Background - service worker handles it
          setTimeout(loadNotifications, 500);
        }
        notificationService._notifyForeground();
      }
    };
    navigator.serviceWorker?.addEventListener('message', onSWMessage);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      navigator.serviceWorker?.removeEventListener('message', onSWMessage);
    };
  }, [isAuthenticated, authLoading, loadNotifications]);

  // Listen for SW push messages to refresh the list
  useEffect(() => {
    const unsubFCM = notificationService.onForegroundMessage(() => {
      setTimeout(loadNotifications, 500);
    });
    return () => unsubFCM();
  }, [loadNotifications]);

  const enableNotifications = async () => {
    setIsLoading(true);
    try {
      const sub = await notificationService.subscribe();
      if (!sub) {
        toast.error('Failed to enable notifications. Please try again.');
        return;
      }
      const ok = await notificationService.sendSubscriptionToBackend(sub);
      if (ok) {
        setIsEnabled(true);
        toast.success('Push notifications enabled');
      } else {
        toast.error('Failed to register with server. Please try again.');
      }
    } catch (error: any) {
      const errorMsg = error?.message || '';
      
      if (errorMsg === 'PERMISSION_DENIED') {
        toast.error('Notifications blocked. Click the lock icon in address bar and allow notifications.');
      } else if (errorMsg === 'PERMISSION_NOT_GRANTED') {
        toast.error('Please allow notifications when your browser asks.');
      } else if (errorMsg === 'UNSUPPORTED_BROWSER') {
        toast.error('Your browser doesn\'t support push notifications. Please update your browser.');
      } else if (errorMsg === 'SERVICE_WORKER_FAILED') {
        toast.error('Service worker failed to load. Try refreshing the page.');
      } else if (errorMsg === 'VAPID_KEY_MISSING') {
        toast.error('Server configuration error. Please contact support.');
      } else if (errorMsg === 'BACKEND_REGISTRATION_FAILED') {
        toast.error('Failed to register with server. Please try again.');
      } else if (errorMsg.startsWith('SUBSCRIPTION_FAILED')) {
        toast.error('Subscription failed. Clear your browser cache and try again.');
      } else {
        toast.error('Could not enable notifications. Check browser settings and try again.');
      }
      
      logger.error('Enable notifications error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const disableNotifications = async () => {
    setIsLoading(true);
    try {
      await notificationService.removeSubscriptionFromBackend();
      setIsEnabled(false);
      toast.success('Push notifications disabled');
    } catch {
      toast.error('Failed to disable notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const testNotification = async () => {
    const ok = await notificationService.sendTestNotification();
    if (ok) {
      toast.success('Test notification sent — check your browser notifications');
      notificationService.showLocal('Test Notification', 'Push notifications are working!');
      setTimeout(loadNotifications, 2000);
    } else {
      toast.error('Failed to send test notification');
    }
  };

  const addNotification = useCallback((notification: Omit<NotificationMessage, 'id' | 'read'>) => {
    const newNotif: NotificationMessage = {
      ...notification,
      id: `local-${Date.now()}-${Math.random()}`,
      read: false,
    };
    setNotifications((prev) => [newNotif, ...prev]);
    if (Notification.permission === 'granted') {
      notificationService.showLocal(notification.title, notification.message);
    }
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    if (!id.startsWith('local-')) {
      await notificationService.markRead(id);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await notificationService.markAllRead();
  }, []);

  const clearAll = useCallback(async () => {
    setNotifications([]);
    await notificationService.clearAll();
  }, []);

  const refresh = useCallback(async () => {
    await loadNotifications();
  }, [loadNotifications]);

  return (
    <NotificationContext.Provider value={{
      isSupported, isEnabled, isLoading, notifications, unreadCount,
      enableNotifications, disableNotifications, testNotification,
      addNotification, markAsRead, markAllAsRead, clearAll, refresh,
    }}>
      {children}
    </NotificationContext.Provider>
  );
};
