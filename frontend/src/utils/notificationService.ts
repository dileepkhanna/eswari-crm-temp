/**
 * Push Notification Service - Complete Reimplementation v2.0
 * Uses native Web Push API with pywebpush backend
 * Fixed: Removed logger dependency to prevent tree-shaking issues
 * Cache-busting update: Force new bundle hash generation
 */

// Simple console wrapper that works in production builds
// This replaces the logger import to prevent tree-shaking issues
const log = {
  log: (...args: any[]) => console.log('[NotificationService]', ...args),
  info: (...args: any[]) => console.info('[NotificationService]', ...args),
  warn: (...args: any[]) => console.warn('[NotificationService]', ...args),
  error: (...args: any[]) => console.error('[NotificationService]', ...args),
  debug: (...args: any[]) => console.debug('[NotificationService]', ...args),
};

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
  const outputArray = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) {
    outputArray[i] = raw.charCodeAt(i);
  }
  return outputArray;
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
      log.warn('Push notifications not supported in this browser');
      return false;
    }

    try {
      // Check if service worker is already registered
      const existingReg = await navigator.serviceWorker.getRegistration('/');
      
      if (existingReg) {
        log.log('Using existing service worker registration');
        this.swReg = existingReg;
        
        // Update service worker if needed
        try {
          await existingReg.update();
          log.log('Service worker updated');
        } catch (updateErr) {
          log.warn('Service worker update failed:', updateErr);
          // Continue with existing registration
        }
      } else {
        // Register new service worker
        this.swReg = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none' // Always check for updates
        });
        log.log('Service worker registered successfully');
      }

      // Wait for service worker to be ready with timeout
      const readyPromise = navigator.serviceWorker.ready;
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Service worker ready timeout')), 10000)
      );
      
      await Promise.race([readyPromise, timeoutPromise]);
      this.swReg = await navigator.serviceWorker.ready;

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'PUSH_NOTIFICATION_RECEIVED') {
          log.log('Push notification received in foreground:', event.data);
          this._notifyForeground();
        }
      });

      // Check for existing subscription
      this.pushSub = await this.swReg.pushManager.getSubscription();
      
      if (this.pushSub) {
        log.log('Found existing push subscription');
        // Verify subscription is still valid
        try {
          const testSend = await this.sendSubscriptionToBackend(this.pushSub);
          if (!testSend) {
            log.warn('Existing subscription invalid, will need to resubscribe');
            this.pushSub = null;
          }
        } catch (err) {
          log.warn('Could not verify existing subscription:', err);
        }
      }

      this.initialized = true;
      return true;
    } catch (err) {
      log.error('Service worker initialization error:', err);
      return false;
    }
  }

  /** Get VAPID public key from backend or env */
  private async getVapidPublicKey(): Promise<string> {
    const envKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
    if (envKey) {
      log.log('Using VAPID key from environment');
      return envKey;
    }

    try {
      const res = await fetch(`${API_BASE}/notifications/vapid-public-key/`);
      if (!res.ok) throw new Error('Failed to fetch VAPID key');
      const data = await res.json();
      return data.vapid_public_key;
    } catch (error) {
      log.error('Error fetching VAPID key:', error);
      throw error;
    }
  }

  /** Subscribe to push notifications with retry logic */
  async subscribe(retryCount = 0): Promise<PushSubscription | null> {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 2000; // 2 seconds
    
    try {
      if (!this.isSupported()) {
        log.error('Push notifications not supported in this browser');
        throw new Error('UNSUPPORTED_BROWSER');
      }

      // Request permission
      const permission = await Notification.requestPermission();
      log.log('Notification permission:', permission);

      if (permission === 'denied') {
        log.error('Notification permission denied by user');
        throw new Error('PERMISSION_DENIED');
      }

      if (permission !== 'granted') {
        log.warn('Notification permission not granted');
        throw new Error('PERMISSION_NOT_GRANTED');
      }

      // Initialize service worker if not already done
      if (!this.swReg) {
        const initialized = await this.initialize();
        if (!initialized || !this.swReg) {
          log.error('Failed to initialize service worker');
          throw new Error('SERVICE_WORKER_FAILED');
        }
      }

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;
      this.swReg = await navigator.serviceWorker.ready;

      // Get VAPID public key with retry
      let vapidPublicKey: string | null = null;
      for (let i = 0; i < 3; i++) {
        try {
          vapidPublicKey = await this.getVapidPublicKey();
          if (vapidPublicKey) break;
        } catch (err) {
          log.warn(`VAPID key fetch attempt ${i + 1} failed`);
          if (i < 2) await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      if (!vapidPublicKey) {
        log.error('No VAPID public key available after retries');
        throw new Error('VAPID_KEY_MISSING');
      }

      // Unsubscribe from any existing subscription
      const existing = await this.swReg.pushManager.getSubscription();
      if (existing) {
        log.log('Unsubscribing from existing subscription');
        try {
          await existing.unsubscribe();
        } catch (err) {
          log.warn('Failed to unsubscribe existing subscription:', err);
          // Continue anyway
        }
      }

      // Create new subscription with retry logic
      log.log('Creating new push subscription...');
      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
      
      try {
        this.pushSub = await this.swReg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey as BufferSource
        });
      } catch (subError: any) {
        log.error('Subscription creation failed:', subError);
        
        // Retry if it's a network or temporary error
        if (retryCount < MAX_RETRIES && 
            (subError.message?.includes('network') || 
             subError.message?.includes('timeout') ||
             subError.name === 'AbortError')) {
          log.log(`Retrying subscription (attempt ${retryCount + 1}/${MAX_RETRIES})...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
          return this.subscribe(retryCount + 1);
        }
        
        throw subError;
      }

      log.log('Push subscription created:', this.pushSub.endpoint.substring(0, 50) + '...');

      // Send subscription to backend with retry
      let sent = false;
      for (let i = 0; i < 3; i++) {
        sent = await this.sendSubscriptionToBackend(this.pushSub);
        if (sent) break;
        log.warn(`Backend registration attempt ${i + 1} failed`);
        if (i < 2) await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      if (!sent) {
        log.error('Failed to send subscription to backend after retries');
        throw new Error('BACKEND_REGISTRATION_FAILED');
      }

      log.log('Push subscription registered with backend');
      return this.pushSub;
    } catch (err: any) {
      log.error('Push subscription error:', err);
      
      // Re-throw with specific error type
      if (err.message && err.message.startsWith('PERMISSION')) {
        throw err;
      }
      if (err.message && (err.message.includes('VAPID') || err.message.includes('SERVICE_WORKER') || err.message.includes('BACKEND'))) {
        throw err;
      }
      
      // Generic subscription error
      throw new Error('SUBSCRIPTION_FAILED: ' + (err.message || 'Unknown error'));
    }
  }

  /** Send subscription to backend with timeout */
  async sendSubscriptionToBackend(sub: PushSubscription): Promise<boolean> {
    if (!localStorage.getItem('access_token')) {
      log.warn('No auth token, cannot send subscription');
      return false;
    }

    try {
      const subJson = sub.toJSON();
      
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
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
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const error = await res.text();
        log.error('Backend subscription error:', error);
        return false;
      }

      return true;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        log.error('Backend subscription timeout');
      } else {
        log.error('Error sending subscription to backend:', error);
      }
      return false;
    }
  }

  /** Unsubscribe from push notifications */
  async removeSubscriptionFromBackend(): Promise<boolean> {
    try {
      if (!this.pushSub) {
        log.log('No subscription to remove');
        return true;
      }

      const endpoint = this.pushSub.endpoint;

      // Unsubscribe from browser
      await this.pushSub.unsubscribe();
      this.pushSub = null;
      log.log('Unsubscribed from browser push');

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
          log.error('Failed to remove subscription from backend');
          return false;
        }
      }

      return true;
    } catch (error) {
      log.error('Error removing subscription:', error);
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
      log.error('Error fetching notifications:', error);
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
      log.error('Error marking notification as read:', error);
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
      log.error('Error marking all as read:', error);
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
      log.error('Error clearing notifications:', error);
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
      log.error('Error sending test notification:', error);
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
        log.error('Error in foreground callback:', error);
      }
    });
  }
}

export const notificationService = new NotificationService();
