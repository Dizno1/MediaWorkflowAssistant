(function () {
  class WorkflowRunner {
    constructor(options = {}) {
      this.onUpdate = options.onUpdate || function () {};
      this.onComplete = options.onComplete || function () {};
      this.onError = options.onError || function () {};
    }

    async run(job) {
      const steps = job.intent.steps || [];

      try {
        job.status = 'running';
        this.onUpdate(job, {
          message: `${job.intent.title} started.`,
          stepIndex: -1
        });

        for (let index = 0; index < steps.length; index += 1) {
          job.currentStepIndex = index;
          job.progress = Math.round((index / steps.length) * 100);
          this.onUpdate(job, {
            message: `${steps[index]} started.`,
            stepIndex: index
          });

          await this.executeStep(index);

          job.progress = Math.round(((index + 1) / steps.length) * 100);
          this.onUpdate(job, {
            message: `${steps[index]} completed.`,
            stepIndex: index
          });
        }

        let outputs = null;
        if (job.capability && job.capability.canRun) {
          outputs = await window.ProviderManager.execute(job);
        }

        if (!outputs || !outputs.length) {
          throw new Error('The requested result could not be created in this version.');
        }

        job.status = 'completed';
        window.finishJob(job);
        job.outputs = normalizeOutputs(outputs, job);
        this.onComplete(job);
        return job;
      } catch (error) {
        job.status = 'failed';
        job.messages.push(error.message);
        this.onError(job, error);
        return job;
      }
    }

    executeStep(index) {
      return new Promise((resolve) => {
        window.setTimeout(resolve, 450 + (index * 90));
      });
    }
  }

  function normalizeOutputs(outputs, job) {
    return outputs.map((output) => ({
      name: output.name,
      type: output.type || 'File',
      description: output.description || 'Your file is ready.',
      providerId: job.provider ? job.provider.id : '',
      status: 'Ready',
      url: output.url || '',
      mimeType: output.mimeType || '',
      content: output.content || ''
    }));
  }

  window.WorkflowRunner = WorkflowRunner;
})();
