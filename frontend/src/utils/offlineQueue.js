// Offline operation queue manager with persistent storage

import { cartSyncManager } from './cartSync';
import { createErrorObject, ErrorTypes } from './errorHandler';

// Queue storage keys
const QUEUE_STORAGE_KEY = 'cart_offline_queue';
const QUEUE_METADATA_KEY = 'cart_queue_metadata';

// Operation priority levels
export const OperationPriority = {
  LOW: 1,
  NORMAL: 2,
  HIGH: 3,
  CRITICAL: 4
};

// Queue operation status
export const QueueOperationStatus = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};

// Enhanced queue operation structure
export class QueueOperation {
  constructor(type, payload, options = {}) {
    this.id = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.type = type;
    this.payload = payload;
    this.priority = options.priority || OperationPriority.NORMAL;
    this.status = QueueOperationStatus.PENDING;
    this.createdAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
    this.attempts = 0;
    this.maxAttempts = options.maxAttempts || 3;
    this.retryDelay = options.retryDelay || 1000;
    this.metadata = options.metadata || {};
    this.dependencies = options.dependencies || [];
    this.timeout = options.timeout || 30000;
  }

  updateStatus(status, error = null) {
    this.status = status;
    this.updatedAt = new Date().toISOString();
    if (error) {
      this.lastError = createErrorObject(error, { operationId: this.id });
    }
  }

  incrementAttempts() {
    this.attempts++;
    this.updatedAt = new Date().toISOString();
  }

  canRetry() {
    return this.attempts < this.maxAttempts && 
           this.status !== QueueOperationStatus.COMPLETED &&
           this.status !== QueueOperationStatus.CANCELLED;
  }

  shouldRetry(error) {
    if (!this.canRetry()) return false;
    
    const errorObj = createErrorObject(error);
    return errorObj.type === ErrorTypes.NETWORK_ERROR || 
           errorObj.type === ErrorTypes.SERVER_ERROR;
  }
}

// Offline queue manager
export class OfflineQueueManager {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.maxQueueSize = 100;
    this.processingInterval = null;
    this.listeners = new Set();
    
    // Load queue from storage on initialization
    this.loadFromStorage();
    
    // Set up periodic processing
    this.startPeriodicProcessing();
    
    // Listen for online/offline events
    this.setupNetworkListeners();
  }

  // Add operation to queue
  enqueue(operation) {
    if (this.queue.length >= this.maxQueueSize) {
      console.warn('Queue is full, removing oldest low-priority operation');
      this.removeOldestLowPriorityOperation();
    }

    // Check for duplicate operations
    const duplicate = this.findDuplicateOperation(operation);
    if (duplicate) {
      console.log('Merging duplicate operation:', operation.type);
      this.mergeDuplicateOperation(duplicate, operation);
      return duplicate.id;
    }

    this.queue.push(operation);
    this.sortQueueByPriority();
    this.saveToStorage();
    this.notifyListeners('operationAdded', operation);
    
    console.log(`📝 Queued operation: ${operation.type} (Priority: ${operation.priority})`);
    
    // Try to process immediately if online
    if (navigator.onLine && !this.processing) {
      this.processQueue();
    }
    
    return operation.id;
  }

  // Remove operation from queue
  dequeue(operationId) {
    const index = this.queue.findIndex(op => op.id === operationId);
    if (index !== -1) {
      const operation = this.queue.splice(index, 1)[0];
      this.saveToStorage();
      this.notifyListeners('operationRemoved', operation);
      console.log(`✅ Removed operation: ${operation.type}`);
      return operation;
    }
    return null;
  }

  // Find operation by ID
  findOperation(operationId) {
    return this.queue.find(op => op.id === operationId);
  }

  // Update operation status
  updateOperationStatus(operationId, status, error = null) {
    const operation = this.findOperation(operationId);
    if (operation) {
      operation.updateStatus(status, error);
      this.saveToStorage();
      this.notifyListeners('operationUpdated', operation);
    }
  }

  // Process all queued operations
  async processQueue() {
    if (this.processing || !navigator.onLine) {
      return { success: false, reason: 'already_processing_or_offline' };
    }

    if (this.queue.length === 0) {
      return { success: true, reason: 'no_operations' };
    }

    this.processing = true;
    this.notifyListeners('processingStarted');
    
    console.log(`🔄 Processing ${this.queue.length} queued operations`);
    
    const results = [];
    const pendingOperations = this.queue.filter(op => 
      op.status === QueueOperationStatus.PENDING || 
      (op.status === QueueOperationStatus.FAILED && op.canRetry())
    );

    // Process operations by priority
    for (const operation of pendingOperations) {
      if (!navigator.onLine) {
        console.log('📡 Lost connection, stopping queue processing');
        break;
      }

      try {
        await this.processOperation(operation);
        results.push({ operation, success: true });
      } catch (error) {
        console.error(`❌ Failed to process operation ${operation.type}:`, error);
        results.push({ operation, success: false, error });
      }
    }

    this.processing = false;
    this.notifyListeners('processingCompleted', results);
    
    const successCount = results.filter(r => r.success).length;
    console.log(`✅ Queue processing complete: ${successCount}/${results.length} succeeded`);
    
    return {
      success: successCount === results.length,
      results,
      processed: results.length,
      remaining: this.queue.filter(op => op.status === QueueOperationStatus.PENDING).length
    };
  }

  // Process a single operation
  async processOperation(operation) {
    operation.updateStatus(QueueOperationStatus.PROCESSING);
    operation.incrementAttempts();
    this.saveToStorage();
    
    try {
      // Check dependencies
      if (!this.areDependenciesSatisfied(operation)) {
        throw new Error('Operation dependencies not satisfied');
      }

      // Execute the operation through cart sync manager
      const result = await cartSyncManager.executePendingOperation(operation);
      
      operation.updateStatus(QueueOperationStatus.COMPLETED);
      this.dequeue(operation.id);
      
      console.log(`✅ Operation completed: ${operation.type}`);
      return result;
      
    } catch (error) {
      console.error(`❌ Operation failed: ${operation.type}`, error);
      
      if (operation.shouldRetry(error)) {
        operation.updateStatus(QueueOperationStatus.FAILED, error);
        console.log(`🔄 Will retry operation ${operation.type} (${operation.attempts}/${operation.maxAttempts})`);
      } else {
        operation.updateStatus(QueueOperationStatus.CANCELLED, error);
        console.log(`🚫 Operation cancelled after ${operation.attempts} attempts: ${operation.type}`);
      }
      
      this.saveToStorage();
      throw error;
    }
  }

  // Check if operation dependencies are satisfied
  areDependenciesSatisfied(operation) {
    return operation.dependencies.every(depId => {
      const dep = this.findOperation(depId);
      return !dep || dep.status === QueueOperationStatus.COMPLETED;
    });
  }

  // Find duplicate operations
  findDuplicateOperation(newOperation) {
    return this.queue.find(existing => 
      existing.type === newOperation.type &&
      existing.status === QueueOperationStatus.PENDING &&
      this.areOperationsEquivalent(existing, newOperation)
    );
  }

  // Check if two operations are equivalent
  areOperationsEquivalent(op1, op2) {
    if (op1.type !== op2.type) return false;
    
    // For cart operations, check if they affect the same item
    if (op1.payload.productId && op2.payload.productId) {
      return op1.payload.productId === op2.payload.productId &&
             op1.payload.size === op2.payload.size;
    }
    
    return JSON.stringify(op1.payload) === JSON.stringify(op2.payload);
  }

  // Merge duplicate operations
  mergeDuplicateOperation(existing, newOperation) {
    // For quantity updates, use the latest value
    if (newOperation.type === 'UPDATE_ITEM' && existing.type === 'UPDATE_ITEM') {
      existing.payload.quantity = newOperation.payload.quantity;
      existing.priority = Math.max(existing.priority, newOperation.priority);
      existing.updatedAt = new Date().toISOString();
    }
    
    this.saveToStorage();
  }

  // Remove oldest low-priority operation
  removeOldestLowPriorityOperation() {
    const lowPriorityOps = this.queue.filter(op => op.priority === OperationPriority.LOW);
    if (lowPriorityOps.length > 0) {
      const oldest = lowPriorityOps.reduce((prev, current) => 
        new Date(prev.createdAt) < new Date(current.createdAt) ? prev : current
      );
      this.dequeue(oldest.id);
    } else {
      // If no low priority operations, remove oldest pending operation
      const pendingOps = this.queue.filter(op => op.status === QueueOperationStatus.PENDING);
      if (pendingOps.length > 0) {
        const oldest = pendingOps.reduce((prev, current) => 
          new Date(prev.createdAt) < new Date(current.createdAt) ? prev : current
        );
        this.dequeue(oldest.id);
      }
    }
  }

  // Sort queue by priority and creation time
  sortQueueByPriority() {
    this.queue.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority; // Higher priority first
      }
      return new Date(a.createdAt) - new Date(b.createdAt); // Older first for same priority
    });
  }

  // Clear all operations
  clearQueue() {
    const count = this.queue.length;
    this.queue = [];
    this.saveToStorage();
    this.notifyListeners('queueCleared');
    console.log(`🗑️ Cleared ${count} queued operations`);
  }

  // Clear completed operations
  clearCompletedOperations() {
    const initialCount = this.queue.length;
    this.queue = this.queue.filter(op => op.status !== QueueOperationStatus.COMPLETED);
    const removedCount = initialCount - this.queue.length;
    
    if (removedCount > 0) {
      this.saveToStorage();
      this.notifyListeners('completedOperationsCleared');
      console.log(`🗑️ Cleared ${removedCount} completed operations`);
    }
  }

  // Get queue statistics
  getQueueStats() {
    const stats = {
      total: this.queue.length,
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
      byPriority: {
        [OperationPriority.CRITICAL]: 0,
        [OperationPriority.HIGH]: 0,
        [OperationPriority.NORMAL]: 0,
        [OperationPriority.LOW]: 0
      }
    };

    this.queue.forEach(op => {
      stats[op.status]++;
      stats.byPriority[op.priority]++;
    });

    return stats;
  }

  // Save queue to localStorage
  saveToStorage() {
    try {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(this.queue));
      localStorage.setItem(QUEUE_METADATA_KEY, JSON.stringify({
        lastSaved: new Date().toISOString(),
        version: '1.0'
      }));
    } catch (error) {
      console.error('Failed to save queue to storage:', error);
    }
  }

  // Load queue from localStorage
  loadFromStorage() {
    try {
      const queueData = localStorage.getItem(QUEUE_STORAGE_KEY);
      if (queueData) {
        const operations = JSON.parse(queueData);
        this.queue = operations.map(op => {
          const operation = new QueueOperation(op.type, op.payload);
          Object.assign(operation, op);
          return operation;
        });
        
        // Reset processing status for any operations that were processing
        this.queue.forEach(op => {
          if (op.status === QueueOperationStatus.PROCESSING) {
            op.status = QueueOperationStatus.PENDING;
          }
        });
        
        console.log(`📂 Loaded ${this.queue.length} operations from storage`);
      }
    } catch (error) {
      console.error('Failed to load queue from storage:', error);
      this.queue = [];
    }
  }

  // Set up network event listeners
  setupNetworkListeners() {
    const handleOnline = () => {
      console.log('🌐 Connection restored, processing queued operations');
      this.processQueue();
    };

    const handleOffline = () => {
      console.log('📡 Connection lost, operations will be queued');
      this.processing = false;
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
  }

  // Start periodic processing
  startPeriodicProcessing() {
    this.processingInterval = setInterval(() => {
      if (navigator.onLine && this.queue.length > 0 && !this.processing) {
        this.processQueue();
      }
    }, 10000); // Process every 10 seconds
  }

  // Stop periodic processing
  stopPeriodicProcessing() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }

  // Add event listener
  addEventListener(callback) {
    this.listeners.add(callback);
  }

  // Remove event listener
  removeEventListener(callback) {
    this.listeners.delete(callback);
  }

  // Notify all listeners
  notifyListeners(event, data) {
    this.listeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error('Error in queue listener:', error);
      }
    });
  }

  // Cleanup
  destroy() {
    this.stopPeriodicProcessing();
    this.listeners.clear();
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
  }
}

// Global offline queue manager instance
export const offlineQueueManager = new OfflineQueueManager();

// Utility functions for creating queue operations
export const createCartOperation = (type, payload, options = {}) => {
  return new QueueOperation(type, payload, {
    priority: OperationPriority.NORMAL,
    maxAttempts: 3,
    ...options
  });
};

export const createHighPriorityCartOperation = (type, payload, options = {}) => {
  return new QueueOperation(type, payload, {
    priority: OperationPriority.HIGH,
    maxAttempts: 5,
    ...options
  });
};