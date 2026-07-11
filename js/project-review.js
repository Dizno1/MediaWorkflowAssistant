(function () {
  const reviewableWorkflows = {
    'create-transcript': 'Transcript',
    'create-captions': 'Captions',
    'audio-description': 'Audio description',
    'accessibility-package': 'Accessibility package'
  };

  function uid() {
    return `review-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function ensureForWorkflow(projectId, job) {
    if (!projectId || !job || job.status !== 'completed' || !reviewableWorkflows[job.workflow.id]) return null;
    return window.ProjectWorkspace.update(projectId, (project) => {
      project.reviews = Array.isArray(project.reviews) ? project.reviews : [];
      const existing = project.reviews.find((review) => review.jobId === job.id);
      if (existing) return;
      const now = new Date().toISOString();
      project.reviews.push({
        id: uid(),
        jobId: job.id,
        workflowId: job.workflow.id,
        title: reviewableWorkflows[job.workflow.id],
        sourceKey: job.sourceKey || '',
        sourceName: job.sourceFileName || 'Source',
        artifactNames: (job.outputs || []).map((output) => output.name),
        assignee: '',
        status: 'pending',
        comments: [],
        revisions: [{ status: 'pending', note: 'Review created after workflow completion.', changedAt: now }],
        createdAt: now,
        updatedAt: now
      });
    });
  }


  function ensureForProjectHistory(projectId) {
    const project = window.ProjectWorkspace.get(projectId);
    if (!project) return null;
    const history = Array.isArray(project.history) ? project.history : [];
    const existing = Array.isArray(project.reviews) ? project.reviews : [];
    const missing = history.filter((entry) => entry.status === 'completed' && reviewableWorkflows[entry.workflowId] && !existing.some((review) => review.jobId === entry.jobId));
    if (!missing.length) return project;
    return window.ProjectWorkspace.update(projectId, (current) => {
      current.reviews = Array.isArray(current.reviews) ? current.reviews : [];
      missing.forEach((entry) => {
        const now = new Date().toISOString();
        current.reviews.push({
          id: uid(),
          jobId: entry.jobId,
          workflowId: entry.workflowId,
          title: reviewableWorkflows[entry.workflowId],
          sourceKey: entry.sourceKey || '',
          sourceName: entry.sourceName || 'Source',
          artifactNames: Array.isArray(entry.artifactNames) ? entry.artifactNames : [],
          assignee: '',
          status: 'pending',
          comments: [],
          revisions: [{ status: 'pending', note: 'Review created for previously completed workflow.', changedAt: now }],
          createdAt: now,
          updatedAt: now
        });
      });
    });
  }

  function assign(projectId, reviewId, assignee) {
    const name = String(assignee || '').trim().replace(/\s+/g, ' ');
    return change(projectId, reviewId, (review, now) => {
      review.assignee = name;
      review.revisions.push({ status: review.status, note: name ? `Assigned to ${name}.` : 'Assignment cleared.', changedAt: now });
    });
  }

  function addComment(projectId, reviewId, author, text) {
    const comment = String(text || '').trim();
    if (!comment) throw new Error('Enter a review comment.');
    const reviewer = String(author || '').trim() || 'Reviewer';
    return change(projectId, reviewId, (review, now) => {
      review.comments.push({ id: uid(), author: reviewer, text: comment, createdAt: now });
      review.revisions.push({ status: review.status, note: `Comment added by ${reviewer}.`, changedAt: now });
    });
  }

  function setDecision(projectId, reviewId, status, reviewer, note) {
    if (!['approved', 'rejected', 'pending'].includes(status)) throw new Error('Choose a valid review decision.');
    const person = String(reviewer || '').trim();
    const message = String(note || '').trim();
    if ((status === 'approved' || status === 'rejected') && !person) throw new Error('Enter the reviewer name before recording a decision.');
    if (status === 'rejected' && !message) throw new Error('Explain what must be revised before rejecting the work.');
    return change(projectId, reviewId, (review, now) => {
      review.status = status;
      review.reviewedBy = person;
      review.decisionNote = message;
      review.decidedAt = status === 'pending' ? '' : now;
      review.revisions.push({ status, note: message || `${review.title} marked ${status}.`, changedBy: person, changedAt: now });
    });
  }

  function change(projectId, reviewId, updater) {
    return window.ProjectWorkspace.update(projectId, (project) => {
      project.reviews = Array.isArray(project.reviews) ? project.reviews : [];
      const review = project.reviews.find((item) => item.id === reviewId);
      if (!review) throw new Error('That review is no longer available.');
      review.comments = Array.isArray(review.comments) ? review.comments : [];
      review.revisions = Array.isArray(review.revisions) ? review.revisions : [];
      const now = new Date().toISOString();
      updater(review, now);
      review.updatedAt = now;
    });
  }

  function summary(project) {
    const reviews = project && Array.isArray(project.reviews) ? project.reviews : [];
    return {
      total: reviews.length,
      pending: reviews.filter((review) => review.status === 'pending').length,
      approved: reviews.filter((review) => review.status === 'approved').length,
      rejected: reviews.filter((review) => review.status === 'rejected').length,
      ready: reviews.length > 0 && reviews.every((review) => review.status === 'approved')
    };
  }

  window.ProjectReview = { ensureForWorkflow, ensureForProjectHistory, assign, addComment, setDecision, summary };
})();
