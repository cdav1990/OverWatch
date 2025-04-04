/**
 * Build Info Utility
 * 
 * Provides runtime information about the application's build, environment,
 * and system capabilities. Used for diagnostics and debugging.
 */

// Build Info
const buildInfo = {
  version: '0.1.1',
  timestamp: new Date().toISOString(),
  environment: import.meta.env.MODE || 'development',
  buildDate: __BUILD_DATE__,
  commitHash: __COMMIT_HASH__,
  viteVersion: '5.4.15',
  startupTime: new Date().toISOString()
};

// Environment Capabilities
const capabilities = {
  webgl: detectWebGL(),
  webgl2: detectWebGL2(),
  webgpuSupport: 'webgpu' in navigator,
  windowSize: {
    width: window.innerWidth,
    height: window.innerHeight
  },
  devicePixelRatio: window.devicePixelRatio || 1,
  highPerformanceGPU: detectHighPerformanceGPU(),
  userAgent: navigator.userAgent,
  platform: navigator.platform,
  threads: navigator.hardwareConcurrency || 'unknown',
  browserLanguage: navigator.language,
  memoryInfo: getMemoryInfo()
};

// Module Dependencies
const dependencies = {
  vue: '3.4.15',
  vuetify: '3.4.10',
  threejs: getThreeJsVersion(),
  vite: '5.4.15',
  pinia: '2.1.7'
};

// Runtime Diagnostics Store
let runtimeInfo = {
  errors: [],
  warnings: [],
  renders: 0,
  lastError: null,
  sceneStats: {
    triangles: 0,
    objects: 0,
    drawCalls: 0,
    lastRenderTime: 0
  },
  startupSequence: [],
  activeModules: new Set(),
  initialLoadTime: null,
  lastActivityTime: new Date()
};

// Initialization that tracks how environment is set up
function initialize() {
  try {
    logStartupEvent('buildInfo initialized');
    
    // Record the initial page load time
    if (window.performance && window.performance.timing) {
      const timing = window.performance.timing;
      runtimeInfo.initialLoadTime = timing.domContentLoadedEventEnd - timing.navigationStart;
      logStartupEvent(`Initial page load took ${runtimeInfo.initialLoadTime}ms`);
    }
    
    // Set up error tracking
    window.addEventListener('error', (event) => {
      trackError({
        message: event.message || 'Unknown error',
        source: event.filename || 'unknown',
        line: event.lineno,
        column: event.colno,
        stack: event.error?.stack,
        timestamp: new Date().toISOString()
      });
    });
    
    // Set up performance tracking
    if (window.PerformanceObserver) {
      try {
        const perfObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'longtask' && entry.duration > 50) {
              trackWarning({
                type: 'performance',
                message: `Long task detected: ${Math.round(entry.duration)}ms`,
                details: entry,
                timestamp: new Date().toISOString()
              });
            }
          }
        });
        perfObserver.observe({ entryTypes: ['longtask'] });
      } catch (e) {
        console.warn('Performance observer not supported', e);
      }
    }
    
    // Track WebGL context loss events
    document.addEventListener('webglcontextlost', (event) => {
      trackError({
        message: 'WebGL context lost',
        details: event,
        timestamp: new Date().toISOString()
      });
    });
    
    // Track window resize events
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        capabilities.windowSize = {
          width: window.innerWidth,
          height: window.innerHeight
        };
        logStartupEvent('Window resized', capabilities.windowSize);
      }, 500);
    });
    
    return true;
  } catch (error) {
    console.error('Failed to initialize buildInfo:', error);
    return false;
  }
}

/**
 * Log a startup event for diagnostics
 * @param {string} event - The event description
 * @param {object} details - Optional details about the event
 */
function logStartupEvent(event, details = null) {
  const timestamp = new Date().toISOString();
  console.log(`[BuildInfo] ${event}`, details || '');
  
  runtimeInfo.startupSequence.push({
    event,
    details,
    timestamp,
    timeFromStart: Date.now() - new Date(buildInfo.startupTime).getTime()
  });
}

/**
 * Track an error that occurred during runtime
 * @param {object} error - The error information
 */
function trackError(error) {
  runtimeInfo.errors.push(error);
  runtimeInfo.lastError = error;
  console.error('[BuildInfo] Error tracked:', error);
}

/**
 * Track a warning that occurred during runtime
 * @param {object} warning - The warning information
 */
function trackWarning(warning) {
  runtimeInfo.warnings.push(warning);
  console.warn('[BuildInfo] Warning tracked:', warning);
}

/**
 * Update scene statistics for performance monitoring
 * @param {object} stats - The scene statistics
 */
function updateSceneStats(stats) {
  runtimeInfo.sceneStats = {
    ...runtimeInfo.sceneStats,
    ...stats,
    lastUpdateTime: new Date().toISOString()
  };
}

/**
 * Register a module as active
 * @param {string} moduleName - The name of the module
 */
function registerModule(moduleName) {
  runtimeInfo.activeModules.add(moduleName);
  logStartupEvent(`Module registered: ${moduleName}`);
}

/**
 * Get current build and runtime information
 * @returns {object} The combined build and runtime information
 */
function getBuildInfo() {
  // Update dynamic properties
  runtimeInfo.lastActivityTime = new Date();
  
  // Return combined info
  return {
    build: { ...buildInfo },
    capabilities: { ...capabilities },
    dependencies: { ...dependencies },
    runtime: { 
      ...runtimeInfo,
      activeModules: Array.from(runtimeInfo.activeModules),
      uptime: getUptime()
    }
  };
}

/**
 * Get application uptime in seconds
 * @returns {number} Uptime in seconds
 */
function getUptime() {
  return Math.round((Date.now() - new Date(buildInfo.startupTime).getTime()) / 1000);
}

/**
 * Detect WebGL 1.0 support
 * @returns {boolean} Whether WebGL 1.0 is supported
 */
function detectWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && 
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
  } catch (e) {
    return false;
  }
}

/**
 * Detect WebGL 2.0 support
 * @returns {boolean} Whether WebGL 2.0 is supported
 */
function detectWebGL2() {
  try {
    const canvas = document.createElement('canvas');
    return !!(window.WebGL2RenderingContext && canvas.getContext('webgl2'));
  } catch (e) {
    return false;
  }
}

/**
 * Try to detect if a high-performance GPU is available
 * @returns {boolean} Whether a high-performance GPU is likely available
 */
function detectHighPerformanceGPU() {
  // This is a best-effort detection that won't be 100% accurate
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl');
    if (!gl) return false;
    
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) return false;
    
    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
    
    // Check for known high-performance GPU indicators
    const highPerformanceIndicators = [
      'nvidia', 'quadro', 'geforce', 'radeon', 'firepro',
      'intel iris', 'intel xe', 'adreno', 'mali-g', 'apple gpu'
    ];
    
    const lowPerformanceIndicators = [
      'intel hd graphics', 'mesa', 'llvmpipe', 'software rasterizer', 
      'swiftshader', 'angle'
    ];
    
    const rendererLower = renderer.toLowerCase();
    
    // Return true if any high-performance indicator is found and no low-performance indicator
    return highPerformanceIndicators.some(indicator => 
      rendererLower.includes(indicator.toLowerCase())) &&
      !lowPerformanceIndicators.some(indicator => 
        rendererLower.includes(indicator.toLowerCase()));
  } catch (e) {
    return false;
  }
}

/**
 * Get memory info if available
 * @returns {object|null} Memory information or null if not available
 */
function getMemoryInfo() {
  try {
    if (performance && performance.memory) {
      return {
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
      };
    }
    return null;
  } catch (e) {
    return null;
  }
}

/**
 * Get the Three.js version from the global THREE object
 * @returns {string} The Three.js version or 'unknown'
 */
function getThreeJsVersion() {
  try {
    return window.THREE?.REVISION || 'unknown';
  } catch (e) {
    return 'unknown';
  }
}

// Initialize build info on module load
initialize();

// Export public API
export {
  getBuildInfo,
  logStartupEvent,
  trackError,
  trackWarning,
  updateSceneStats,
  registerModule
};

// Replace these with actual values during build
// In a real project, we'd use Vite's define plugin
function __BUILD_DATE__() {
  return new Date().toISOString();
}

function __COMMIT_HASH__() {
  return 'development';
} 