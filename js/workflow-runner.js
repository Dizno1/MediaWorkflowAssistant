(function () {
  class WorkflowRunner {
    constructor(options = {}) {
      this.onUpdate = options.onUpdate || function () {};
      this.onComplete = options.onComplete || function () {};
      this.onError = options.onError || function () {};
    }

    async run(job) {
      const steps = job.workflow.steps || [];

      try {
        job.status = 'running';
        this.onUpdate(job, {
          message: `${job.workflow.name} started with ${providerName(job)}.`,
          stepIndex: -1
        });

        for (let index = 0; index < steps.length; index += 1) {
          job.currentStepIndex = index;
          job.progress = Math.round((index / steps.length) * 100);
          this.onUpdate(job, {
            message: `${steps[index]} started.`,
            stepIndex: index
          });

          await this.executeStep(job, steps[index], index);

          job.progress = Math.round(((index + 1) / steps.length) * 100);
          this.onUpdate(job, {
            message: `${steps[index]} completed.`,
            stepIndex: index
          });
        }

        job.status = job.capability && job.capability.canRun ? 'completed' : 'planned';
        window.finishJob(job);
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

    executeStep(job, step, index) {
      const delay = job.capability && job.capability.canRun ? 500 + (index * 90) : 240 + (index * 60);
      return new Promise((resolve) => {
        window.setTimeout(resolve, delay);
      });
    }

    createOutputs(job) {
      const workflowId = job.workflow.id;
      const baseName = stripExtension(job.sourceFileName);
      const plannedNote = job.capability && job.capability.canRun
        ? 'Created in browser workflow mode.'
        : 'Planned output. This workflow needs its processing provider before it can create the final file.';

      const outputMap = {
        'extract-audio': [
          artifact(`${baseName}.mp3`, 'Audio file', plannedNote, job)
        ],
        'create-transcript': [
          artifact(`${baseName}-transcript.txt`, 'Transcript draft', plannedNote, job)
        ],
        'create-captions': [
          artifact(`${baseName}.vtt`, 'Caption file', plannedNote, job),
          artifact(`${baseName}-transcript.txt`, 'Transcript draft', plannedNote, job)
        ],
        'compress-video': [
          artifact(`${baseName}-compressed.mp4`, 'Compressed video', plannedNote, job)
        ],
        'compress-audio': [
          artifact(`${baseName}-compressed.m4a`, 'Compressed audio', plannedNote, job)
        ],
        'normalize-audio': [
          artifact(`${baseName}-normalized.m4a`, 'Normalized audio', plannedNote, job)
        ],
        'audio-description': [
          artifact(`${baseName}-audio-description-workspace.md`, 'Audio description workspace', 'Created as a guided planning result in browser workflow mode.', job)
        ],
        'prepare-for-ai': [
          artifact(`${baseName}-ai-package.md`, 'AI preparation package', 'Created as a browser workflow result.', job)
        ]
      };

      return outputMap[workflowId] || (job.workflow.outputs || []).map((output, index) => (
        artifact(output, `Output ${index + 1}`, plannedNote, job)
      ));
    }
  }

  function artifact(name, type, description, job) {
    return {
      name,
      type,
      description,
      provider: providerName(job),
      status: job.status === 'completed' ? 'Created' : 'Planned'
    };
  }

  function providerName(job) {
    return job.provider ? job.provider.name : 'No provider';
  }

  function stripExtension(fileName) {
    return String(fileName || 'media').replace(/\.[^/.]+$/, '');
  }

  window.WorkflowRunner = WorkflowRunner;
})();
