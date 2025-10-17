// Retry logic with exponential backoff

import { categorizeError, getRetryConfig, isRetryableError, logError } from './errorHandler';

// Sleep utility for delays
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Calculate delay with exponential backoff
const calculateDelay = (attempt, baseDelay, backoffMultiplier, maxDelay = 30000) => {
  const delay = baseDelay * Math.pow(backoffMultiplier, attempt);
  return Math.min(delay, maxDelay);
};

// Retry configuration
export const RetryConfig = {
  defaultMaxRetries: 3,
  defaultBaseDelay: 1000,
  defaultBackoffMultiplier: 2,
  maxDelay: 30000,
  jitterFactor: 0.1 // Add random jitter to prevent thundering herd
};

// Add jitter to delay to prevent thundering herd problem
const addJitter = (delay, jitterFactor = RetryConfig.jitterFactor) => {
  const jitter = delay * jitterFactor * Math.random();
  return delay + jitter;
};

// Retry wrapper function
export const withRetry = async (
  operation,
  context = {},
  customConfig = {}
) => {
  const config = { ...RetryConfig, ...customConfig };
  let lastError;
  
  for (let attempt = 0; attempt <= config.defaultMaxRetries; attempt++) {
    try {
      const result = await operation();
      
      // Log successful retry if this wasn't the first attempt
      if (attempt > 0) {
        console.log(`✅ Operation succeeded after ${attempt} retries`);
      }
      
      return result;
    } catch (error) {
      lastError = error;
      const errorCode = categorizeError(error);
      
      // Log the error
      const errorObj = logError(error, { ...context, attempt });
      
      // Check if we should retry
      if (!isRetryableError(errorCode)) {
        console.log(`❌ Error not retryable: ${errorCode}`);
        throw errorObj;
      }
      
      // Check if we've exceeded max retries
      if (attempt >= config.defaultMaxRetries) {
        console.log(`❌ Max retries (${config.defaultMaxRetries}) exceeded`);
        throw errorObj;
      }
      
      // Get retry configuration for this error type
      const retryConfig = getRetryConfig(errorCode);
      const delay = calculateDelay(
        attempt,
        retryConfig.baseDelay || config.defaultBaseDelay,
        retryConfig.backoffMultiplier || config.defaultBackoffMultiplier,
        config.maxDelay
      );
      
      const jitteredDelay = addJitter(delay);
      
      console.log(`🔄 Retrying in ${Math.round(jitteredDelay)}ms (attempt ${attempt + 1}/${config.defaultMaxRetries + 1})`);
      
      await sleep(jitteredDelay);
    }
  }
  
  // This should never be reached, but just in case
  throw logError(lastError, context);
};

// Specialized retry function for cart operations
export const retryCartOperation = async (operation, context = {}) => {
  return withRetry(operation, { ...context, operationType: 'cart' }, {
    defaultMaxRetries: 3,
    defaultBaseDelay: 1000,
    defaultBackoffMultiplier: 1.5
  });
};

// Specialized retry function for authentication operations
export const retryAuthOperation = async (operation, context = {}) => {
  return withRetry(operation, { ...context, operationType: 'auth' }, {
    defaultMaxRetries: 1,
    defaultBaseDelay: 500,
    defaultBackoffMultiplier: 1
  });
};

// Specialized retry function for network operations
export const retryNetworkOperation = async (operation, context = {}) => {
  return withRetry(operation, { ...context, operationType: 'network' }, {
    defaultMaxRetries: 5,
    defaultBaseDelay: 2000,
    defaultBackoffMultiplier: 2
  });
};

// Operation queue for failed operations
class OperationQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.maxQueueSize = 50;
  }
  
  // Add operation to queue
  enqueue(operation, context = {}) {
    if (this.queue.length >= this.maxQueueSize) {
      console.warn('Operation queue full, removing oldest operation');
      this.queue.shift();
    }
    
    const queueItem = {
      id: Date.now() + Math.random(),
      operation,
      context,
      timestamp: new Date().toISOString(),
      attempts: 0
    };
    
    this.queue.push(queueItem);
    console.log(`📝 Operation queued: ${queueItem.id}`);
    
    return queueItem.id;
  }
  
  // Process all queued operations
  async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }
    
    this.processing = true;
    console.log(`🔄 Processing ${this.queue.length} queued operations`);
    
    const results = [];
    
    while (this.queue.length > 0) {
      const item = this.queue.shift();
      
      try {
        const result = await withRetry(item.operation, {
          ...item.context,
          queuedOperation: true,
          queueId: item.id
        });
        
        results.push({ id: item.id, success: true, result });
        console.log(`✅ Queued operation completed: ${item.id}`);
      } catch (error) {
        results.push({ id: item.id, success: false, error });
        console.error(`❌ Queued operation failed: ${item.id}`, error);
      }
    }
    
    this.processing = false;
    console.log(`✅ Queue processing complete. ${results.filter(r => r.success).length}/${results.length} succeeded`);
    
    return results;
  }
  
  // Clear all queued operations
  clear() {
    const count = this.queue.length;
    this.queue = [];
    console.log(`🗑️ Cleared ${count} queued operations`);
  }
  
  // Get queue status
  getStatus() {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      oldestItem: this.queue[0]?.timestamp,
      newestItem: this.queue[this.queue.length - 1]?.timestamp
    };
  }
}

// Global operation queue instance
export const operationQueue = new OperationQueue();

// Auto-process queue when online
let isOnline = navigator.onLine;

const handleOnline = () => {
  if (!isOnline && navigator.onLine) {
    console.log('🌐 Connection restored, processing queued operations');
    operationQueue.processQueue();
  }
  isOnline = navigator.onLine;
};

// Listen for online/offline events
window.addEventListener('online', handleOnline);
window.addEventListener('offline', handleOnline);

// Periodic queue processing (fallback)
setInterval(() => {
  if (navigator.onLine && operationQueue.getStatus().queueLength > 0) {
    operationQueue.processQueue();
  }
}, 30000); // Process every 30 seconds if online