const logger = {
  info: (msg: string) => console.log(`[WorkerPool] ${msg}`),
  error: (msg: string, error?: any) =>
    console.error(`[WorkerPool] ${msg}`, error),
};

export interface WorkerTask<T = any, R = any> {
  id: string;
  data: T;
  transferables?: Transferable[];
}

export interface WorkerResult<R = any> {
  id: string;
  result?: R;
  error?: string;
  duration: number;
}

export class WorkerPool {
  private workers: Worker[] = [];
  private availableWorkers: Set<number> = new Set();
  private pendingTasks: Array<{
    task: WorkerTask;
    resolve: (result: WorkerResult) => void;
    reject: (error: Error) => void;
  }> = [];
  private workerScript: string;

  constructor(
    workerScript: string,
    poolSize: number = navigator.hardwareConcurrency || 4
  ) {
    this.workerScript = workerScript;
    this.initializeWorkers(poolSize);
    logger.info(`Worker pool initialized with ${poolSize} workers`);
  }

  private initializeWorkers(poolSize: number): void {
    for (let i = 0; i < poolSize; i++) {
      const worker = new Worker(this.workerScript, { type: 'module' });

      worker.onmessage = (event) => {
        this.handleWorkerMessage(i, event.data);
      };

      worker.onerror = (error) => {
        logger.error(`Worker ${i} error:`, error.message);
      };

      this.workers.push(worker);
      this.availableWorkers.add(i);
    }
  }

  private handleWorkerMessage(workerIndex: number, result: WorkerResult): void {
    this.availableWorkers.add(workerIndex);

    const pendingTask = this.pendingTasks.shift();
    if (pendingTask) {
      if (result.error) {
        pendingTask.reject(new Error(result.error));
      } else {
        pendingTask.resolve(result);
      }
    }

    // 次のタスクを処理
    this.processNextTask();
  }

  private processNextTask(): void {
    if (this.pendingTasks.length === 0 || this.availableWorkers.size === 0) {
      return;
    }

    const workerIndex = Array.from(this.availableWorkers)[0];
    this.availableWorkers.delete(workerIndex);

    const pendingTask = this.pendingTasks[0];
    const worker = this.workers[workerIndex];

    // タスクをワーカーに送信
    if (pendingTask.task.transferables) {
      worker.postMessage(pendingTask.task, pendingTask.task.transferables);
    } else {
      worker.postMessage(pendingTask.task);
    }
  }

  async execute<T, R>(task: WorkerTask<T, R>): Promise<WorkerResult<R>> {
    return new Promise((resolve, reject) => {
      this.pendingTasks.push({ task, resolve, reject });
      this.processNextTask();
    });
  }

  async executeAll<T, R>(
    tasks: WorkerTask<T, R>[]
  ): Promise<WorkerResult<R>[]> {
    const promises = tasks.map((task) => this.execute(task));
    return Promise.all(promises);
  }

  getPoolStatus(): {
    totalWorkers: number;
    availableWorkers: number;
    pendingTasks: number;
  } {
    return {
      totalWorkers: this.workers.length,
      availableWorkers: this.availableWorkers.size,
      pendingTasks: this.pendingTasks.length,
    };
  }

  terminate(): void {
    this.workers.forEach((worker) => worker.terminate());
    this.workers = [];
    this.availableWorkers.clear();
    this.pendingTasks = [];
    logger.info('Worker pool terminated');
  }
}
