(function () {
  class WorkflowRunner {
    constructor(options = {}) {
      this.onUpdate = options.onUpdate || function () {};
      this.onComplete = options.onComplete || function () {};
      this.onError = options.onError || function () {};
    }

    async run(job) {
      const steps = job.intent.steps || [];
      job.abortController = new AbortController();
      try {
        validateJob(job);
        job.status = 'running';
        this.onUpdate(job, { message: `${job.intent.title} started.`, stepIndex: -1 });

        for (let index = 0; index < steps.length; index += 1) {
          throwIfCancelled(job);
          job.currentStepIndex = index;
          job.progress = Math.max(job.progress, Math.round((index / Math.max(steps.length, 1)) * 85));
          this.onUpdate(job, { message: `${steps[index]} started.`, stepIndex: index });
          await this.executeStep(job, index);
        }

        const outputs = await window.ProviderManager.execute(job, (providerProgress) => {
          const value = typeof providerProgress === 'number' ? providerProgress : Number(providerProgress && providerProgress.progress);
          const message = providerProgress && providerProgress.message ? providerProgress.message : 'Creating the output file.';
          if (Number.isFinite(value)) job.progress = Math.min(99, Math.max(job.progress, 85 + Math.round(value * 0.14)));
          this.onUpdate(job, { message, stepIndex: Math.max(0, steps.length - 1) });
        });
        throwIfCancelled(job);
        if (!outputs || !outputs.length) throw new Error('The requested result could not be created.');

        job.outputs = window.OutputManager.register(job, normalizeOutputs(outputs, job));
        job.progress = 100;
        job.status = 'completed';
        window.finishJob(job);
        this.onComplete(job);
        return job;
      } catch (error) {
        if (job.cancelRequested || error.name === 'AbortError') {
          job.status = 'cancelled';
          error = new Error('The workflow was cancelled. No output was saved.');
        } else {
          job.status = 'failed';
        }
        window.finishJob(job);
        job.messages.push(error.message);
        this.onError(job, error);
        return job;
      }
    }

    executeStep(job) {
      return new Promise((resolve, reject) => {
        const timer = window.setTimeout(resolve, 120);
        job.abortController.signal.addEventListener('abort', () => {
          window.clearTimeout(timer);
          reject(new DOMException('Cancelled', 'AbortError'));
        }, { once: true });
      });
    }
  }

  function validateJob(job) {
    if (!job.workflow || !job.capability || !job.capability.canRun) throw new Error('This workflow is blocked because no compatible provider is available.');
    if (job.workflow.id === 'extract-audio') {
      if (!(job.sourceFile instanceof File)) throw new Error('Extract Audio requires a local media file.');
      if (!job.inspection || job.inspection.mediaType !== 'video' || !job.inspection.hasAudio) throw new Error('Choose a supported video file that contains an audio track.');
    }
  }

  function throwIfCancelled(job) {
    if (job.cancelRequested || (job.abortController && job.abortController.signal.aborted)) throw new DOMException('Cancelled', 'AbortError');
  }

  function normalizeOutputs(outputs, job) {
    return outputs.map((output) => ({ ...output, providerId: job.provider ? job.provider.id : '', status: 'Ready' }));
  }

  window.WorkflowRunner = WorkflowRunner;
})();
