(function () {
  function createJob(workflow, file, inspection) {
    return {
      id: `job-${Date.now()}`,
      workflow,
      sourceFile: file,
      sourceFileName: file ? file.name : 'Unknown',
      inspection,
      startedAt: new Date(),
      completedAt: null,
      status: 'ready',
      currentStepIndex: -1,
      progress: 0,
      outputs: [],
      messages: []
    };
  }

  window.createJob = createJob;
})();
