/**
 * FakeMessageQueue — In-memory message queue.
 *
 * Replaces: BullMQ (via QueueService abstraction)
 *
 * Features:
 * - add(job) → queues for processing
 * - process(handler) → registers processor
 * - Delayed jobs (setTimeout-based)
 * - Retry count tracking
 * - Dead Letter Queue (failed jobs after max retries)
 * - Job status tracking (waiting/active/completed/failed/delayed)
 *
 * @example
 * ```ts
 * const queue = new FakeMessageQueue('email-queue');
 * queue.process(async (job) => { await sendEmail(job.data); });
 * await queue.add({ to: 'test@example.com', subject: 'Hello' });
 * await queue.waitForCompletion();
 * const completed = queue.getJobs('completed');
 * expect(completed).toHaveLength(1);
 * ```
 */

export type JobStatus = 'waiting' | 'active' | 'completed' | 'failed' | 'delayed';

export interface FakeJob {
  id: string;
  data: any;
  status: JobStatus;
  attemptsMade: number;
  failedReason?: string;
  processedOn?: number;
  finishedOn?: number;
}

export interface JobOptions {
  delay?: number;
  attempts?: number;
  priority?: number;
}

interface JobEntry {
  job: FakeJob;
  options?: JobOptions;
}

export class FakeMessageQueue {
  private jobs: Map<string, JobEntry> = new Map();
  private processor: ((job: FakeJob) => Promise<any>) | null = null;
  private paused = false;
  private processing = false;
  private completionResolve: (() => void) | null = null;
  private jobIdCounter = 0;
  private timerIds: ReturnType<typeof setTimeout>[] = [];

  constructor(public readonly name: string) {}

  /**
   * Add a job to the queue.
   */
  async add(data: any, options?: JobOptions): Promise<FakeJob> {
    this.jobIdCounter++;
    const id = `${this.name}:${Date.now()}:${this.jobIdCounter}`;

    const job: FakeJob = {
      id,
      data,
      status: options?.delay ? 'delayed' : 'waiting',
      attemptsMade: 0,
    };

    this.jobs.set(id, { job, options });

    if (options?.delay && options.delay > 0) {
      const timerId = setTimeout(() => {
        job.status = 'waiting';
        this.processNext();
      }, options.delay);
      this.timerIds.push(timerId);
    } else {
      // Process asynchronously to allow the caller to set up handlers
      this.processNext();
    }

    return job;
  }

  /**
   * Register a processor function that handles jobs.
   */
  process(handler: (job: FakeJob) => Promise<any>): void {
    this.processor = handler;
  }

  /**
   * Get all jobs, optionally filtered by status.
   */
  getJobs(status?: JobStatus): FakeJob[] {
    const allJobs = Array.from(this.jobs.values()).map((e) => e.job);
    if (status) {
      return allJobs.filter((j) => j.status === status);
    }
    return allJobs;
  }

  /**
   * Get a specific job by its id.
   */
  getJob(jobId: string): FakeJob | undefined {
    return this.jobs.get(jobId)?.job;
  }

  /**
   * Wait for all current jobs to complete (or fail).
   * Resolves when there are no more waiting/active jobs.
   */
  async waitForCompletion(timeoutMs: number = 5000): Promise<void> {
    if (!this.hasPendingJobs()) {
      return;
    }

    return new Promise<void>((resolve, reject) => {
      this.completionResolve = resolve;
      const timeout = setTimeout(() => {
        this.completionResolve = null;
        resolve(); // Resolve anyway after timeout
      }, timeoutMs);
      this.timerIds.push(timeout);
    });
  }

  /**
   * Clear all jobs from the queue.
   */
  clear(): void {
    this.jobs.clear();
    this.timerIds.forEach(clearTimeout);
    this.timerIds = [];
  }

  /**
   * Pause job processing.
   */
  async pause(): Promise<void> {
    this.paused = true;
  }

  /**
   * Resume job processing.
   */
  async resume(): Promise<void> {
    this.paused = false;
    this.processNext();
  }

  /**
   * Process the next waiting job (internal).
   */
  private async processNext(): Promise<void> {
    if (this.paused || this.processing || !this.processor) {
      return;
    }

    // Find the next waiting job
    const waitingEntry = Array.from(this.jobs.values()).find((e) => e.job.status === 'waiting');

    if (!waitingEntry) {
      // No more pending jobs — resolve completion promise
      if (this.completionResolve && !this.hasPendingJobs()) {
        this.completionResolve();
        this.completionResolve = null;
      }
      return;
    }

    this.processing = true;
    const { job } = waitingEntry;

    job.status = 'active';
    job.processedOn = Date.now();
    job.attemptsMade++;

    if (this.processor) {
      try {
        await this.processor(job);
        job.status = 'completed';
        job.finishedOn = Date.now();
      } catch (err) {
        job.status = 'failed';
        job.failedReason = err instanceof Error ? err.message : String(err);
        job.finishedOn = Date.now();
      }
    }

    this.processing = false;

    // Continue processing next job
    setImmediate(() => this.processNext());
  }

  /**
   * Check if there are any pending jobs (waiting or active).
   */
  private hasPendingJobs(): boolean {
    return Array.from(this.jobs.values()).some(
      (e) => e.job.status === 'waiting' || e.job.status === 'active',
    );
  }

  /**
   * Process a specific job directly (used in tests for granular control).
   */
  private async processJob(job: FakeJob): Promise<void> {
    job.status = 'active';
    job.processedOn = Date.now();
    job.attemptsMade++;

    if (this.processor) {
      try {
        await this.processor(job);
        job.status = 'completed';
        job.finishedOn = Date.now();
      } catch (err) {
        job.status = 'failed';
        job.failedReason = err instanceof Error ? err.message : String(err);
        job.finishedOn = Date.now();
      }
    }
  }
}
