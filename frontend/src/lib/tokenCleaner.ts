// Global token cleaner utility
export const clearInvalidTokens = () => {
  console.log('🧹 Clearing invalid authentication tokens...');
  
  // Clear all authentication-related items from localStorage
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
  localStorage.removeItem('session');
  
  // Clear sessionStorage as well
  sessionStorage.clear();
  
  console.log('✅ Tokens cleared successfully');
  
  // Reload the page to start fresh
  setTimeout(() => {
    console.log('🔄 Reloading page to start fresh...');
    window.location.reload();
  }, 1000);
};

// Auto-detect and clear invalid tokens on 401 errors
export const handleAuthError = (error: any) => {
  if (error?.message?.includes('401') || error?.status === 401) {
    console.warn('🚨 401 Unauthorized detected - clearing invalid tokens');
    clearInvalidTokens();
    return true;
  }
  return false;
};

// Initialize token cleaner - run this once on app startup
export const initTokenCleaner = () => {
  // Check if we have tokens but no valid user data
  const hasTokens = localStorage.getItem('access_token') || localStorage.getItem('refresh_token');
  
  if (hasTokens) {
    console.log('🔍 Tokens found, will validate on first API call...');
  }
  
  // Listen for unhandled promise rejections that might be auth errors
  window.addEventListener('unhandledrejection', (event) => {
    if (handleAuthError(event.reason)) {
      event.preventDefault(); // Prevent the error from being logged
    }
  });
  
  console.log('🛡️ Token cleaner initialized');
};