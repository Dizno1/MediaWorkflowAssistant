(function () {
  class WorkflowExecutionEngine {
    constructor(options = {}) {
      this.queue = [];
      this.activeJob = null;
      this.processing = false;
      this.onQueued = options.onQueued || function () {};
      this.onUpdate = options.onUpdate || function () {};
      this.onComplete = options.onComplete || function () {};
      this.onError = options.onError || function () {};
      this.onCancel = options.onCancel || function () {};
    }

    enqueue(job) {
      if (!job) throw new Error('A workflow job is required.');
      job.status = 'queued';
      job.queuedAt = new Date();
      this.queue.push(job);
      this.onQueued(job, this.queue.length);
      this.processNext();
      return job;
    }

    cancel(jobId) {
      const queuedIndex = this.queue.findIndex((job) => job.id === jobId);
      if (queuedIndex >= 0) {
        const [job] = this.queue.splice(queuedIndex, 1);
        job.status = 'cancelled';
        job.completedAt = new Date();
        this.onCancel(job);
        return true;
      }
      if (this.activeJob && this.activeJob.id === jobId) {
        this.activeJob.cancelRequested = true;
        if (this.activeJob.abortController) this.activeJob.abortController.abort();
        return true;
      }
      return false;
    }

    async processNext() {
      if (this.processing || !this.queue.length) return;
      this.processing = true;
      const job = this.queue.shift();
      this.activeJob = job;
      const runner = new window.WorkflowRunner({
        onUpdate: this.onUpdate,
        onComplete: (completedJob) => {
          this.onComplete(completedJob);
        },
        onError: (failedJob, error) => {
          if (failedJob.status === 'cancelled') this.onCancel(failedJob);
          else this.onError(failedJob, error);
        }
      });
      await runner.run(job);
      this.activeJob = null;
      this.processing = false;
      this.processNext();
    }
  }

  window.WorkflowExecutionEngine = WorkflowExecutionEngine;
})();
