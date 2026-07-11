(function () {
  const orderedWorkflowIds = [
    'extract-audio',
    'create-transcript',
    'create-captions',
    'audio-description',
    'accessibility-package'
  ];

  const reviewWorkflowIds = new Set([
    'create-transcript',
    'create-captions',
    'audio-description',
    'accessibility-package'
  ]);

  function build(intents, mediaType) {
    const byWorkflow = new Map((intents || []).map((intent) => [intent.workflowId, intent]));
    const applicableOrder = mediaType === 'video'
      ? orderedWorkflowIds
      : ['create-transcript', 'accessibility-package'];

    const steps = applicableOrder
      .map((workflowId) => byWorkflow.get(workflowId))
      .filter(Boolean)
      .map((intent, index) => ({
        id: `chain-step-${index + 1}`,
        workflowId: intent.workflowId,
        title: intent.title,
        description: intent.description,
        intent,
        selected: !intent.completed && Boolean(intent.capability && intent.capability.canRun),
        completed: Boolean(intent.completed),
        blocked: !intent.completed && !Boolean(intent.capability && intent.capability.canRun),
        requiresReview: reviewWorkflowIds.has(intent.workflowId),
        state: intent.completed ? 'completed' : (!intent.capability || !intent.capability.canRun) ? 'blocked' : 'ready'
      }));

    return {
      id: `chain-${Date.now()}`,
      title: mediaType === 'video' ? 'Prepare this video for accessibility' : 'Prepare this media for accessibility',
      steps,
      currentIndex: -1,
      status: 'review',
      startedAt: null,
      completedAt: null
    };
  }

  function selectedSteps(chain) {
    return chain.steps.filter((step) => step.selected && !step.completed && !step.blocked);
  }

  function next(chain) {
    for (let index = chain.currentIndex + 1; index < chain.steps.length; index += 1) {
      const step = chain.steps[index];
      if (step.selected && !step.completed && !step.blocked) {
        chain.currentIndex = index;
        step.state = step.requiresReview ? 'review' : 'queued';
        return step;
      }
    }
    chain.status = 'completed';
    chain.completedAt = new Date().toISOString();
    return null;
  }

  function markRunning(chain, workflowId) {
    const step = chain.steps.find((item) => item.workflowId === workflowId);
    if (step) step.state = 'in-progress';
  }

  function markCompleted(chain, workflowId) {
    const step = chain.steps.find((item) => item.workflowId === workflowId);
    if (step) {
      step.completed = true;
      step.state = 'completed';
    }
  }

  function markFailed(chain, workflowId, message) {
    const step = chain.steps.find((item) => item.workflowId === workflowId);
    if (step) {
      step.state = 'failed';
      step.error = message || 'This workflow could not be completed.';
    }
    chain.status = 'paused';
  }

  window.WorkflowChain = {
    build,
    selectedSteps,
    next,
    markRunning,
    markCompleted,
    markFailed
  };
})();
