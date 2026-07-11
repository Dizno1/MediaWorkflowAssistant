(function () {
  const REVIEW_VERSION = 1;
  const categories = [
    ['content', 'Content alternatives'],
    ['captions', 'Captions and transcripts'],
    ['description', 'Audio description'],
    ['review', 'Human review'],
    ['delivery', 'Publication and delivery'],
    ['evidence', 'Evidence and traceability']
  ];

  let currentReport = null;

  function byId(id) { return document.getElementById(id); }
  function safe(value) { return String(value == null ? '' : value).replace(/[&<>"']/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[char])); }
  function now() { return new Date().toISOString(); }
  function uid() { return `advisor-${Date.now()}-${Math.random().toString(16).slice(2)}`; }
  function activeProject() { return window.ProjectWorkspace && window.ProjectWorkspace.getActive(); }
  function titleCase(value) { return String(value || '').replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()); }
  function workflowComplete(project, source, workflowId) {
    const recorded = (project.history || []).some((entry) => entry.sourceKey === source.sourceKey && entry.workflowId === workflowId && entry.status === 'completed');
    const knowledge = source.knowledge || {};
    const summarized = workflowId === 'create-transcript' ? knowledge.transcriptComplete
      : workflowId === 'create-captions' ? knowledge.captionsComplete
      : workflowId === 'audio-description' ? knowledge.audioDescriptionComplete
      : workflowId === 'accessibility-package' ? knowledge.packageComplete
      : workflowId === 'generate-alt-text' ? Boolean(knowledge.imageDescriptionComplete)
      : false;
    return Boolean(recorded || summarized);
  }

  function projectFingerprint(project) {
    if (!project) return '';
    const snapshot = {
      sources: (project.sources || []).map((source) => [source.sourceKey, source.updatedAt, source.knowledge]),
      history: (project.history || []).map((entry) => [entry.jobId, entry.status, entry.completedAt, entry.artifactNames]),
      reviews: (project.reviews || []).map((review) => [review.id, review.status, review.updatedAt, review.decisionNote]),
      publications: (project.publications || []).map((publication) => [publication.id, publication.createdAt, publication.filename])
    };
    return JSON.stringify(snapshot);
  }

  function addFinding(list, severity, category, title, detail, recommendation, sourceName) {
    list.push({ id: uid(), severity, category, title, detail, recommendation, sourceName: sourceName || '', status: 'open' });
  }

  function evaluate(project) {
    const findings = [];
    const strengths = [];
    const sources = Array.isArray(project && project.sources) ? project.sources : [];
    const reviews = Array.isArray(project && project.reviews) ? project.reviews : [];
    const history = Array.isArray(project && project.history) ? project.history : [];
    const publications = Array.isArray(project && project.publications) ? project.publications : [];

    if (!project) {
      addFinding(findings, 'critical', 'evidence', 'No active project', 'The advisor cannot review work until a project is selected.', 'Create or select a project, then run the review again.');
    } else if (!sources.length) {
      addFinding(findings, 'critical', 'evidence', 'No sources in the project', 'There is no media or document source to evaluate.', 'Add at least one source and complete the applicable accessibility workflows.');
    }

    sources.forEach((source) => {
      const type = String(source.mediaType || source.type || '').toLowerCase();
      const sourceReviews = reviews.filter((review) => review.sourceKey === source.sourceKey);
      const approved = sourceReviews.filter((review) => review.status === 'approved');
      const pending = sourceReviews.filter((review) => review.status === 'pending');
      const rejected = sourceReviews.filter((review) => review.status === 'rejected');

      if (type === 'video') {
        if (!workflowComplete(project, source, 'create-transcript')) addFinding(findings, 'critical', 'captions', 'Transcript missing', 'The video does not have a completed transcript record.', 'Create and review a transcript before publication.', source.name);
        else strengths.push(`${source.name}: a completed transcript is recorded.`);
        if (!workflowComplete(project, source, 'create-captions')) addFinding(findings, 'critical', 'captions', 'Captions missing', 'The video does not have completed captions.', 'Create, synchronize, and review captions.', source.name);
        else strengths.push(`${source.name}: completed captions are recorded.`);
        if (!workflowComplete(project, source, 'audio-description')) addFinding(findings, 'major', 'description', 'Audio description not complete', 'Important visual information may not be available to people who cannot see the video.', 'Create and review audio description, or document why it is not required.', source.name);
        else strengths.push(`${source.name}: completed audio description is recorded.`);
      } else if (type === 'audio') {
        if (!workflowComplete(project, source, 'create-transcript')) addFinding(findings, 'critical', 'captions', 'Transcript missing', 'The audio source does not have a completed text alternative.', 'Create and review a transcript.', source.name);
        else strengths.push(`${source.name}: a completed transcript is recorded.`);
      } else if (type === 'image') {
        if (!workflowComplete(project, source, 'generate-alt-text') && !(source.knowledge || {}).imageDescriptionComplete) addFinding(findings, 'critical', 'content', 'Image description missing', 'The image does not have a recorded text alternative.', 'Create and review a concise description that communicates the image purpose and important content.', source.name);
        else strengths.push(`${source.name}: an image description is recorded.`);
      }

      if (!workflowComplete(project, source, 'accessibility-package')) addFinding(findings, 'major', 'delivery', 'Accessibility package missing', 'Supporting accessibility files are not collected in a current package.', 'Create a fresh accessibility package after required work and approvals are complete.', source.name);
      else strengths.push(`${source.name}: an accessibility package is recorded.`);

      if (!sourceReviews.length) addFinding(findings, 'major', 'review', 'No human review record', 'Automated or generated accessibility work has no project-level approval record.', 'Assign a reviewer and record the review decision.', source.name);
      if (pending.length) addFinding(findings, 'major', 'review', 'Review still pending', `${pending.length} review ${pending.length === 1 ? 'record is' : 'records are'} awaiting a decision.`, 'Complete the review before publication.', source.name);
      if (rejected.length) addFinding(findings, 'critical', 'review', 'Revision requested', `${rejected.length} review ${rejected.length === 1 ? 'requires' : 'require'} revision.`, 'Resolve the reviewer comments and submit the work for approval again.', source.name);
      if (sourceReviews.length && approved.length === sourceReviews.length) strengths.push(`${source.name}: all recorded human reviews are approved.`);

      const knowledge = source.knowledge || {};
      if (!knowledge.resultCount) addFinding(findings, 'minor', 'evidence', 'No artifact evidence counted', 'The project snapshot does not record generated artifacts for this source.', 'Confirm that final files were generated and registered before delivery.', source.name);
    });

    if (project && !history.length) addFinding(findings, 'major', 'evidence', 'Workflow history is empty', 'There is no chronological evidence showing how the accessibility work was completed.', 'Run work through the application so completed steps and outputs are recorded.');
    else if (history.length) strengths.push(`${history.length} completed workflow ${history.length === 1 ? 'record is' : 'records are'} available for traceability.`);

    if (project && !publications.length) addFinding(findings, 'minor', 'delivery', 'No publication package has been created', 'The project has not yet produced a final delivery package.', 'After resolving blockers, validate publication readiness and create the publication package.');
    else if (publications.length) strengths.push('At least one publication package is recorded.');

    const severityWeights = { critical: 20, major: 10, minor: 4, advisory: 1 };
    const penalty = findings.reduce((total, finding) => total + severityWeights[finding.severity], 0);
    const score = Math.max(0, Math.min(100, 100 - penalty));
    const criticalCount = findings.filter((finding) => finding.severity === 'critical').length;
    const majorCount = findings.filter((finding) => finding.severity === 'major').length;
    const readiness = criticalCount ? 'not-ready' : majorCount ? 'needs-improvement' : score >= 90 ? 'ready' : 'ready-with-cautions';
    const summary = readiness === 'ready' ? 'The project is ready for final publication review.'
      : readiness === 'ready-with-cautions' ? 'The project is broadly ready, with cautions that should be reviewed.'
      : readiness === 'needs-improvement' ? 'The project needs improvement before publication.'
      : 'The project is not ready for publication.';

    return {
      id: uid(),
      schemaVersion: REVIEW_VERSION,
      projectId: project ? project.id : '',
      projectName: project ? project.name : '',
      reviewedAt: now(),
      projectUpdatedAt: project ? project.updatedAt : '',
      projectFingerprint: projectFingerprint(project),
      score,
      readiness,
      summary,
      counts: {
        critical: criticalCount,
        major: majorCount,
        minor: findings.filter((finding) => finding.severity === 'minor').length,
        advisory: findings.filter((finding) => finding.severity === 'advisory').length
      },
      findings,
      strengths,
      categoryScores: calculateCategoryScores(findings),
      acceptedForPublication: false,
      acceptedBy: '',
      acceptanceNote: '',
      acceptedAt: ''
    };
  }

  function calculateCategoryScores(findings) {
    const weights = { critical: 30, major: 15, minor: 6, advisory: 2 };
    return Object.fromEntries(categories.map(([id]) => {
      const deduction = findings.filter((finding) => finding.category === id).reduce((total, finding) => total + weights[finding.severity], 0);
      return [id, Math.max(0, 100 - deduction)];
    }));
  }

  function latestReview(project) {
    const reviews = project && project.accessibilityAdvisor && Array.isArray(project.accessibilityAdvisor.reviews) ? project.accessibilityAdvisor.reviews : [];
    return reviews.length ? reviews[reviews.length - 1] : null;
  }

  function isCurrent(project, report) {
    if (!project || !report) return false;
    return String(report.projectFingerprint || '') === projectFingerprint(project);
  }

  function saveReport(projectId, report) {
    return window.ProjectWorkspace.update(projectId, (project) => {
      project.accessibilityAdvisor = project.accessibilityAdvisor || { schemaVersion: REVIEW_VERSION, reviews: [] };
      project.accessibilityAdvisor.schemaVersion = REVIEW_VERSION;
      project.accessibilityAdvisor.reviews = Array.isArray(project.accessibilityAdvisor.reviews) ? project.accessibilityAdvisor.reviews : [];
      project.accessibilityAdvisor.reviews.push(report);
      project.accessibilityAdvisor.latestReviewId = report.id;
    });
  }

  function runReview() {
    const project = activeProject();
    const status = byId('accessibility-advisor-status');
    if (!project) {
      status.textContent = 'Select an active project before running the accessibility advisor.';
      return;
    }
    currentReport = evaluate(project);
    saveReport(project.id, currentReport);
    currentReport = latestReview(activeProject());
    render(activeProject(), currentReport, true);
    status.textContent = `Accessibility review complete. Score ${currentReport.score} out of 100. ${currentReport.summary}`;
    document.dispatchEvent(new CustomEvent('publication-pipeline-refresh'));
  }

  function acceptReview(event) {
    event.preventDefault();
    const project = activeProject();
    const report = latestReview(project);
    const status = byId('accessibility-advisor-status');
    if (!project || !report) { status.textContent = 'Run the accessibility review before recording a final decision.'; return; }
    if (report.counts.critical > 0) { status.textContent = 'Critical issues must be resolved before this review can be accepted for publication.'; return; }
    const data = new FormData(event.currentTarget);
    const reviewer = String(data.get('reviewer') || '').trim();
    const note = String(data.get('note') || '').trim();
    if (!reviewer) { status.textContent = 'Enter the reviewer name.'; byId('advisor-reviewer').focus(); return; }
    window.ProjectWorkspace.update(project.id, (updated) => {
      const latest = latestReview(updated);
      latest.acceptedForPublication = true;
      latest.acceptedBy = reviewer;
      latest.acceptanceNote = note;
      latest.acceptedAt = now();
      latest.projectUpdatedAt = updated.updatedAt;
      latest.projectFingerprint = projectFingerprint(updated);
    });
    currentReport = latestReview(activeProject());
    render(activeProject(), currentReport, false);
    status.textContent = 'Final accessibility advisor review accepted for publication.';
    document.dispatchEvent(new CustomEvent('publication-pipeline-refresh'));
  }

  function render(project, report, focusResults) {
    const section = byId('accessibility-advisor-section');
    const output = byId('accessibility-advisor-output');
    const runButton = byId('run-accessibility-advisor');
    const form = byId('advisor-acceptance-form');
    if (!section || !output) return;
    section.hidden = false;
    runButton.disabled = !project;
    if (!project) {
      output.innerHTML = '<p>Select a project to receive a consultant-style accessibility review.</p>';
      form.hidden = true;
      return;
    }
    const selected = report || latestReview(project);
    if (!selected) {
      output.innerHTML = `<p>No accessibility advisor review has been completed for ${safe(project.name)}.</p>`;
      form.hidden = true;
      return;
    }
    const stale = !isCurrent(project, selected);
    const categoryMarkup = categories.map(([id, label]) => `<div><dt>${safe(label)}</dt><dd>${safe(selected.categoryScores[id])} out of 100</dd></div>`).join('');
    const findingMarkup = selected.findings.length ? `<ol class="advisor-findings">${selected.findings.map((finding) => `<li class="advisor-finding severity-${safe(finding.severity)}"><h4>${safe(titleCase(finding.severity))}: ${safe(finding.title)}${finding.sourceName ? ` - ${safe(finding.sourceName)}` : ''}</h4><p>${safe(finding.detail)}</p><p><strong>Recommendation:</strong> ${safe(finding.recommendation)}</p></li>`).join('')}</ol>` : '<p>No accessibility issues were identified from the available project evidence.</p>';
    const strengthMarkup = selected.strengths.length ? `<ul>${selected.strengths.map((strength) => `<li>${safe(strength)}</li>`).join('')}</ul>` : '<p>No completed strengths were available to record.</p>';
    output.innerHTML = `<article class="advisor-report" aria-labelledby="advisor-report-heading" tabindex="-1">
      <h3 id="advisor-report-heading">Accessibility advisor report</h3>
      ${stale ? '<p class="advisor-stale"><strong>This review is out of date because the project changed. Run the advisor again before publication.</strong></p>' : ''}
      <p><strong>Accessibility-readiness score: ${safe(selected.score)} out of 100.</strong></p>
      <p><strong>Assessment: ${safe(titleCase(selected.readiness))}.</strong> ${safe(selected.summary)}</p>
      <p>${safe(selected.counts.critical)} critical, ${safe(selected.counts.major)} major, and ${safe(selected.counts.minor)} minor issue${selected.findings.length === 1 ? '' : 's'} identified.</p>
      <h4>Category scores</h4><dl class="analysis-metrics">${categoryMarkup}</dl>
      <h4>Issues and recommendations</h4>${findingMarkup}
      <h4>Recorded strengths</h4>${strengthMarkup}
      <p class="muted">Reviewed ${safe(new Date(selected.reviewedAt).toLocaleString())}. This advisor uses project evidence and does not replace testing by people with disabilities or a formal conformance audit.</p>
      ${selected.acceptedForPublication ? `<p><strong>Accepted for publication by ${safe(selected.acceptedBy)}</strong>${selected.acceptanceNote ? `: ${safe(selected.acceptanceNote)}` : ''}.</p>` : ''}
      <p><button type="button" id="download-advisor-report">Download advisor report</button></p>
    </article>`;
    form.hidden = stale || selected.acceptedForPublication || selected.counts.critical > 0;
    byId('advisor-acceptance-help').textContent = selected.counts.critical > 0 ? 'Resolve critical issues and run a new review before accepting the project.' : 'Record the person who completed the final accessibility review.';
    const downloadButton = byId('download-advisor-report');
    if (downloadButton) downloadButton.addEventListener('click', () => downloadReport(selected));
    if (focusResults) byId('advisor-report-heading').parentElement.focus();
  }

  function reportText(report) {
    const lines = [
      `Accessibility Advisor Report: ${report.projectName}`,
      `Reviewed: ${report.reviewedAt}`,
      `Score: ${report.score}/100`,
      `Assessment: ${titleCase(report.readiness)}`,
      '', report.summary, '', 'Issues and recommendations:'
    ];
    if (!report.findings.length) lines.push('- None identified from available evidence.');
    report.findings.forEach((finding) => lines.push(`- ${titleCase(finding.severity)}: ${finding.title}${finding.sourceName ? ` - ${finding.sourceName}` : ''}`, `  ${finding.detail}`, `  Recommendation: ${finding.recommendation}`));
    lines.push('', 'Recorded strengths:');
    if (!report.strengths.length) lines.push('- None recorded.');
    report.strengths.forEach((strength) => lines.push(`- ${strength}`));
    lines.push('', 'Category scores:');
    categories.forEach(([id, label]) => lines.push(`- ${label}: ${report.categoryScores[id]}/100`));
    lines.push('', `Accepted for publication: ${report.acceptedForPublication ? 'Yes' : 'No'}`);
    if (report.acceptedForPublication) lines.push(`Accepted by: ${report.acceptedBy}`, `Acceptance note: ${report.acceptanceNote || 'None'}`, `Accepted: ${report.acceptedAt}`);
    lines.push('', 'This report uses available project evidence and does not replace user testing or a formal conformance audit.', '');
    return lines.join('\n');
  }

  function downloadReport(report) {
    const blob = new Blob([reportText(report)], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${String(report.projectName || 'project').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'project'}-accessibility-advisor-report.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    byId('accessibility-advisor-status').textContent = 'Accessibility advisor report download prepared.';
  }

  function refresh() {
    const project = activeProject();
    currentReport = latestReview(project);
    render(project, currentReport, false);
  }

  function publicationStatus(project) {
    const report = latestReview(project);
    if (!report) return { ready: false, reason: 'Complete the Accessibility Advisor review before publication.', report: null };
    if (!isCurrent(project, report)) return { ready: false, reason: 'The Accessibility Advisor review is out of date. Run it again after the latest project changes.', report };
    if (report.counts.critical > 0) return { ready: false, reason: 'The Accessibility Advisor found critical issues that must be resolved.', report };
    if (!report.acceptedForPublication) return { ready: false, reason: 'Record final acceptance of the Accessibility Advisor review before publication.', report };
    return { ready: true, reason: `Accessibility Advisor review accepted with a score of ${report.score} out of 100.`, report };
  }

  function initialize() {
    const button = byId('run-accessibility-advisor');
    const form = byId('advisor-acceptance-form');
    if (!button || !form) return;
    button.addEventListener('click', runReview);
    form.addEventListener('submit', acceptReview);
    document.addEventListener('change', (event) => { if (event.target && event.target.id === 'project-select') window.setTimeout(refresh, 0); });
    document.addEventListener('accessibility-advisor-refresh', refresh);
    refresh();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize);
  else initialize();

  window.AccessibilityAdvisor = { evaluate, latestReview, isCurrent, publicationStatus, refresh, reportText };
})();
