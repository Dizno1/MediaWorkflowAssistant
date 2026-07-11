(function () {
  const priority = {
    'create-transcript': 100,
    'create-captions': 90,
    'audio-description': 80,
    'accessibility-package': 60
  };

  function analyze(project) {
    const sources = project && Array.isArray(project.sources) ? project.sources : [];
    const history = project && Array.isArray(project.history) ? project.history : [];
    const recommendations = [];
    const sourceReports = sources.map((source) => analyzeSource(source, history, recommendations));

    recommendations.sort((a, b) => b.score - a.score || a.sourceName.localeCompare(b.sourceName));
    recommendations.forEach((item, index) => { item.rank = index + 1; });

    const completedCount = sourceReports.reduce((total, report) => total + report.completedCount, 0);
    const requiredCount = sourceReports.reduce((total, report) => total + report.requiredCount, 0);
    const percentComplete = requiredCount ? Math.round((completedCount / requiredCount) * 100) : 0;
    const stalePackages = sourceReports.filter((report) => report.packageState === 'stale').length;

    return {
      sourceReports,
      recommendations,
      percentComplete,
      stalePackages,
      status: projectStatus(project, sourceReports),
      summary: summaryText(sources.length, recommendations.length, percentComplete, stalePackages),
      createdAt: new Date().toISOString()
    };
  }

  function analyzeSource(source, history, recommendations) {
    const knowledge = source.knowledge || {};
    const requirements = requiredWork(source);
    const states = {};

    requirements.forEach((workflowId) => {
      states[workflowId] = workflowState(workflowId, source, knowledge, history);
      if (states[workflowId] !== 'complete') {
        recommendations.push(makeRecommendation(workflowId, source, states[workflowId], requirements, states));
      }
    });

    const completedCount = requirements.filter((workflowId) => states[workflowId] === 'complete').length;
    return {
      sourceKey: source.sourceKey,
      sourceName: source.name,
      mediaType: source.mediaType || source.type || 'source',
      requiredCount: requirements.length,
      completedCount,
      percentComplete: requirements.length ? Math.round((completedCount / requirements.length) * 100) : 0,
      states,
      packageState: states['accessibility-package'] || 'not-required'
    };
  }

  function requiredWork(source) {
    const mediaType = String(source.mediaType || '').toLowerCase();
    const work = [];
    if (mediaType === 'video' || mediaType === 'audio') work.push('create-transcript', 'create-captions');
    if (mediaType === 'video') work.push('audio-description');
    work.push('accessibility-package');
    return work;
  }

  function workflowState(workflowId, source, knowledge, history) {
    if (Number(knowledge.activeJobCount || 0) > 0 && latestEntry(history, source.sourceKey, workflowId, ['queued', 'running'])) return 'in-progress';
    if (workflowId === 'create-transcript') return knowledge.transcriptComplete ? 'complete' : 'missing';
    if (workflowId === 'create-captions') return knowledge.captionsComplete ? 'complete' : 'missing';
    if (workflowId === 'audio-description') return knowledge.audioDescriptionComplete ? 'complete' : 'missing';
    if (workflowId === 'accessibility-package') return packageState(source, knowledge, history);
    return 'missing';
  }

  function packageState(source, knowledge, history) {
    if (!knowledge.packageComplete) return 'missing';
    const packageEntry = latestEntry(history, source.sourceKey, 'accessibility-package', ['completed']);
    if (!packageEntry) return 'complete';
    const packageTime = dateValue(packageEntry.completedAt);
    const laterUpstream = history.some((entry) => entry.sourceKey === source.sourceKey && entry.status === 'completed' && entry.workflowId !== 'accessibility-package' && dateValue(entry.completedAt) > packageTime);
    return laterUpstream ? 'stale' : 'complete';
  }

  function latestEntry(history, sourceKey, workflowId, statuses) {
    return history
      .filter((entry) => entry.sourceKey === sourceKey && entry.workflowId === workflowId && statuses.includes(entry.status))
      .sort((a, b) => dateValue(b.completedAt || b.createdAt) - dateValue(a.completedAt || a.createdAt))[0] || null;
  }

  function makeRecommendation(workflowId, source, state, requirements, knownStates) {
    const dependency = dependencyFor(workflowId);
    const blocked = dependency && requirements.includes(dependency) && knownStates[dependency] !== 'complete';
    const effectiveState = state === 'in-progress' ? 'in-progress' : blocked ? 'blocked' : state === 'stale' ? 'ready' : 'ready';
    const title = workflowTitle(workflowId);
    return {
      workflowId,
      sourceKey: source.sourceKey,
      sourceName: source.name,
      title,
      state: effectiveState,
      issue: state,
      score: (priority[workflowId] || 20) - (blocked ? 35 : 0) + (state === 'stale' ? 25 : 0),
      reason: recommendationReason(title, source.name, state, blocked, dependency)
    };
  }

  function dependencyFor(workflowId) {
    if (workflowId === 'create-captions') return 'create-transcript';
    return null;
  }

  function workflowTitle(workflowId) {
    return ({
      'create-transcript': 'Create transcript',
      'create-captions': 'Create captions',
      'audio-description': 'Create audio description',
      'accessibility-package': 'Create accessibility package'
    })[workflowId] || workflowId;
  }

  function recommendationReason(title, sourceName, state, blocked, dependency) {
    if (state === 'in-progress') return `${title} is already in progress for ${sourceName}.`;
    if (state === 'stale') return `The accessibility package for ${sourceName} is out of date because newer upstream work was completed. Regenerate it before publishing.`;
    if (blocked) return `${title} for ${sourceName} should wait until ${workflowTitle(dependency).toLowerCase()} is complete so existing work can be reused.`;
    return `${title} is missing for ${sourceName} and is ready to be completed.`;
  }

  function projectStatus(project, reports) {
    if (project && project.archived) return 'Archived';
    if (!reports.length) return 'Incomplete';
    if (reports.some((report) => Object.values(report.states).includes('in-progress'))) return 'In Progress';
    if (reports.every((report) => report.percentComplete === 100)) return 'Ready to Publish';
    if (reports.some((report) => report.completedCount > 0)) return 'Review Required';
    return 'Incomplete';
  }

  function summaryText(sourceCount, recommendationCount, percentComplete, stalePackages) {
    if (!sourceCount) return 'Add a source to receive project-wide accessibility guidance.';
    if (!recommendationCount) return `Project accessibility work is 100% complete across ${sourceCount} source${sourceCount === 1 ? '' : 's'}.`;
    const stale = stalePackages ? ` ${stalePackages} accessibility package${stalePackages === 1 ? ' is' : 's are'} out of date.` : '';
    return `Project accessibility work is ${percentComplete}% complete. ${recommendationCount} next action${recommendationCount === 1 ? '' : 's'} remain.${stale}`;
  }

  function dateValue(value) {
    const parsed = Date.parse(value || '');
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  window.ProjectAccessibilityIntelligence = { analyze };
})();
