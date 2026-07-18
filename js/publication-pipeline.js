(function () {
  const profiles = [
    {
      id: 'web-standard',
      name: 'Accessible web publication',
      description: 'Creates a web-ready package with accessible media, captions, supporting documents, a manifest, and a playback verification checklist.',
      requiredForVideo: ['create-transcript', 'create-captions', 'audio-description', 'accessibility-package'],
      requiredForAudio: ['create-transcript', 'accessibility-package'],
      requiredForImage: ['generate-alt-text', 'accessibility-package'],
      requiredForDocument: ['accessibility-package']
    },
    {
      id: 'learning-platform',
      name: 'Learning platform delivery',
      description: 'Creates a structured package for upload to a course or learning platform, including accessibility records and plain-language deployment instructions.',
      requiredForVideo: ['create-transcript', 'create-captions', 'audio-description', 'accessibility-package'],
      requiredForAudio: ['create-transcript', 'accessibility-package'],
      requiredForImage: ['generate-alt-text', 'accessibility-package'],
      requiredForDocument: ['accessibility-package']
    },
    {
      id: 'archive-master',
      name: 'Accessible archive master',
      description: 'Creates a preservation-oriented package with source records, approved accessibility assets, workflow history, reviews, and checksums.',
      requiredForVideo: ['create-transcript', 'create-captions', 'audio-description', 'accessibility-package'],
      requiredForAudio: ['create-transcript', 'accessibility-package'],
      requiredForImage: ['generate-alt-text', 'accessibility-package'],
      requiredForDocument: ['accessibility-package']
    }
  ];

  const targets = [
    { id: 'download', name: 'Download to this device', description: 'Creates one ZIP file for local download. No information leaves this browser.' },
    { id: 'web-host', name: 'Web hosting handoff', description: 'Adds deployment instructions and a web publication inventory for a website administrator.' },
    { id: 'learning-platform', name: 'Learning platform handoff', description: 'Adds upload instructions and an accessibility inventory for a learning platform administrator.' },
    { id: 'records-archive', name: 'Records archive', description: 'Adds a preservation manifest, review history, and SHA-256 checksums when supported by the browser.' }
  ];

  let lastValidation = null;

  function byId(id) { return document.getElementById(id); }
  function activeProject() { return window.ProjectWorkspace && window.ProjectWorkspace.getActive(); }
  function safe(value) { return String(value || '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char])); }
  function slug(value) { return String(value || 'publication').trim().replace(/[^a-z0-9._-]+/gi, '-').replace(/^-+|-+$/g, '') || 'publication'; }
  function profile() { return profiles.find((item) => item.id === byId('publication-profile').value) || profiles[0]; }
  function target() { return targets.find((item) => item.id === byId('publication-target').value) || targets[0]; }

  function initialize() {
    const form = byId('publication-pipeline-form');
    if (!form || !window.ProjectWorkspace || !window.ZipBuilder) return;
    byId('publication-profile').innerHTML = profiles.map((item) => `<option value="${safe(item.id)}">${safe(item.name)}</option>`).join('');
    byId('publication-target').innerHTML = targets.map((item) => `<option value="${safe(item.id)}">${safe(item.name)}</option>`).join('');
    byId('publication-profile').addEventListener('change', updateHelp);
    byId('publication-target').addEventListener('change', updateHelp);
    byId('validate-publication').addEventListener('click', validateAndRender);
    form.addEventListener('submit', createPackage);
    document.addEventListener('change', (event) => { if (event.target && event.target.id === 'project-select') window.setTimeout(refresh, 0); });
    document.addEventListener('publication-pipeline-refresh', refresh);
    updateHelp();
    refresh();
  }

  function updateHelp() {
    byId('publication-profile-help').textContent = profile().description;
    byId('publication-target-help').textContent = target().description;
  }

  function refresh() {
    const project = activeProject();
    const title = byId('publication-title');
    const button = byId('create-publication-package');
    const validateButton = byId('validate-publication');
    button.disabled = !project;
    validateButton.disabled = !project;
    if (project && (!title.value || title.dataset.projectId !== project.id)) {
      title.value = project.name;
      title.dataset.projectId = project.id;
    }
    byId('publication-pipeline-status').textContent = project ? `Publication controls are ready for ${project.name}. Validate readiness before export.` : 'Select an active project to begin.';
    byId('publication-validation-results').innerHTML = '';
    byId('publication-deliverables').innerHTML = '';
    lastValidation = null;
  }

  function requiredWork(source, selectedProfile) {
    const type = String(source.mediaType || '').toLowerCase();
    if (type === 'video') return selectedProfile.requiredForVideo;
    if (type === 'audio') return selectedProfile.requiredForAudio;
    if (type === 'image') return selectedProfile.requiredForImage;
    return selectedProfile.requiredForDocument;
  }

  function completedWork(project, sourceKey) {
    return new Set((project.history || []).filter((entry) => entry.sourceKey === sourceKey && entry.status === 'completed').map((entry) => entry.workflowId));
  }

  function validateProject(project, selectedProfile) {
    const blockers = [];
    const warnings = [];
    const passed = [];
    const sources = Array.isArray(project.sources) ? project.sources : [];
    const reviews = Array.isArray(project.reviews) ? project.reviews : [];
    if (!sources.length) blockers.push('The project does not contain any sources.');
    sources.forEach((source) => {
      const completed = completedWork(project, source.sourceKey);
      requiredWork(source, selectedProfile).forEach((workflowId) => {
        if (!completed.has(workflowId) && !knowledgeIndicates(source, workflowId)) blockers.push(`${source.name}: ${workflowName(workflowId)} is not complete.`);
      });
      const sourceReviews = reviews.filter((review) => review.sourceKey === source.sourceKey);
      if (sourceReviews.some((review) => review.status === 'rejected')) blockers.push(`${source.name}: at least one human review requires revision.`);
      if (sourceReviews.some((review) => review.status === 'pending')) blockers.push(`${source.name}: completed accessibility work is awaiting human approval.`);
      if (!sourceReviews.length) warnings.push(`${source.name}: no project-level human review records were found.`);
      else if (sourceReviews.every((review) => review.status === 'approved')) passed.push(`${source.name}: all recorded human reviews are approved.`);
    });
    if (sources.length) passed.push(`${sources.length} source${sources.length === 1 ? '' : 's'} included in the publication inventory.`);
    if ((project.history || []).length) passed.push('Workflow history is available for the publication record.');
    else warnings.push('No workflow history is available.');
    if (window.AccessibilityAdvisor) {
      const advisor = window.AccessibilityAdvisor.publicationStatus(project);
      if (!advisor.ready) blockers.push(advisor.reason);
      else passed.push(advisor.reason);
    } else {
      blockers.push('The Accessibility Advisor is unavailable.');
    }
    const score = Math.max(0, Math.min(100, 100 - blockers.length * 18 - warnings.length * 4));
    return { ready: blockers.length === 0, score, blockers, warnings, passed, checkedAt: new Date().toISOString(), profileId: selectedProfile.id };
  }

  function knowledgeIndicates(source, workflowId) {
    const k = source.knowledge || {};
    return workflowId === 'create-transcript' ? k.transcriptComplete : workflowId === 'create-captions' ? k.captionsComplete : workflowId === 'audio-description' ? k.audioDescriptionComplete : workflowId === 'accessibility-package' ? k.packageComplete : false;
  }

  function workflowName(id) {
    return ({'create-transcript':'Transcript','create-captions':'Captions','audio-description':'Audio description','generate-alt-text':'Image description','accessibility-package':'Accessibility package'})[id] || id;
  }

  function validateAndRender() {
    const project = activeProject();
    if (!project) return;
    lastValidation = validateProject(project, profile());
    renderValidation(lastValidation);
  }

  function renderValidation(result) {
    const heading = result.ready ? 'Ready for publication export' : 'Publication blockers found';
    const lists = [
      result.blockers.length ? `<h4>Blocking issues</h4><ul>${result.blockers.map((item) => `<li>${safe(item)}</li>`).join('')}</ul>` : '',
      result.warnings.length ? `<h4>Warnings</h4><ul>${result.warnings.map((item) => `<li>${safe(item)}</li>`).join('')}</ul>` : '',
      result.passed.length ? `<h4>Checks passed</h4><ul>${result.passed.map((item) => `<li>${safe(item)}</li>`).join('')}</ul>` : ''
    ].join('');
    const output = byId('publication-validation-results');
    output.innerHTML = `<section class="publication-validation ${result.ready ? 'is-ready' : 'has-blockers'}" aria-labelledby="publication-validation-heading"><h3 id="publication-validation-heading">${heading}</h3><p><strong>Readiness score: ${result.score} out of 100.</strong></p>${lists}</section>`;
    byId('publication-pipeline-status').textContent = result.ready ? 'Validation passed. The publication package can be created.' : `${result.blockers.length} blocking issue${result.blockers.length === 1 ? '' : 's'} must be resolved before final publication.`;
    output.focus();
  }

  async function createPackage(event) {
    event.preventDefault();
    const project = activeProject();
    if (!project) return;
    const selectedProfile = profile();
    const selectedTarget = target();
    lastValidation = validateProject(project, selectedProfile);
    renderValidation(lastValidation);
    const status = byId('publication-pipeline-status');
    if (!lastValidation.ready) {
      status.textContent = 'The package was not created because required publication checks did not pass.';
      return;
    }
    const button = byId('create-publication-package');
    button.disabled = true;
    status.textContent = 'Building the publication package.';
    try {
      const title = byId('publication-title').value.trim() || project.name;
      const files = await packageFiles(project, title, selectedProfile, selectedTarget, lastValidation);
      const bytes = window.ZipBuilder.create(files);
      const blob = new Blob([bytes], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);
      const filename = `${slug(title)}-${selectedProfile.id}.zip`;
      const deliverables = byId('publication-deliverables');
      deliverables.innerHTML = `<section aria-labelledby="publication-deliverables-heading"><h3 id="publication-deliverables-heading">Publication deliverable</h3><p><a class="button-link" href="${url}" download="${safe(filename)}">Download ${safe(filename)}</a></p><p>The package contains the project manifest, validation report, source inventory, workflow and review records, delivery instructions, available runtime artifacts, and checksums.</p></section>`;
      status.textContent = `${filename} is ready for download.`;
      await recordPublication(project, filename, selectedProfile, selectedTarget, lastValidation);
    } catch (error) {
      status.textContent = error.message || 'The publication package could not be created.';
    } finally {
      button.disabled = false;
    }
  }

  async function packageFiles(project, title, selectedProfile, selectedTarget, validation) {
    const runtimeArtifacts = window.OutputManager.listAll ? window.OutputManager.listAll() : [];
    const artifactRecords = runtimeArtifacts.map((item) => ({ id:item.id,name:item.name,type:item.type,mimeType:item.mimeType,sourceName:item.sourceName,workflowId:item.workflowId,createdAt:item.createdAt,size:item.size }));
    const manifest = {
      schemaVersion: 1,
      createdAt: new Date().toISOString(),
      title,
      project: { id: project.id, name: project.name, status: project.status, createdAt: project.createdAt, updatedAt: project.updatedAt },
      exportProfile: selectedProfile,
      deliveryTarget: selectedTarget,
      validation,
      sources: project.sources || [],
      workflows: project.history || [],
      reviews: project.reviews || [],
      accessibilityAdvisor: project.accessibilityAdvisor || null,
      runtimeArtifacts: artifactRecords
    };
    const files = [
      textFile('publication-manifest.json', JSON.stringify(manifest, null, 2)),
      textFile('publication-validation.txt', validationText(title, validation)),
      textFile('source-inventory.txt', sourceInventory(project)),
      textFile('workflow-history.json', JSON.stringify(project.history || [], null, 2)),
      textFile('human-review-records.json', JSON.stringify(project.reviews || [], null, 2)),
      textFile('accessibility-advisor-report.json', JSON.stringify(project.accessibilityAdvisor || {}, null, 2)),
      textFile('accessibility-advisor-report.txt', advisorText(project)),
      textFile('DELIVERY-INSTRUCTIONS.txt', deliveryInstructions(title, selectedProfile, selectedTarget))
    ];
    for (const artifact of runtimeArtifacts) {
      const data = await artifactBytes(artifact);
      if (data) files.push({ name: `artifacts/${slug(artifact.name)}`, data });
    }
    const checksums = await checksumList(files);
    files.push(textFile('SHA256SUMS.txt', checksums));
    return files;
  }

  function textFile(name, text) { return { name, data: new TextEncoder().encode(String(text || '')) }; }
  async function artifactBytes(artifact) {
    if (artifact.content) return new TextEncoder().encode(artifact.content);
    if (!artifact.url) return null;
    try { return new Uint8Array(await (await fetch(artifact.url)).arrayBuffer()); } catch (error) { return null; }
  }
  async function checksumList(files) {
    if (!window.crypto || !window.crypto.subtle) return 'Checksums unavailable in this browser context.\n';
    const lines = [];
    for (const file of files) {
      const bytes = file.data instanceof Uint8Array ? file.data : new Uint8Array(file.data);
      const hash = await window.crypto.subtle.digest('SHA-256', bytes);
      lines.push(`${Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('')}  ${file.name}`);
    }
    return `${lines.join('\n')}\n`;
  }
  function validationText(title, result) {
    return [`Publication validation: ${title}`, `Checked: ${result.checkedAt}`, `Score: ${result.score}/100`, `Status: ${result.ready ? 'Ready' : 'Blocked'}`, '', 'Blocking issues:', ...(result.blockers.length ? result.blockers.map((x) => `- ${x}`) : ['- None']), '', 'Warnings:', ...(result.warnings.length ? result.warnings.map((x) => `- ${x}`) : ['- None']), '', 'Checks passed:', ...result.passed.map((x) => `- ${x}`), ''].join('\n');
  }
  function sourceInventory(project) {
    const lines = [`Project: ${project.name}`, ''];
    (project.sources || []).forEach((source, index) => { lines.push(`${index + 1}. ${source.name}`, `   Media type: ${source.mediaType || 'unknown'}`, `   Source key: ${source.sourceKey}`, `   Updated: ${source.updatedAt || ''}`, ''); });
    return lines.join('\n');
  }

  function advisorText(project) {
    const report = window.AccessibilityAdvisor && window.AccessibilityAdvisor.latestReview(project);
    return report ? window.AccessibilityAdvisor.reportText(report) : 'No Accessibility Advisor report was available.\n';
  }

  function deliveryInstructions(title, selectedProfile, selectedTarget) {
    return [`Publication: ${title}`, `Export profile: ${selectedProfile.name}`, `Delivery target: ${selectedTarget.name}`, '', selectedTarget.description, '', 'Before release:', '1. Review publication-validation.txt.', '2. Confirm every human approval record is current.', '3. Play all media from beginning to end.', '4. Turn captions on and verify synchronization and reading speed.', '5. Confirm audio description does not cover essential dialogue or sound.', '6. Verify filenames, language labels, and public-facing titles.', '7. Retain publication-manifest.json and SHA256SUMS.txt with the delivered package.', ''].join('\n');
  }
  async function recordPublication(project, filename, selectedProfile, selectedTarget, validation) {
    window.ProjectWorkspace.update(project.id, (current) => {
      current.publications = Array.isArray(current.publications) ? current.publications : [];
      current.publications.push({ id:`publication-${Date.now()}`, filename, profileId:selectedProfile.id, targetId:selectedTarget.id, score:validation.score, createdAt:new Date().toISOString() });
    });
    document.dispatchEvent(new CustomEvent('publication-pipeline-created', { detail: { filename } }));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize);
  else initialize();
  window.PublicationPipeline = { profiles, targets, validateProject };
})();
