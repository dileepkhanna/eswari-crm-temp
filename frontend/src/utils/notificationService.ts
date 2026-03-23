/**
 * Django-native Web Push Notification Service
 * Uses the browser's native Push API + pywebpush on the backend.
 * No Firebase SDK required.
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

/** Convert a base64url string to a Uint8Array (needed for VAPID public key) */
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
    if (!this.isSupported()) return false;
    try {
      this.swReg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      await navigator.serviceWorker.ready;
      this.swReg = await navigator.serviceWorker.ready;

      // Restore existing subscription if any
      this.pushSub = await this.swReg.pushManager.getSubscription();
      this.initialized = true;
      return true;
    } catch (err) {
      logger.error('SW init error:', err);
      return false;
    }
  }

  /** Fetch VAPID public key from Django backend */
  private async getVapidPublicKey(): Promise<string> {
    const res = await fetch(`${API_BASE}/notifications/vapid-public-key/`);
    if (!res.ok) throw new Error('Failed to fetch VAPID public key');
    const data = await res.json();
    return data.vapid_public_key;
  }

  /** Request permission + subscribe to Web Push + register with backend */
  async subscribe(): Promise<PushSubscription | null> {
    try {
      if (!this.isSupported()) {
        logger.error('Push notifications not supported in this browser');
        return null;
      }

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        logger.warn('Notification permission denied');
        return null;
      }

      if (!this.swReg) await this.initialize();
      if (!this.swReg) return null;

      const vapidPublicKey = await this.getVapidPublicKey();
      if (!vapidPublicKey) {
        logger.error('No VAPID public key from backend');
        return null;
      }

      // Unsubscribe any stale subscription first
      const existing = await this.swReg.pushManager.getSubscription();
      if (existing) await existing.unsubscribe();

      this.pushSub = await this.swReg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as unknown as BufferSource,
      });

      logger.log('Web Push subscription created:', this.pushSub.endpoint.substring(0, 40) + '...');
      return this.pushSub;
    } catch (err) {
      logger.error('Web Push subscribe error:', err);
      return null;
    }
  }

  async sendSubscriptionToBackend(sub: PushSubscription): Promise<boolean> {
    if (!localStorage.getItem('access_token')) return false;
    try {
      const subJson = sub.toJSON();
      const res = await fetch(`${API_BASE}/notifications/subscribe/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          keys: {
            p256dh: subJson.keys?.p256dh,
            auth: subJson.keys?.auth,
          },
        }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async removeSubscriptionFromBackend(): Promise<boolean> {
    if (!localStorage.getItem('access_token')) return true;
    try {
      if (!this.pushSub) return true;
      const endpoint = this.pushSub.endpoint;
      await this.pushSub.unsubscribe();
      this.pushSub = null;
      const res = await fetch(`${API_BASE}/notifications/unsubscribe/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ endpoint }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async fetchNotifications(): Promise<BackendNotification[]> {
    try {
      const res = await fetch(`${API_BASE}/notifications/`, { headers: getAuthHeader() });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : (data.results ?? []);
    } catch {
      return [];
    }
  }

  async markRead(id: string): Promise<void> {
    await fetch(`${API_BASE}/notifications/${id}/mark_read/`, {
      method: 'POST',
      headers: getAuthHeader(),
    });
  }

  async markAllRead(): Promise<void> {
    await fetch(`${API_BASE}/notifications/mark_all_read/`, {
      method: 'POST',
      headers: getAuthHeader(),
    });
  }

  async clearAll(): Promise<void> {
    await fetch(`${API_BASE}/notifications/clear_all/`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });
  }

  async sendTestNotification(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/notifications/test/`, {
        method: 'POST',
        headers: getAuthHeader(),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  showLocal(title: string, body: string): void {
    if (Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/favicon.ico' });
    }
  }

  /** Register a callback to be called when a push message arrives (via SW message) */
  onForegroundMessage(cb: () => void): () => void {
    this._onMessageCallbacks.add(cb);
    return () => this._onMessageCallbacks.delete(cb);
  }

  /** Call this to notify context that a push arrived (triggered from SW message event) */
  _notifyForeground(): void {
    this._onMessageCallbacks.forEach((cb) => cb());
  }
}

export const notificationService = new NotificationService();
