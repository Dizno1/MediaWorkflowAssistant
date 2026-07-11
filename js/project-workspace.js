(function () {
  const storageKey = 'media-workflow-assistant-projects:v1';
  const activeKey = 'media-workflow-assistant-active-project:v1';

  function readProjects() {
    try {
      const value = JSON.parse(window.localStorage.getItem(storageKey) || '[]');
      return Array.isArray(value) ? value : [];
    } catch (error) {
      return [];
    }
  }

  function writeProjects(projects) {
    window.localStorage.setItem(storageKey, JSON.stringify(projects));
    return projects;
  }

  function uid() {
    return `project-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function normalizeName(name) {
    return String(name || '').trim().replace(/\s+/g, ' ');
  }

  function list() {
    return readProjects().sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  }

  function get(projectId) {
    return readProjects().find((project) => project.id === projectId) || null;
  }

  function getActive() {
    const activeId = window.localStorage.getItem(activeKey) || '';
    return get(activeId);
  }

  function select(projectId) {
    if (projectId && !get(projectId)) throw new Error('That project is no longer available.');
    if (projectId) window.localStorage.setItem(activeKey, projectId);
    else window.localStorage.removeItem(activeKey);
    return getActive();
  }

  function create(name) {
    const projectName = normalizeName(name);
    if (!projectName) throw new Error('Enter a project name.');
    const projects = readProjects();
    const createdAt = new Date().toISOString();
    const project = {
      id: uid(),
      name: projectName,
      status: 'Incomplete',
      archived: false,
      createdAt,
      updatedAt: createdAt,
      sources: [],
      history: []
    };
    projects.push(project);
    writeProjects(projects);
    select(project.id);
    return project;
  }

  function rename(projectId, name) {
    const projectName = normalizeName(name);
    if (!projectName) throw new Error('Enter a project name.');
    return update(projectId, (project) => { project.name = projectName; });
  }

  function setArchived(projectId, archived) {
    return update(projectId, (project) => {
      project.archived = Boolean(archived);
      project.status = project.archived ? 'Archived' : calculateStatus(project);
    });
  }

  function remove(projectId) {
    writeProjects(readProjects().filter((project) => project.id !== projectId));
    if ((window.localStorage.getItem(activeKey) || '') === projectId) select('');
  }

  function update(projectId, updater) {
    const projects = readProjects();
    const index = projects.findIndex((project) => project.id === projectId);
    if (index < 0) throw new Error('That project is no longer available.');
    updater(projects[index]);
    projects[index].updatedAt = new Date().toISOString();
    if (!projects[index].archived) projects[index].status = calculateStatus(projects[index]);
    writeProjects(projects);
    return projects[index];
  }

  function summarizeKnowledge(model) {
    const accessibility = model && model.accessibility ? model.accessibility : {};
    const history = model && Array.isArray(model.history) ? model.history : [];
    const results = model && Array.isArray(model.results) ? model.results : [];
    const activeJobs = model && Array.isArray(model.activeJobs) ? model.activeJobs : [];
    const completed = model && model.analysis && Array.isArray(model.analysis.completed) ? model.analysis.completed : [];
    return {
      captionsComplete: Boolean(accessibility.captions && accessibility.captions.present),
      transcriptComplete: Boolean(accessibility.transcript && accessibility.transcript.present),
      audioDescriptionComplete: Boolean(accessibility.audioDescription && accessibility.audioDescription.present),
      packageComplete: completed.includes('accessibility-package'),
      resultCount: results.length,
      workflowCount: history.filter((entry) => entry.status === 'completed').length,
      activeJobCount: activeJobs.length,
      updatedAt: model && model.updatedAt ? model.updatedAt : new Date().toISOString()
    };
  }

  function addOrUpdateSource(projectId, source, model) {
    if (!projectId || !source || !model) return null;
    const sourceKey = window.SharedKnowledge.sourceKey(model.source || source);
    return update(projectId, (project) => {
      project.sources = Array.isArray(project.sources) ? project.sources : [];
      const existing = project.sources.find((entry) => entry.sourceKey === sourceKey);
      const snapshot = {
        sourceKey,
        name: model.source.name || source.name || 'Unnamed source',
        type: model.source.type || source.type || 'file',
        mediaType: model.source.mediaType || '',
        mimeType: model.source.mimeType || '',
        durationSeconds: model.source.durationSeconds || 0,
        knowledge: summarizeKnowledge(model),
        addedAt: existing ? existing.addedAt : new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      if (existing) Object.assign(existing, snapshot);
      else project.sources.push(snapshot);
    });
  }

  function recordWorkflow(projectId, source, job, model) {
    if (!projectId || !job) return null;
    const sourceKey = window.SharedKnowledge.sourceKey((model && model.source) || source || {});
    const project = addOrUpdateSource(projectId, source, model);
    return update(project.id, (current) => {
      current.history = Array.isArray(current.history) ? current.history : [];
      if (!current.history.some((entry) => entry.jobId === job.id)) {
        current.history.push({
          jobId: job.id,
          workflowId: job.workflow.id,
          title: job.intent.title,
          status: job.status,
          sourceKey,
          sourceName: job.sourceFileName,
          completedAt: job.completedAt ? job.completedAt.toISOString() : new Date().toISOString(),
          artifactNames: (job.outputs || []).map((output) => output.name)
        });
      }
    });
  }

  function calculateStatus(project) {
    const sources = Array.isArray(project.sources) ? project.sources : [];
    if (!sources.length) return 'Incomplete';
    if (sources.some((source) => source.knowledge && source.knowledge.activeJobCount > 0)) return 'In Progress';
    const allReady = sources.every((source) => {
      const knowledge = source.knowledge || {};
      return knowledge.transcriptComplete && knowledge.captionsComplete && knowledge.audioDescriptionComplete && knowledge.packageComplete;
    });
    if (allReady) return 'Ready to Publish';
    const hasReviewableWork = sources.some((source) => {
      const knowledge = source.knowledge || {};
      return knowledge.transcriptComplete || knowledge.captionsComplete || knowledge.audioDescriptionComplete;
    });
    return hasReviewableWork ? 'Review Required' : 'Incomplete';
  }

  function summary(project) {
    const sources = project && Array.isArray(project.sources) ? project.sources : [];
    const history = project && Array.isArray(project.history) ? project.history : [];
    return {
      sourceCount: sources.length,
      artifactCount: sources.reduce((total, source) => total + Number((source.knowledge || {}).resultCount || 0), 0),
      workflowCount: history.filter((entry) => entry.status === 'completed').length,
      status: project ? (project.archived ? 'Archived' : calculateStatus(project)) : 'No active project'
    };
  }

  window.ProjectWorkspace = {
    list, get, getActive, select, create, rename, setArchived, remove,
    addOrUpdateSource, recordWorkflow, summary
  };
})();
