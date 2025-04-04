import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { logStartupEvent, trackError, getBuildInfo } from './utils/buildInfo'
import { geckoTheme, geckoDefaults } from './utils/gecko-theme'

// Vuetify
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { aliases, mdi } from 'vuetify/iconsets/mdi'
import '@mdi/font/css/materialdesignicons.css'

// Import our styles
import './styles/app.css'
import './styles/transitions.css'
import './styles/gecko-ui.css'  // Import Gecko UI styles

// Application diagnostics
const diagnostics = {
  startTime: new Date(),
  errors: [],
  warnings: [],
  events: [],
  resources: {
    threejs: null,
    vuetify: null,
    vue: true
  }
};

// Global error handler
const handleGlobalError = (error, source, lineno, colno, errorObj) => {
  const errorInfo = {
    message: error.message || String(error),
    source,
    lineno,
    colno,
    stack: errorObj?.stack,
    timestamp: new Date().toISOString()
  };
  
  diagnostics.errors.push(errorInfo);
  
  console.error('Global error caught:', errorInfo);
  
  // Log to console with a clear visual indicator
  console.group('%c Application Error', 'background: #FF5252; color: white; padding: 2px 6px; border-radius: 2px;');
  console.error(error);
  console.error('Source:', source);
  console.error('Line:', lineno, 'Column:', colno);
  if (errorObj?.stack) console.error('Stack:', errorObj.stack);
  console.groupEnd();
  
  // Display error in UI if in development mode
  if (process.env.NODE_ENV === 'development') {
    const errorContainer = document.createElement('div');
    errorContainer.style.position = 'fixed';
    errorContainer.style.bottom = '20px';
    errorContainer.style.right = '20px';
    errorContainer.style.backgroundColor = '#FF5252';
    errorContainer.style.color = 'white';
    errorContainer.style.padding = '12px 16px';
    errorContainer.style.borderRadius = '4px';
    errorContainer.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
    errorContainer.style.maxWidth = '80%';
    errorContainer.style.zIndex = '9999';
    errorContainer.style.fontFamily = 'Arial, sans-serif';
    
    errorContainer.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 6px;">Application Error</div>
      <div style="font-size: 14px;">${error.message || String(error)}</div>
      <div style="font-size: 12px; margin-top: 6px; opacity: 0.8;">${source} (${lineno}:${colno})</div>
      <button id="error-dismiss" style="background: transparent; border: 1px solid white; color: white; padding: 4px 8px; margin-top: 8px; cursor: pointer; float: right; border-radius: 2px;">Dismiss</button>
    `;
    
    document.body.appendChild(errorContainer);
    
    document.getElementById('error-dismiss').addEventListener('click', () => {
      document.body.removeChild(errorContainer);
    });
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (document.body.contains(errorContainer)) {
        document.body.removeChild(errorContainer);
      }
    }, 10000);
  }
  
  // Return true to prevent the default error handler
  return true;
};

// Resource loading error handler
const handleResourceError = (event) => {
  const resource = event.target;
  const resourceInfo = {
    type: resource.tagName,
    url: resource.src || resource.href,
    timestamp: new Date().toISOString()
  };
  
  diagnostics.errors.push({
    message: `Failed to load resource: ${resourceInfo.url}`,
    source: 'resource',
    ...resourceInfo
  });
  
  console.error('Resource loading error:', resourceInfo);
};

// Custom event listener for application events
const handleAppEvent = (event) => {
  if (event.type === 'drawing-service-error') {
    // Handle drawing service errors
    const error = event.detail;
    diagnostics.errors.push({
      source: 'drawingService',
      operation: error.operation,
      message: error.error.message,
      timestamp: new Date().toISOString()
    });
  } else {
    // General application events
    diagnostics.events.push({
      type: event.type,
      detail: event.detail,
      timestamp: new Date().toISOString()
    });
  }
};

// Register global error handlers
window.onerror = handleGlobalError;
window.addEventListener('error', handleResourceError, true);

// Listen for custom application events
window.addEventListener('drawing-service-error', handleAppEvent);
window.addEventListener('app-event', handleAppEvent);

// Expose diagnostics to window for console debugging
window.appDiagnostics = {
  get: () => ({ ...diagnostics }),
  errors: () => diagnostics.errors,
  events: () => diagnostics.events,
  clearErrors: () => {
    diagnostics.errors = [];
    return 'Errors cleared';
  },
  getBuildInfo,
  checkStatus: () => {
    const info = getBuildInfo();
    console.table({
      version: info.build.version,
      environment: info.build.environment,
      errors: info.runtime.errors.length,
      warnings: info.runtime.warnings.length,
      uptime: `${info.runtime.uptime} seconds`
    });
    return 'Status check complete. Use appDiagnostics.getBuildInfo() for full details.';
  },
  displayErrors: () => {
    const errors = getBuildInfo().runtime.errors;
    if (errors.length === 0) {
      console.log('No errors recorded!');
      return;
    }
    console.group(`Application Errors (${errors.length})`);
    errors.forEach((error, index) => {
      console.log(`Error #${index + 1}: ${error.message}`);
      console.log('Source:', error.source);
      if (error.stack) console.log('Stack:', error.stack);
      console.log('Time:', error.timestamp);
      console.log('---');
    });
    console.groupEnd();
  }
};

// Create Vuetify instance with Gecko UI theme configuration
const vuetify = createVuetify({
  components,
  directives,
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: {
      mdi
    }
  },
  theme: geckoTheme,
  defaults: geckoDefaults
})

// Update diagnostics
diagnostics.resources.vuetify = true;

// Create app instance
const app = createApp(App)
const pinia = createPinia()

// Global error handler for Vue
app.config.errorHandler = (error, vm, info) => {
  // Handle router component resolution errors gracefully
  if (error.message && error.message.includes('Failed to resolve component')) {
    console.warn('Router component resolution warning:', error.message);
    // Don't track these as errors - they're expected in our application
    return;
  }
  
  trackError({
    message: error.message || 'Vue Application Error',
    source: info || 'vue',
    stack: error.stack,
    timestamp: new Date().toISOString()
  });
  
  console.error('Vue Error:', error);
  
  // Also pass to global handler for consistent UI feedback
  handleGlobalError(error, 'Vue component', 0, 0, error);
};

// Add console commands for diagnostics
if (process.env.NODE_ENV === 'development') {
  console.info('%c App Diagnostics Available', 'background: #4CAF50; color: white; padding: 2px 6px; border-radius: 2px;');
  console.info('Use window.appDiagnostics.get() to see all diagnostics');
  console.info('Use window.appDiagnostics.errors() to view errors');
  console.info('Use window.appDiagnostics.clearErrors() to clear error log');
}

// Use plugins
app.use(vuetify)
app.use(pinia)

// Mount app
app.mount('#app')

// Log successful start
logStartupEvent('Application successfully mounted');
