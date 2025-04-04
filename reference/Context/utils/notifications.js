/**
 * Utility for showing notifications in the application
 */

/**
 * Show a notification to the user
 * @param {Object} config - Notification configuration 
 * @param {string} config.message - The message to display
 * @param {string} [config.color='info'] - The notification color ('success', 'error', 'warning', 'info')
 * @param {number} [config.timeout=3000] - How long to show the notification in milliseconds
 */
export function showNotification(config) {
  // If running in a browser environment, dispatch an event for the notification
  if (typeof window !== 'undefined') {
    // Try custom event first
    window.dispatchEvent(new CustomEvent('show-notification', {
      detail: config
    }));
    return;
  }
  
  // For Vue applications using Vuetify notification system
  if (typeof $root !== 'undefined' && $root.$vuetify && $root.$vuetify.notify) {
    $root.$vuetify.notify(config);
    return;
  } 
  
  // For general notify function if available
  if (typeof notify !== 'undefined') {
    notify(config);
    return;
  }
  
  // Fallback to console or alert if needed
  console.log('Notification:', config.message);
  if (config.color === 'error') {
    alert(config.message);
  }
}

/**
 * Show a success notification
 * @param {string} message - The success message to display
 * @param {number} [timeout=3000] - How long to show the notification
 */
export function showSuccessNotification(message, timeout = 3000) {
  showNotification({
    message,
    color: 'success',
    timeout
  });
}

/**
 * Show an error notification
 * @param {string} message - The error message to display
 * @param {number} [timeout=5000] - How long to show the notification
 */
export function showErrorNotification(message, timeout = 5000) {
  showNotification({
    message,
    color: 'error',
    timeout
  });
}

/**
 * Show a warning notification
 * @param {string} message - The warning message to display
 * @param {number} [timeout=4000] - How long to show the notification
 */
export function showWarningNotification(message, timeout = 4000) {
  showNotification({
    message,
    color: 'warning',
    timeout
  });
}

/**
 * Show an info notification
 * @param {string} message - The info message to display
 * @param {number} [timeout=3000] - How long to show the notification
 */
export function showInfoNotification(message, timeout = 3000) {
  showNotification({
    message,
    color: 'info',
    timeout
  });
} 