(function () {
  const storagePrefix = 'media-workflow-assistant-knowledge:';

  function sourceKey(source) {
    const parts = [
      source.type || 'file',
      source.name || '',
      source.size || '',
      source.durationSeconds || '',
      source.width || '',
      source.height || ''
    ];
    return parts.join('|').toLowerCase();
  }

  function load(source) {
    try {
      const stored = window.localStorage.getItem(storagePrefix + sourceKey(source));
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      return null;
    }
  }

  function save(model) {
    model.updatedAt = new Date().toISOString();
    try {
      window.localStorage.setItem(storagePrefix + sourceKey(model.source), JSON.stringify(model));
    } catch (error) {
      model.persistenceWarning = 'The browser could not save this knowledge for a later visit.';
    }
    return model;
  }

  function merge(baseModel, storedModel) {
    if (!storedModel) return baseModel;

    return {
      ...baseModel,
      accessibility: mergeObject(baseModel.accessibility, storedModel.accessibility),
      audio: mergeObject(baseModel.audio, storedModel.audio),
      visual: mergeObject(baseModel.visual, storedModel.visual),
      analysis: mergeObject(baseModel.analysis, storedModel.analysis),
      results: Array.isArray(storedModel.results) ? storedModel.results : [],
      history: Array.isArray(storedModel.history) ? storedModel.history : [],
      activeJobs: [],
      updatedAt: storedModel.updatedAt || baseModel.analysis.createdAt
    };
  }

  function mergeObject(base, stored) {
    const result = { ...base };
    Object.keys(stored || {}).forEach((key) => {
      const value = stored[key];
      result[key] = value && typeof value === 'object' && !Array.isArray(value)
        ? mergeObject(base[key] || {}, value)
        : value;
    });
    return result;
  }

  function recordJob(model, job) {
    const updated = model;
    updated.results = Array.isArray(updated.results) ? updated.results : [];
    updated.history = Array.isArray(updated.history) ? updated.history : [];

    const createdAt = new Date().toISOString();
    const artifacts = (job.outputs || []).map((output) => ({
      id: output.id || '',
      name: output.name,
      type: output.type,
      mimeType: output.mimeType || '',
      description: output.description || '',
      size: Number.isFinite(output.size) ? output.size : null,
      durationSeconds: Number.isFinite(output.durationSeconds) ? output.durationSeconds : null,
      sourceKey: sourceKey(updated.source),
      sourceName: job.sourceFileName,
      workflowId: job.workflow.id,
      createdAt
    }));

    updated.results.push(...artifacts);
    updated.history.push({
      workflowId: job.workflow.id,
      title: job.intent.title,
      status: job.status,
      jobId: job.id,
      sourceKey: sourceKey(updated.source),
      startedAt: job.startedAt ? job.startedAt.toISOString() : '',
      completedAt: job.completedAt ? job.completedAt.toISOString() : createdAt,
      durationMs: job.durationMs,
      createdAt,
      artifactNames: artifacts.map((artifact) => artifact.name),
      exportOptions: job.exportOptions || null
    });

    applyWorkflowKnowledge(updated, job, artifacts);
    refreshAnalysisLists(updated);
    return save(updated);
  }

  function applyWorkflowKnowledge(model, job, artifacts) {
    const workflowId = job.workflow.id;
    if (workflowId === 'create-transcript') {
      model.accessibility.transcript.present = true;
      model.accessibility.transcript.status = 'complete';
      model.accessibility.transcript.artifacts = artifacts;
      model.accessibility.transcript.wordCount = job.transcriptOptions ? job.transcriptOptions.wordCount : null;
      model.accessibility.transcript.reviewedAt = job.transcriptOptions ? job.transcriptOptions.reviewedAt : null;
      model.accessibility.transcript.confidence = {
        level: 'high',
        reason: 'A reviewed transcript was created and saved in this browser.'
      };
    }

    if (workflowId === 'create-captions') {
      model.accessibility.captions.present = true;
      model.accessibility.captions.status = 'workspace-created';
      model.accessibility.captions.artifacts = artifacts;
      model.accessibility.captions.confidence = {
        level: 'high',
        reason: 'A caption worksheet and WebVTT starter file were created in this browser.'
      };
    }

    if (workflowId === 'audio-description') {
      model.accessibility.audioDescription.present = true;
      model.accessibility.audioDescription.status = 'workspace-created';
      model.accessibility.audioDescription.artifacts = artifacts;
      model.accessibility.audioDescription.confidence = {
        level: 'high',
        reason: 'An audio description worksheet was created in this browser.'
      };
    }

    if (workflowId === 'extract-audio') {
      model.audio.extractedCopy = { status: 'complete', artifacts };
    }

    if (workflowId === 'compress-video') {
      model.source.smallerCopy = { status: 'complete', artifacts };
    }

    if (workflowId === 'prepare-for-ai') {
      model.analysis.fileInformation = { status: 'complete', artifacts };
    }

    if (workflowId === 'accessibility-package') {
      model.analysis.accessibilityPackage = {
        status: 'complete',
        artifacts,
        createdAt: new Date().toISOString(),
        exportOptions: job.exportOptions || null
      };
    }
  }

  function refreshAnalysisLists(model) {
    const completed = new Set(model.analysis.completed || []);
    const pending = new Set(model.analysis.pending || []);

    if (model.accessibility.transcript.present) completed.add('completed-transcript');
    if (model.accessibility.captions.present) completed.add('caption-workspace');
    if (model.accessibility.audioDescription.present) completed.add('audio-description-workspace');
    if (model.audio.extractedCopy && model.audio.extractedCopy.status === 'complete') completed.add('extracted-audio');
    if (model.source.smallerCopy && model.source.smallerCopy.status === 'complete') completed.add('smaller-video-copy');
    if (model.analysis.accessibilityPackage && model.analysis.accessibilityPackage.status === 'complete') completed.add('accessibility-package');

    model.analysis.completed = Array.from(completed);
    model.analysis.pending = Array.from(pending);
  }

  function summarize(model) {
    const results = Array.isArray(model.results) ? model.results : [];
    const completed = model.analysis && Array.isArray(model.analysis.completed) ? model.analysis.completed.length : 0;
    return {
      completed,
      results: results.length,
      lastUpdated: model.updatedAt || model.analysis.createdAt,
      restored: results.length > 0 || (Array.isArray(model.history) && model.history.length > 0)
    };
  }

  window.SharedKnowledge = { load, save, merge, recordJob, summarize, sourceKey };
})();
