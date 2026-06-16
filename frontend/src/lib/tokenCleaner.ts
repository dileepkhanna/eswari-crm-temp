// Global token cleaner utility
import { logger } from '@/lib/logger';

export const clearInvalidTokens = () => {
  logger.log('🧹 Clearing invalid authentication tokens...');
  
  // Clear all authentication-related items from localStorage
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
  localStorage.removeItem('session');
  
  // Clear sessionStorage as well
  sessionStorage.clear();
  
  logger.log('✅ Tokens cleared successfully');
};

// Only clear tokens when a 401 happens AND we actually had tokens stored.
// This prevents wiping a valid session just because an unauthenticated page
// load fires API calls before the auth context has initialised.
export const handleAuthError = (error: any) => {
  const is401 = error?.message?.includes('401') || error?.status === 401;
  if (!is401) return false;

  const hadTokens =
    !!localStorage.getItem('access_token') ||
    !!localStorage.getItem('refresh_token');

  if (hadTokens) {
    logger.warn('🚨 401 Unauthorized detected - clearing invalid tokens');
    clearInvalidTokens();
    return true;
  }

  // No tokens were present — this is a normal unauthenticated request,
  // not a case of stale/invalid tokens. Do nothing.
  logger.warn('🚨 401 Unauthorized detected - no tokens present, ignoring');
  return false;
};

// Initialize token cleaner - run this once on app startup
export const initTokenCleaner = () => {
  const hasTokens =
    localStorage.getItem('access_token') || localStorage.getItem('refresh_token');

  if (hasTokens) {
    logger.log('🔍 Tokens found, will validate on first API call...');
  }

  // Only intercept unhandled rejections that involve stale tokens.
  window.addEventListener('unhandledrejection', (event) => {
    if (handleAuthError(event.reason)) {
      event.preventDefault();
    }
  });

  logger.log('🛡️ Token cleaner initialized');
};