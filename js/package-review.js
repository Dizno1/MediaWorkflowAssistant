(function () {
  function build(model, source, inspection, accessibilityPlan) {
    const runtimeArtifacts = window.OutputManager
      .listForSource(source)
      .filter((artifact) => artifact.workflowId !== 'accessibility-package');
    const persistentArtifacts = Array.isArray(model.results)
      ? model.results.filter((artifact) => artifact.workflowId !== 'accessibility-package')
      : [];
    const runtimeIds = new Set(runtimeArtifacts.map((artifact) => artifact.id));
    const unavailableArtifacts = persistentArtifacts.filter((artifact) => !runtimeIds.has(artifact.id));
    const planSteps = accessibilityPlan && Array.isArray(accessibilityPlan.steps) ? accessibilityPlan.steps : [];
    const remainingGaps = planSteps.filter((step) => step.status !== 'complete');
    const sourceName = (source && (source.name || source.url)) || (inspection && inspection.name) || 'media-source';

    return {
      suggestedName: `${safeBaseName(sourceName)}-accessibility-package`,
      availableArtifacts: runtimeArtifacts.map((artifact) => ({
        id: artifact.id,
        name: artifact.name,
        type: artifact.type || 'Generated file',
        description: artifact.description || '',
        size: artifact.size,
        workflowId: artifact.workflowId,
        privacyNotice: privacyNotice(artifact)
      })),
      unavailableArtifacts: unavailableArtifacts.map((artifact) => ({
        id: artifact.id,
        name: artifact.name,
        type: artifact.type || 'Generated file'
      })),
      remainingGapCount: remainingGaps.length,
      historyCount: Array.isArray(model.history) ? model.history.length : 0,
      includesKnowledge: true,
      includesHistory: true,
      includesManifests: true
    };
  }

  function normalizeName(value, fallback) {
    const trimmed = String(value || '').trim().replace(/\.zip$/i, '');
    const safe = safeBaseName(trimmed || fallback || 'accessibility-package');
    return `${safe}.zip`;
  }

  function safeBaseName(value) {
    return String(value || 'media-source')
      .replace(/\.[^.]+$/, '')
      .replace(/[^a-z0-9._-]+/gi, '-')
      .replace(/^-+|-+$/g, '') || 'media-source';
  }

  function privacyNotice(artifact) {
    const text = `${artifact.name || ''} ${artifact.type || ''} ${artifact.description || ''}`.toLowerCase();
    if (/transcript|caption|description|ocr|text|information|manifest/.test(text)) {
      return 'This file may contain spoken words, names, identifying details, or other source-derived information.';
    }
    if (/audio|video|image/.test(text)) {
      return 'This file may reproduce personal, copyrighted, or sensitive media from the source.';
    }
    return '';
  }

  window.PackageReview = { build, normalizeName };
})();
