(function () {
  const accessibilityPriority = {
    'create-captions': 100,
    'create-transcript': 95,
    'audio-description': 85,
    'generate-alt-text': 85,
    'ocr-document': 80,
    'ocr-image': 75,
    'extract-document-text': 65,
    'extract-audio': 45,
    'compress-video': 35,
    'compress-audio': 35,
    'normalize-audio': 35,
    'compress-image': 30,
    'resize-image': 25,
    'inspect-archive': 25,
    'save-file-information': 15
  };

  function build(model, assessment, plan, intents) {
    const assessmentByIntent = new Map(
      ((assessment && assessment.items) || [])
        .filter((item) => item.intentId)
        .map((item) => [item.intentId, item])
    );

    const planByIntent = new Map();
    ((plan && plan.steps) || []).forEach((step) => {
      if (step.intentId && !planByIntent.has(step.intentId)) planByIntent.set(step.intentId, step);
    });

    const history = Array.isArray(model.history) ? model.history : [];
    const activeJobs = Array.isArray(model.activeJobs) ? model.activeJobs : [];
    const completedWorkflows = new Set(
      history.filter((entry) => entry.status === 'completed').map((entry) => entry.workflowId)
    );

    const recommendations = (intents || []).map((intent) => {
      const assessmentItem = assessmentByIntent.get(intent.id);
      const planStep = planByIntent.get(intent.id);
      const completed = completedWorkflows.has(intent.workflowId) || isPresent(model, intent.workflowId);
      const inProgress = activeJobs.some((entry) => entry.workflowId === intent.workflowId && ['queued', 'running'].includes(entry.status));
      const available = Boolean(intent.capability && intent.capability.canRun);
      const dependencyState = dependencyStatus(planStep, plan);
      const score = calculateScore(intent, assessmentItem, planStep, completed, available, dependencyState);
      const state = completed ? 'completed' : inProgress ? 'in-progress' : (available && dependencyState === 'clear') ? 'ready' : 'blocked';

      return {
        ...intent,
        score,
        completed,
        inProgress,
        state,
        available,
        dependencyState,
        recommendationLevel: recommendationLevel(score, completed, available, inProgress, dependencyState),
        recommendationReason: buildReason(intent, assessmentItem, planStep, completed, available, dependencyState, inProgress)
      };
    });

    recommendations.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      if (a.available !== b.available) return a.available ? -1 : 1;
      return b.score - a.score || a.title.localeCompare(b.title);
    });

    recommendations.forEach((item, index) => {
      item.rank = index + 1;
      item.isTopRecommendation = index === 0 && !item.completed;
    });

    const remaining = recommendations.filter((item) => !item.completed);
    const ready = remaining.filter((item) => item.available);
    const completed = recommendations.length - remaining.length;

    return {
      recommendations,
      topRecommendation: ready[0] || remaining[0] || null,
      summary: buildSummary(recommendations.length, ready.length, completed),
      createdAt: new Date().toISOString()
    };
  }

  function calculateScore(intent, assessmentItem, planStep, completed, available, dependencyState) {
    let score = accessibilityPriority[intent.id] || accessibilityPriority[intent.workflowId] || 20;
    if (assessmentItem) score += assessmentItem.rating * 10;
    if (planStep) score += Math.max(0, 20 - planStep.order);
    if (available) score += 25;
    if (dependencyState === 'waiting') score -= 20;
    if (completed) score -= 250;
    return score;
  }

  function dependencyStatus(planStep, plan) {
    if (!planStep || !planStep.dependencies || !planStep.dependencies.length) return 'clear';
    const stepMap = new Map(((plan && plan.steps) || []).map((step) => [step.id, step]));
    return planStep.dependencies.every((id) => {
      const dependency = stepMap.get(id);
      return dependency && dependency.status === 'complete';
    }) ? 'clear' : 'waiting';
  }

  function isPresent(model, workflowId) {
    if (workflowId === 'create-transcript') return Boolean(model.accessibility.transcript.present);
    if (workflowId === 'create-captions') return Boolean(model.accessibility.captions.present);
    if (workflowId === 'audio-description') return Boolean(model.accessibility.audioDescription.present);
    return false;
  }

  function recommendationLevel(score, completed, available, inProgress, dependencyState) {
    if (completed) return 'Completed';
    if (inProgress) return 'In progress';
    if (!available || dependencyState === 'waiting') return 'Blocked';
    if (available) return 'Ready to execute';
    if (score >= 135) return 'Recommended first';
    if (score >= 90) return 'Recommended next';
    return 'Optional';
  }

  function buildReason(intent, assessmentItem, planStep, completed, available, dependencyState, inProgress) {
    if (completed) return 'This work is already recorded in Shared Knowledge, so it does not need to be started again.';
    if (inProgress) return 'This workflow is currently queued or running. Its result will update Shared Knowledge automatically.';
    if (!available) {
      return assessmentItem
        ? `${assessmentItem.reason} The required processing provider is not connected yet.`
        : 'This may be useful for the source, but the required processing provider is not connected yet.';
    }
    if (dependencyState === 'waiting') {
      return 'This action is available, but earlier analysis in the accessibility plan should be completed first so the result can reuse it.';
    }
    if (assessmentItem) return assessmentItem.reason;
    if (planStep) return `${planStep.purpose} This action is available now.`;
    return `${intent.description} This action is available now.`;
  }

  function buildSummary(total, ready, completed) {
    const remaining = total - completed;
    if (!remaining) return 'All currently recognized work is already recorded as complete.';
    const parts = [`${remaining} remaining recommendation${remaining === 1 ? '' : 's'}`];
    if (ready) parts.push(`${ready} available now`);
    if (completed) parts.push(`${completed} already complete`);
    return `${parts.join(', ')}.`;
  }

  window.RecommendationEngine = { build };
})();
