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
        job.startedAt = job.startedAt || new Date();
        if (window.ProductionFeatures) {
          if (job.status === 'queued') window.ProductionFeatures.transition(job, 'preparing');
          window.ProductionFeatures.checkpoint(job, 'before-workflow-start');
          window.ProductionFeatures.transition(job, 'running');
        } else job.status = 'running';
        this.onUpdate(job, { message: `${job.intent.title} started.`, stepIndex: -1 });

        const resumeIndex = Math.max(0, Number(job.currentStepIndex || -1));
        for (let index = 0; index < steps.length; index += 1) {
          if ((job.completedSteps || []).includes(steps[index]) || index < resumeIndex) continue;
          throwIfCancelled(job);
          job.currentStepIndex = index;
          job.progress = Math.max(job.progress, Math.round((index / Math.max(steps.length, 1)) * 85));
          if (window.ProductionFeatures) window.ProductionFeatures.checkpoint(job, 'before-step', { step: steps[index], stepIndex: index });
          this.onUpdate(job, { message: `${steps[index]} started.`, stepIndex: index });
          await this.executeStep(job, index);
          job.completedSteps = Array.isArray(job.completedSteps) ? job.completedSteps : [];
          if (!job.completedSteps.includes(steps[index])) job.completedSteps.push(steps[index]);
          if (window.ProductionFeatures) window.ProductionFeatures.checkpoint(job, 'after-step', { step: steps[index], stepIndex: index });
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
        if (window.ProductionFeatures) window.ProductionFeatures.transition(job, 'completed'); else job.status = 'completed';
        window.finishJob(job);
        if (window.ProductionFeatures) window.ProductionFeatures.checkpoint(job, 'job-completed');
        this.onComplete(job);
        return job;
      } catch (error) {
        if (job.pauseRequested && error.name === 'AbortError') {
          if (window.ProductionFeatures) window.ProductionFeatures.transition(job, 'paused'); else job.status = 'paused';
          error = new Error('The workflow was paused. Completed steps were preserved.');
          if (window.ProductionFeatures) window.ProductionFeatures.checkpoint(job, 'job-paused');
        } else if (job.cancelRequested || error.name === 'AbortError') {
          if (window.ProductionFeatures) window.ProductionFeatures.transition(job, 'cancelled'); else job.status = 'cancelled';
          error = new Error('The workflow was cancelled. No new output was saved.');
        } else {
          if (window.ProductionFeatures) window.ProductionFeatures.transition(job, 'failed', { error, recoverable: true }); else job.status = 'failed';
          job.failedSteps = Array.isArray(job.failedSteps) ? job.failedSteps : [];
          const step = steps[job.currentStepIndex]; if (step && !job.failedSteps.includes(step)) job.failedSteps.push(step);
          job.errorDetails = { message: error.message, at: new Date().toISOString(), recoverable: true };
          if (window.ProductionFeatures) window.ProductionFeatures.checkpoint(job, 'recoverable-error', { message: error.message });
        }
        window.finishJob(job);
        job.messages.push(error.message);
        if (window.ProductionFeatures) window.ProductionFeatures.saveJob(job);
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


    if (job.workflow.id === 'render-accessible-video') {
      if (!(job.sourceFile instanceof File)) throw new Error('Accessible video rendering requires the original local video file.');
      const artifacts = window.OutputManager.listForSource(job.knowledgeModel.source);
      const hasCaptions = artifacts.some((artifact) => artifact.mimeType === 'text/vtt' && String(artifact.content || '').trim());
      const hasDescribedAudio = artifacts.some((artifact) => artifact.mimeType === 'audio/wav' && artifact.url);
      if (!hasCaptions) throw new Error('Create and review captions before rendering the accessible video.');
      if (!hasDescribedAudio) throw new Error('Create synthesized narration and the described-audio mix before rendering the accessible video.');
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
