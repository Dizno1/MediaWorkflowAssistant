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
    if (job.workflow.id === 'create-transcript') {
      if (!(job.sourceFile instanceof File)) throw new Error('Create Transcript requires a local audio or video file.');
      if (!job.inspection || !['audio', 'video'].includes(job.inspection.mediaType) || !job.inspection.hasAudio) throw new Error('Choose a supported audio or video file containing speech.');
      if (!job.transcriptOptions || !String(job.transcriptOptions.text || '').trim()) throw new Error('Enter transcript text before saving the transcript.');
      if (!job.transcriptOptions.reviewed) throw new Error('Review and confirm the transcript before saving it as complete.');
    }
    if (job.workflow.id === 'create-captions') {
      if (!(job.sourceFile instanceof File)) throw new Error('Create Captions requires a local video file.');
      if (!job.inspection || job.inspection.mediaType !== 'video' || !job.inspection.hasAudio) throw new Error('Choose a supported video file containing audio.');
      if (!job.captionOptions || !Array.isArray(job.captionOptions.cues) || !job.captionOptions.cues.length) throw new Error('Enter at least one timed caption cue.');
      if (!job.captionOptions.reviewed) throw new Error('Review and confirm the captions before saving them as complete.');
      const errors = window.CaptionReview.validate(job.captionOptions.cues, job.inspection.durationSeconds);
      if (errors.length) throw new Error(errors[0]);
    }
    if (job.workflow.id === 'generate-alt-text') {
      if (!(job.sourceFile instanceof File)) throw new Error('Describe This Picture requires a local image file.');
      if (!job.inspection || job.inspection.mediaType !== 'image') throw new Error('Choose a supported image file.');
      if (!job.imageDescriptionOptions || !String(job.imageDescriptionOptions.description || '').trim()) throw new Error('Enter an image description before saving it.');
      if (!job.imageDescriptionOptions.reviewed) throw new Error('Review and confirm the image description before saving it as complete.');
    }
    if (job.workflow.id === 'audio-description') {
      if (!(job.sourceFile instanceof File)) throw new Error('Create Audio Description requires a local video file.');
      if (!job.inspection || job.inspection.mediaType !== 'video' || !job.inspection.hasVideo) throw new Error('Choose a supported video file.');
      if (!job.audioDescriptionOptions || !Array.isArray(job.audioDescriptionOptions.cues) || !job.audioDescriptionOptions.cues.length) throw new Error('Enter at least one timed audio description cue.');
      if (!job.audioDescriptionOptions.reviewed) throw new Error('Review and confirm the audio description script before saving it as complete.');
      const errors = window.AudioDescriptionReview.validate(job.audioDescriptionOptions.cues, job.inspection.durationSeconds);
      if (errors.length) throw new Error(errors[0]);
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
