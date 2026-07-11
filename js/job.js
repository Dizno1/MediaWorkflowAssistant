(function () {
  function createJob(intent, file, inspection) {
    const createdAt = new Date();
    const project = window.ProjectWorkspace && window.ProjectWorkspace.getActive ? window.ProjectWorkspace.getActive() : null;
    const job = {
      id: `job-${Date.now()}-${Math.random().toString(16).slice(2)}`, projectId: project ? project.id : '', intent, workflow: intent.workflow,
      sourceFile: file, sourceFileName: file ? (file.name || file.url || 'Unknown') : (inspection.sourceUrl || inspection.name || 'Unknown'), inspection,
      capability: intent.capability, provider: intent.capability ? intent.capability.provider : null, createdAt, startedAt: null, queuedAt: null,
      completedAt: null, durationMs: null, status: 'ready', currentStepIndex: -1, progress: 0, outputs: [], messages: [],
      completedSteps: [], failedSteps: [], checkpoints: [], retry: { count: 0, max: 3 }, knowledgeModel: null, assessment: null, accessibilityPlan: null
    };
    if (window.ProductionFeatures) { window.ProductionFeatures.saveJob(job); window.ProductionFeatures.checkpoint(job, 'job-created'); window.ProductionFeatures.recordHistory(job, 'Job created'); }
    return job;
  }
  function finishJob(job) { job.completedAt = new Date(); job.durationMs = job.startedAt ? job.completedAt - job.startedAt : 0; return job; }
  function formatDurationMs(milliseconds) { if (!Number.isFinite(milliseconds)) return 'Unknown'; if (milliseconds < 1000) return `${milliseconds} ms`; const seconds=Math.round(milliseconds/1000); if(seconds<60)return `${seconds} second${seconds===1?'':'s'}`; const minutes=Math.floor(seconds/60),remaining=seconds%60; return `${minutes} minute${minutes===1?'':'s'} ${remaining} second${remaining===1?'':'s'}`; }
  window.createJob=createJob; window.finishJob=finishJob; window.formatJobDuration=formatDurationMs;
})();
