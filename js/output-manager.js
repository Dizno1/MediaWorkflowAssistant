(function () {
  const runtimeArtifacts = new Map();

  function register(job, outputs) {
    const createdAt = new Date().toISOString();
    return (outputs || []).map((output, index) => {
      const artifact = {
        id: `${job.id}-artifact-${index + 1}`,
        name: output.name,
        type: output.type || 'File',
        mimeType: output.mimeType || '',
        description: output.description || '',
        providerId: output.providerId || (job.provider ? job.provider.id : ''),
        workflowId: job.workflow.id,
        sourceKey: window.SharedKnowledge.sourceKey(job.knowledgeModel.source),
        sourceName: job.sourceFileName,
        createdAt,
        size: Number.isFinite(output.size) ? output.size : null,
        durationSeconds: Number.isFinite(output.durationSeconds) ? output.durationSeconds : null,
        status: 'Ready',
        url: output.url || '',
        content: output.content || ''
      };
      runtimeArtifacts.set(artifact.id, artifact);
      return artifact;
    });
  }

  function get(id) {
    return runtimeArtifacts.get(id) || null;
  }

  function listAll() {
    return Array.from(runtimeArtifacts.values());
  }

  // Re-registers artifacts restored from persisted Shared Knowledge (a prior session's saved
  // work) into the same runtime store real-time job output uses, so a restored source's captions/
  // transcript/AD-script are actually usable this session — not just recorded as "present" in a
  // status flag while nothing exists for validation or rendering to find.
  function restore(source, artifacts) {
    const key = window.SharedKnowledge.sourceKey(source);
    (artifacts || []).forEach((artifact, index) => {
      if (!artifact || !artifact.content) return; // only text-based artifacts can be restored this way
      const id = artifact.id || `restored-${key}-${artifact.workflowId || 'artifact'}-${index}`;
      if (runtimeArtifacts.has(id)) return;
      runtimeArtifacts.set(id, { ...artifact, id, sourceKey: key, status: 'Ready', url: '' });
    });
  }

  function listForSource(source) {
    const key = window.SharedKnowledge.sourceKey(source);
    return Array.from(runtimeArtifacts.values()).filter((artifact) => artifact.sourceKey === key);
  }

  function revokeForSource(source) {
    listForSource(source).forEach((artifact) => {
      if (artifact.url) URL.revokeObjectURL(artifact.url);
      runtimeArtifacts.delete(artifact.id);
    });
  }

  window.OutputManager = { register, get, listAll, listForSource, revokeForSource, restore };
})();
