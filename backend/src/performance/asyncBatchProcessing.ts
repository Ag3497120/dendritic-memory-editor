/**
 * Async Batch Processing & Task Management
 *
 * Background job processing:
 * - Batch job queue management
 * - Async task execution
 * - Progress tracking
 * - Retry logic
 * - Priority queue
 * - Dead letter queue
 */

import { v4 as uuidv4 } from "uuid";

export type TaskPriority = "low" | "normal" | "high" | "critical";
export type TaskStatus =
  | "pending"
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "retry";

export interface BatchJob {
  id: string;
  name: string;
  items: any[];
  batchSize: number;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  processedItems: number;
  failedItems: number;
  startTime?: number;
  endTime?: number;
  estimatedDuration?: number;
  createdAt: number;
}

export interface Task {
  id: string;
  batchId: string;
  data: any;
  priority: TaskPriority;
  status: TaskStatus;
  retries: number;
  maxRetries: number;
  error?: string;
  result?: any;
  startTime?: number;
  endTime?: number;
  createdAt: number;
  attemptedAt?: number[];
}

export interface TaskQueue {
  name: string;
  tasks: Task[];
  processing: Set<string>;
  maxConcurrency: number;
  currentConcurrency: number;
}

export interface DeadLetterEntry {
  id: string;
  taskId: string;
  error: string;
  failureCount: number;
  lastAttempt: number;
}

export interface ProcessingStats {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  retryingTasks: number;
  averageProcessingTime: number;
  throughput: number; // tasks per second
  successRate: number;
}

/**
 * Async Batch Processing Engine
 */
export class AsyncBatchProcessingEngine {
  private batches: Map<string, BatchJob> = new Map();
  private tasks: Map<string, Task> = new Map();
  private queues: Map<string, TaskQueue> = new Map();
  private deadLetterQueue: Map<string, DeadLetterEntry> = new Map();
  private processingCallbacks: Map<string, Function> = new Map();
  private processingTimes: number[] = [];
  private completionTimestamps: number[] = [];
  private maxProcessingTimes: number = 1000;

  constructor() {
    // Initialize default queue
    this.createQueue("default", 5);
  }

  /**
   * Create task queue
   */
  createQueue(name: string, maxConcurrency: number): TaskQueue {
    const queue: TaskQueue = {
      name,
      tasks: [],
      processing: new Set(),
      maxConcurrency,
      currentConcurrency: 0,
    };

    this.queues.set(name, queue);
    return queue;
  }

  /**
   * Create batch job
   */
  createBatchJob<T>(
    name: string,
    items: T[],
    batchSize: number = 100
  ): BatchJob {
    const jobId = `batch-${uuidv4()}`;

    const job: BatchJob = {
      id: jobId,
      name,
      items,
      batchSize,
      status: "pending",
      progress: 0,
      processedItems: 0,
      failedItems: 0,
      createdAt: Date.now(),
    };

    this.batches.set(jobId, job);

    // Create tasks from batch items
    this.createTasksFromBatch(jobId, items, batchSize);

    return job;
  }

  /**
   * Create tasks from batch
   */
  private createTasksFromBatch(
    batchId: string,
    items: any[],
    batchSize: number
  ): void {
    const job = this.batches.get(batchId)!;

    for (let i = 0; i < items.length; i += batchSize) {
      const chunk = items.slice(i, i + batchSize);

      const task: Task = {
        id: `task-${uuidv4()}`,
        batchId,
        data: chunk,
        priority: "normal",
        status: "pending",
        retries: 0,
        maxRetries: 3,
        createdAt: Date.now(),
      };

      this.tasks.set(task.id, task);

      // Add to default queue
      const queue = this.queues.get("default")!;
      queue.tasks.push(task);
    }
  }

  /**
   * Enqueue task
   */
  enqueueTask(
    data: any,
    priority: TaskPriority = "normal",
    queueName: string = "default",
    batchId?: string
  ): Task {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue '${queueName}' not found`);
    }

    const task: Task = {
      id: `task-${uuidv4()}`,
      batchId: batchId || `adhoc-${Date.now()}`,
      data,
      priority,
      status: "queued",
      retries: 0,
      maxRetries: 3,
      createdAt: Date.now(),
    };

    this.tasks.set(task.id, task);

    // Insert in priority order
    this.insertInPriorityOrder(queue, task);

    return task;
  }

  /**
   * Insert task in priority order
   */
  private insertInPriorityOrder(queue: TaskQueue, task: Task): void {
    const priorityOrder: Record<TaskPriority, number> = {
      critical: 0,
      high: 1,
      normal: 2,
      low: 3,
    };

    let insertIndex = queue.tasks.length;

    for (let i = 0; i < queue.tasks.length; i++) {
      if (
        priorityOrder[task.priority] <
        priorityOrder[queue.tasks[i].priority]
      ) {
        insertIndex = i;
        break;
      }
    }

    queue.tasks.splice(insertIndex, 0, task);
  }

  /**
   * Process next task from queue
   */
  async processNextTask(queueName: string = "default"): Promise<Task | null> {
    const queue = this.queues.get(queueName);
    if (!queue || queue.currentConcurrency >= queue.maxConcurrency) {
      return null;
    }

    const task = queue.tasks.shift();
    if (!task) return null;

    task.status = "processing";
    task.startTime = Date.now();
    task.attemptedAt = task.attemptedAt || [];
    task.attemptedAt.push(Date.now());

    queue.processing.add(task.id);
    queue.currentConcurrency++;

    try {
      // Execute task (callback would be registered externally)
      const callback = this.processingCallbacks.get(task.id);
      if (callback) {
        task.result = await callback(task.data);
      }

      task.status = "completed";
      task.endTime = Date.now();

      // Update batch progress
      this.updateBatchProgress(task.batchId, true);

      // Record processing time
      const processingTime = task.endTime - task.startTime!;
      this.processingTimes.push(processingTime);
      if (this.processingTimes.length > this.maxProcessingTimes) {
        this.processingTimes.shift();
      }

      this.completionTimestamps.push(Date.now());
      if (this.completionTimestamps.length > 100) {
        this.completionTimestamps.shift();
      }
    } catch (error) {
      task.error = String(error);
      task.retries++;

      if (task.retries < task.maxRetries) {
        task.status = "retry";
        // Re-queue for retry
        this.insertInPriorityOrder(queue, task);
      } else {
        task.status = "failed";
        // Add to dead letter queue
        this.addToDeadLetterQueue(task);
        this.updateBatchProgress(task.batchId, false);
      }
    } finally {
      queue.processing.delete(task.id);
      queue.currentConcurrency--;
    }

    return task;
  }

  /**
   * Register task processing callback
   */
  registerProcessingCallback(taskId: string, callback: Function): void {
    this.processingCallbacks.set(taskId, callback);
  }

  /**
   * Update batch progress
   */
  private updateBatchProgress(batchId: string, success: boolean): void {
    const batch = this.batches.get(batchId);
    if (!batch) return;

    if (success) {
      batch.processedItems++;
    } else {
      batch.failedItems++;
    }

    const totalItems = batch.processedItems + batch.failedItems;
    batch.progress = (totalItems / batch.items.length) * 100;

    if (batch.progress === 100) {
      batch.status = batch.failedItems > 0 ? "failed" : "completed";
      batch.endTime = Date.now();
    } else {
      batch.status = "processing";
      if (!batch.startTime) {
        batch.startTime = Date.now();
      }
    }
  }

  /**
   * Add to dead letter queue
   */
  private addToDeadLetterQueue(task: Task): void {
    const existing = this.deadLetterQueue.get(task.id);

    if (existing) {
      existing.failureCount++;
      existing.lastAttempt = Date.now();
    } else {
      this.deadLetterQueue.set(task.id, {
        id: uuidv4(),
        taskId: task.id,
        error: task.error || "Unknown error",
        failureCount: 1,
        lastAttempt: Date.now(),
      });
    }
  }

  /**
   * Get task status
   */
  getTaskStatus(taskId: string): Task | null {
    return this.tasks.get(taskId) || null;
  }

  /**
   * Get batch status
   */
  getBatchStatus(batchId: string): BatchJob | null {
    return this.batches.get(batchId) || null;
  }

  /**
   * Get queue status
   */
  getQueueStatus(queueName: string = "default") {
    const queue = this.queues.get(queueName);
    if (!queue) return null;

    return {
      name: queue.name,
      pendingTasks: queue.tasks.length,
      processingTasks: queue.processing.size,
      maxConcurrency: queue.maxConcurrency,
      currentConcurrency: queue.currentConcurrency,
      utilizationRate: (queue.currentConcurrency / queue.maxConcurrency) * 100,
    };
  }

  /**
   * Get processing statistics
   */
  getProcessingStats(): ProcessingStats {
    const allTasks = Array.from(this.tasks.values());
    const completedTasks = allTasks.filter((t) => t.status === "completed");
    const failedTasks = allTasks.filter((t) => t.status === "failed");
    const retryingTasks = allTasks.filter((t) => t.status === "retry");

    const avgProcessingTime =
      this.processingTimes.length > 0
        ? this.processingTimes.reduce((a, b) => a + b, 0) /
          this.processingTimes.length
        : 0;

    // Throughput: tasks per second over last minute
    const oneMinuteAgo = Date.now() - 60000;
    const recentCompletions = this.completionTimestamps.filter(
      (t) => t > oneMinuteAgo
    );
    const throughput = recentCompletions.length / 60;

    const successRate =
      allTasks.length > 0
        ? (completedTasks.length / allTasks.length) * 100
        : 0;

    return {
      totalTasks: allTasks.length,
      completedTasks: completedTasks.length,
      failedTasks: failedTasks.length,
      retryingTasks: retryingTasks.length,
      averageProcessingTime: avgProcessingTime,
      throughput,
      successRate,
    };
  }

  /**
   * Get dead letter queue entries
   */
  getDeadLetterQueueEntries(limit: number = 50): DeadLetterEntry[] {
    return Array.from(this.deadLetterQueue.values())
      .sort((a, b) => b.lastAttempt - a.lastAttempt)
      .slice(0, limit);
  }

  /**
   * Retry task from dead letter queue
   */
  retryDeadLetterTask(taskId: string, queueName: string = "default"): boolean {
    const dlEntry = this.deadLetterQueue.get(taskId);
    if (!dlEntry) return false;

    const task = this.tasks.get(taskId);
    if (!task) return false;

    // Reset retries and status
    task.retries = 0;
    task.status = "queued";
    task.error = undefined;

    // Add back to queue
    const queue = this.queues.get(queueName);
    if (queue) {
      this.insertInPriorityOrder(queue, task);
    }

    // Remove from dead letter queue
    this.deadLetterQueue.delete(taskId);

    return true;
  }

  /**
   * Cancel task
   */
  cancelTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task || task.status === "completed" || task.status === "failed") {
      return false;
    }

    const batch = this.batches.get(task.batchId);
    if (batch && batch.status === "processing") {
      batch.progress = ((batch.processedItems + 1) / batch.items.length) * 100;
    }

    task.status = "failed";
    task.error = "Cancelled by user";
    return true;
  }

  /**
   * Get batch progress details
   */
  getBatchProgress(batchId: string) {
    const batch = this.batches.get(batchId);
    if (!batch) return null;

    const batchTasks = Array.from(this.tasks.values()).filter(
      (t) => t.batchId === batchId
    );

    const completedCount = batchTasks.filter(
      (t) => t.status === "completed"
    ).length;
    const failedCount = batchTasks.filter((t) => t.status === "failed").length;
    const processingCount = batchTasks.filter(
      (t) => t.status === "processing"
    ).length;

    const estimatedTimeRemaining =
      batch.startTime && processingCount > 0
        ? (
            ((Date.now() - batch.startTime) / (completedCount || 1)) *
            (batchTasks.length - completedCount)
          ) / 1000
        : 0;

    return {
      batchId,
      totalItems: batch.items.length,
      processed: batch.processedItems,
      failed: batch.failedItems,
      progress: batch.progress,
      status: batch.status,
      estimatedTimeRemaining: Math.ceil(estimatedTimeRemaining),
      startTime: batch.startTime,
      endTime: batch.endTime,
    };
  }

  /**
   * Clear completed batches
   */
  clearCompletedBatches(): number {
    let cleared = 0;

    for (const [batchId, batch] of this.batches) {
      if (batch.status === "completed" || batch.status === "failed") {
        // Remove associated tasks
        const batchTasks = Array.from(this.tasks.entries()).filter(
          ([, task]) => task.batchId === batchId
        );
        for (const [taskId] of batchTasks) {
          this.tasks.delete(taskId);
        }

        this.batches.delete(batchId);
        cleared++;
      }
    }

    return cleared;
  }

  /**
   * Get queue health
   */
  getQueuesHealth() {
    const health: Record<string, any> = {};

    for (const [queueName, queue] of this.queues) {
      const avgWaitTime =
        queue.tasks.length > 0
          ? queue.tasks.reduce(
              (sum, t) =>
                sum + (Date.now() - t.createdAt),
              0
            ) / queue.tasks.length
          : 0;

      health[queueName] = {
        pendingTasks: queue.tasks.length,
        processingTasks: queue.processing.size,
        maxConcurrency: queue.maxConcurrency,
        utilizationRate: (queue.currentConcurrency / queue.maxConcurrency) * 100,
        averageWaitTime: Math.ceil(avgWaitTime / 1000), // seconds
      };
    }

    return health;
  }
}

/**
 * Singleton instance
 */
let asyncBatchProcessingEngine: AsyncBatchProcessingEngine | null = null;

export function getAsyncBatchProcessingEngine(): AsyncBatchProcessingEngine {
  if (!asyncBatchProcessingEngine) {
    asyncBatchProcessingEngine = new AsyncBatchProcessingEngine();
  }
  return asyncBatchProcessingEngine;
}

export function resetAsyncBatchProcessingEngine(): void {
  asyncBatchProcessingEngine = null;
}
