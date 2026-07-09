(function () {
  class WorkflowRunner {
    getProvider(job){ return window.ProviderManager.getProvider(job.workflow.id); }

    constructor(options = {}) {
      this.onUpdate = options.onUpdate || function () {};
      this.onComplete = options.onComplete || function () {};
      this.onError = options.onError || function () {};
    }

    async run(job) {
      const steps = job.workflow.steps || [];

      try {
        const provider=this.getProvider(job);
        job.provider=provider;
        if(provider){this.onUpdate(job,{message:`Using ${provider.name}.`,stepIndex:-1});}
        job.status = 'running';
        this.onUpdate(job, {
          message: `${job.workflow.name} started.`,
          stepIndex: -1
        });

        for (let index = 0; index < steps.length; index += 1) {
          job.currentStepIndex = index;
          job.progress = Math.round((index / steps.length) * 100);
          this.onUpdate(job, {
            message: `${steps[index]} started.`,
            stepIndex: index
          });

          await this.simulateStep(job, steps[index], index);

          job.progress = Math.round(((index + 1) / steps.length) * 100);
          this.onUpdate(job, {
            message: `${steps[index]} completed.`,
            stepIndex: index
          });
        }

        job.status = 'completed';
        job.completedAt = new Date();
        job.outputs = this.createOutputs(job);
        this.onComplete(job);
        return job;
      } catch (error) {
        job.status = 'failed';
        job.messages.push(error.message);
        this.onError(job, error);
        return job;
      }
    }

    simulateStep(job, step, index) {
      const delay = 450 + (index * 80);
      return new Promise((resolve) => {
        window.setTimeout(resolve, delay);
      });
    }

    createOutputs(job) {
      const workflowId = job.workflow.id;
      const baseName = stripExtension(job.sourceFileName);

      if (workflowId === 'extract-audio') {
        return [
          {
            name: `${baseName}.mp3`,
            type: 'Audio file',
            description: 'Planned extracted audio output. Browser-only demo mode does not create the final file yet.'
          }
        ];
      }

      if (workflowId === 'create-transcript') {
        return [
          {
            name: `${baseName}-transcript.txt`,
            type: 'Transcript draft',
            description: 'Planned transcript output. Speech recognition will be connected in a later sprint.'
          }
        ];
      }

      if (workflowId === 'compress-audio') {
        return [
          {
            name: `${baseName}-compressed.m4a`,
            type: 'Compressed audio',
            description: 'Planned compressed audio output. Encoding will be connected in a later sprint.'
          }
        ];
      }

      if (workflowId === 'normalize-audio') {
        return [
          {
            name: `${baseName}-normalized.m4a`,
            type: 'Normalized audio',
            description: 'Planned normalized audio output. Audio processing will be connected in a later sprint.'
          }
        ];
      }

      return (job.workflow.outputs || []).map((output, index) => ({
        name: output,
        type: `Output ${index + 1}`,
        description: 'Planned workflow output.'
      }));
    }
  }

  function stripExtension(fileName) {
    return String(fileName || 'media').replace(/\.[^/.]+$/, '');
  }

  window.WorkflowRunner = WorkflowRunner;
})();
