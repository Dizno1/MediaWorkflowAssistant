(function () {
  function createJob(intent, file, inspection) {
    return {
      id: `job-${Date.now()}`,
      intent,
      workflow: intent.workflow,
      sourceFile: file,
      sourceFileName: file ? (file.name || file.url || 'Unknown') : (inspection.sourceUrl || inspection.name || 'Unknown'),
      inspection,
      capability: intent.capability,
      provider: intent.capability ? intent.capability.provider : null,
      startedAt: new Date(),
      completedAt: null,
      durationMs: null,
      status: 'ready',
      currentStepIndex: -1,
      progress: 0,
      outputs: [],
      messages: []
    };
  }

  function finishJob(job) {
    job.completedAt = new Date();
    job.durationMs = job.completedAt - job.startedAt;
    return job;
  }

  function formatDurationMs(milliseconds) {
    if (!Number.isFinite(milliseconds)) return 'Unknown';
    if (milliseconds < 1000) return `${milliseconds} ms`;
    const seconds = Math.round(milliseconds / 1000);
    if (seconds < 60) return `${seconds} second${seconds === 1 ? '' : 's'}`;
    const minutes = Math.floor(seconds / 60);
    const remaining = seconds % 60;
    return `${minutes} minute${minutes === 1 ? '' : 's'} ${remaining} second${remaining === 1 ? '' : 's'}`;
  }

  window.createJob = createJob;
  window.finishJob = finishJob;
  window.formatJobDuration = formatDurationMs;
})();
