import toast from 'react-hot-toast';

/**
 * Utility functions for showing toasts with duplicate prevention
 */

// Track the last toast messages to prevent rapid duplicates
const recentToasts = new Map<string, number>();
const DUPLICATE_THRESHOLD = 1000; // 1 second

/**
 * Show a success toast, preventing duplicates within 1 second
 */
export function showSuccessToast(message: string) {
  const now = Date.now();
  const lastShown = recentToasts.get(message);
  
  // Only show if this exact message wasn't shown in the last second
  if (!lastShown || (now - lastShown) > DUPLICATE_THRESHOLD) {
    recentToasts.set(message, now);
    toast.success(message);
    
    // Clean up old entries after the duplicate threshold
    setTimeout(() => {
      const currentTime = Date.now();
      if (recentToasts.get(message) === now) {
        recentToasts.delete(message);
      }
    }, DUPLICATE_THRESHOLD + 100);
  }
}

/**
 * Show an error toast, preventing duplicates within 1 second
 */
export function showErrorToast(message: string) {
  const now = Date.now();
  const lastShown = recentToasts.get(message);
  
  // Only show if this exact message wasn't shown in the last second
  if (!lastShown || (now - lastShown) > DUPLICATE_THRESHOLD) {
    recentToasts.set(message, now);
    toast.error(message);
    
    // Clean up old entries after the duplicate threshold
    setTimeout(() => {
      const currentTime = Date.now();
      if (recentToasts.get(message) === now) {
        recentToasts.delete(message);
      }
    }, DUPLICATE_THRESHOLD + 100);
  }
}

/**
 * Show an info toast, preventing duplicates within 1 second
 */
export function showInfoToast(message: string) {
  const now = Date.now();
  const lastShown = recentToasts.get(message);
  
  // Only show if this exact message wasn't shown in the last second
  if (!lastShown || (now - lastShown) > DUPLICATE_THRESHOLD) {
    recentToasts.set(message, now);
    toast(message);
    
    // Clean up old entries after the duplicate threshold
    setTimeout(() => {
      const currentTime = Date.now();
      if (recentToasts.get(message) === now) {
        recentToasts.delete(message);
      }
    }, DUPLICATE_THRESHOLD + 100);
  }
}

/**
 * Dismiss all active toasts
 */
export function dismissAllToasts() {
  toast.dismiss();
  recentToasts.clear();
}

