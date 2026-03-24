/**
 * Push Notification Service - Complete Reimplementation v2.0
 * Uses native Web Push API with pywebpush backend
 */
import { logger } from '@/lib/logger';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface BackendNotification {
  id: string | number;
  title: string;
  message: string;
  notification_type: string;
  is_read: boolean;
  created_at: string;
  data?: any;
}

/** Convert base64url VAPID key to Uint8Array */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

class NotificationService {
  private swReg: ServiceWorkerRegistration | null = null;
  private pushSub: PushSubscription | null = null;
  private initialized = false;
  private _onMessageCallbacks: Set<() => void> = new Set();

  isSupported(): boolean {
    return (
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  }

  isEnabled(): boolean {
    return Notification.permission === 'granted' && !!this.pushSub;
  }

  async initialize(): Promise<boolean> {
    if (this.initialized) return true;
    
    if (!this.isSupported()) {
      logger.warn('Push notifications not supported in this browser');
      return false;
    }

    try {
      // Unregister all existing service workers first
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
        logger.log('Unregistered old service worker');
      }

      // Register new service worker
      this.swReg = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none' // Always check for updates
      });

      logger.log('Service worker registered successfully');

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;
      this.swReg = await navigator.serviceWorker.ready;

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'PUSH_NOTIFICATION_RECEIVED') {
          logger.log('Push notification received in foreground:', event.data);
          this._notifyForeground();
        }
      });

      // Check for existing subscription
      this.pushSub = await this.swReg.pushManager.getSubscription();
      
      if (this.pushSub) {
        logger.log('Found existing push subscription');
      }

      this.initialized = true;
      return true;
    } catch (err) {
      logger.error('Service worker initialization error:', err);
      return false;
    }
  }

  /** Get VAPID public key from backend or env */
  private async getVapidPublicKey(): Promise<string> {
    const envKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
    if (envKey) {
      logger.log('Using VAPID key from environment');
      return envKey;
    }

    try {
      const res = await fetch(`${API_BASE}/notifications/vapid-public-key/`);
      if (!res.ok) throw new Error('Failed to fetch VAPID key');
      const data = await res.json();
      return data.vapid_public_key;
    } catch (error) {
      logger.error('Error fetching VAPID key:', error);
      throw error;
    }
  }

  /** Subscribe to push notifications */
  async subscribe(): Promise<PushSubscription | null> {
    try {
      if (!this.isSupported()) {
        logger.error('Push notifications not supported');
        return null;
      }

      // Request permission
      const permission = await Notification.requestPermission();
      logger.log('Notification permission:', permission);

      if (permission !== 'granted') {
        logger.warn('Notification permission denied');
        return null;
      }

      // Initialize service worker if not already done
      if (!this.swReg) {
        const initialized = await this.initialize();
        if (!initialized || !this.swReg) {
          logger.error('Failed to initialize service worker');
          return null;
        }
      }

      // Get VAPID public key
      const vapidPublicKey = await this.getVapidPublicKey();
      if (!vapidPublicKey) {
        logger.error('No VAPID public key available');
        return null;
      }

      // Unsubscribe from any existing subscription
      const existing = await this.swReg.pushManager.getSubscription();
      if (existing) {
        logger.log('Unsubscribing from existing subscription');
        await existing.unsubscribe();
      }

      // Create new subscription
      logger.log('Creating new push subscription...');
      this.pushSub = await this.swReg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });

      logger.log('Push subscription created:', this.pushSub.endpoint.substring(0, 50) + '...');

      // Send subscription to backend
      const sent = await this.sendSubscriptionToBackend(this.pushSub);
      if (!sent) {
        logger.error('Failed to send subscription to backend');
        return null;
      }

      logger.log('Push subscription registered with backend');
      return this.pushSub;
    } catch (err) {
      logger.error('Push subscription error:', err);
      return null;
    }
  }

  /** Send subscription to backend */
  async sendSubscriptionToBackend(sub: PushSubscription): Promise<boolean> {
    if (!localStorage.getItem('access_token')) {
      logger.warn('No auth token, cannot send subscription');
      return false;
    }

    try {
      const subJson = sub.toJSON();
      const res = await fetch(`${API_BASE}/notifications/subscribe/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          keys: {
            p256dh: subJson.keys?.p256dh,
            auth: subJson.keys?.auth
          }
        })
      });

      if (!res.ok) {
        const error = await res.text();
        logger.error('Backend subscription error:', error);
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Error sending subscription to backend:', error);
      return false;
    }
  }

  /** Unsubscribe from push notifications */
  async removeSubscriptionFromBackend(): Promise<boolean> {
    try {
      if (!this.pushSub) {
        logger.log('No subscription to remove');
        return true;
      }

      const endpoint = this.pushSub.endpoint;

      // Unsubscribe from browser
      await this.pushSub.unsubscribe();
      this.pushSub = null;
      logger.log('Unsubscribed from browser push');

      // Remove from backend
      if (localStorage.getItem('access_token')) {
        const res = await fetch(`${API_BASE}/notifications/unsubscribe/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeader()
          },
          body: JSON.stringify({ endpoint })
        });

        if (!res.ok) {
          logger.error('Failed to remove subscription from backend');
          return false;
        }
      }

      return true;
    } catch (error) {
      logger.error('Error removing subscription:', error);
      return false;
    }
  }

  /** Fetch notifications from backend */
  async fetchNotifications(): Promise<BackendNotification[]> {
    try {
      const res = await fetch(`${API_BASE}/notifications/`, {
        headers: getAuthHeader()
      });

      if (!res.ok) return [];

      const data = await res.json();
      return Array.isArray(data) ? data : (data.results ?? []);
    } catch (error) {
      logger.error('Error fetching notifications:', error);
      return [];
    }
  }

  /** Mark notification as read */
  async markRead(id: string): Promise<void> {
    try {
      await fetch(`${API_BASE}/notifications/${id}/mark_read/`, {
        method: 'POST',
        headers: getAuthHeader()
      });
    } catch (error) {
      logger.error('Error marking notification as read:', error);
    }
  }

  /** Mark all notifications as read */
  async markAllRead(): Promise<void> {
    try {
      await fetch(`${API_BASE}/notifications/mark_all_read/`, {
        method: 'POST',
        headers: getAuthHeader()
      });
    } catch (error) {
      logger.error('Error marking all as read:', error);
    }
  }

  /** Clear all notifications */
  async clearAll(): Promise<void> {
    try {
      await fetch(`${API_BASE}/notifications/clear_all/`, {
        method: 'DELETE',
        headers: getAuthHeader()
      });
    } catch (error) {
      logger.error('Error clearing notifications:', error);
    }
  }

  /** Send test notification */
  async sendTestNotification(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/notifications/test/`, {
        method: 'POST',
        headers: getAuthHeader()
      });
      return res.ok;
    } catch (error) {
      logger.error('Error sending test notification:', error);
      return false;
    }
  }

  /** Show local notification (for testing) */
  showLocal(title: string, body: string): void {
    if (Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico'
      });
    }
  }

  /** Register callback for foreground messages */
  onForegroundMessage(cb: () => void): () => void {
    this._onMessageCallbacks.add(cb);
    return () => this._onMessageCallbacks.delete(cb);
  }

  /** Notify all registered callbacks */
  _notifyForeground(): void {
    this._onMessageCallbacks.forEach((cb) => {
      try {
        cb();
      } catch (error) {
        logger.error('Error in foreground callback:', error);
      }
    });
  }
}

export const notificationService = new NotificationService();
