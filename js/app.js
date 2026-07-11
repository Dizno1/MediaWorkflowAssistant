(function () {
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const fileHelp = document.getElementById('file-help');
  const urlForm = document.getElementById('url-form');
  const urlInput = document.getElementById('url-input');
  const urlHelp = document.getElementById('url-help');
  const statusRegion = document.getElementById('status-region');
  const inspectionOutput = document.getElementById('inspection-output');
  const assessmentSection = document.getElementById('assessment-section');
  const assessmentSummary = document.getElementById('assessment-summary');
  const assessmentOutput = document.getElementById('assessment-output');
  const recommendationsSection = document.getElementById('recommendations-section');
  const recommendationsSummary = document.getElementById('recommendations-summary');
  const recommendationsOutput = document.getElementById('recommendations-output');
  const planSection = document.getElementById('plan-section');
  const planSummary = document.getElementById('plan-summary');
  const planOutput = document.getElementById('plan-output');
  const knowledgeSection = document.getElementById('knowledge-section');
  const knowledgeSummary = document.getElementById('knowledge-summary');
  const knowledgeOutput = document.getElementById('knowledge-output');
  const viewerSection = document.getElementById('viewer-section');
  const viewerOutput = document.getElementById('viewer-output');
  const goalsSection = document.getElementById('goals-section');
  const goalsIntro = document.getElementById('goals-intro');
  const goals = document.getElementById('goals');
  const progressSection = document.getElementById('progress-section');
  const jobStatus = document.getElementById('job-status');
  const progressBar = document.getElementById('progress-bar');
  const progressSteps = document.getElementById('progress-steps');
  const cancelJobButton = document.getElementById('cancel-job');
  const transcriptReviewSection = document.getElementById('transcript-review-section');
  const transcriptReviewForm = document.getElementById('transcript-review-form');
  const transcriptReviewSummary = document.getElementById('transcript-review-summary');
  const transcriptTitleInput = document.getElementById('transcript-title');
  const transcriptTextInput = document.getElementById('transcript-text');
  const transcriptReviewedInput = document.getElementById('transcript-reviewed');
  const transcriptReviewStatus = document.getElementById('transcript-review-status');
  const cancelTranscriptReviewButton = document.getElementById('cancel-transcript-review');
  const captionReviewSection = document.getElementById('caption-review-section');
  const captionReviewForm = document.getElementById('caption-review-form');
  const captionReviewSummary = document.getElementById('caption-review-summary');
  const captionTitleInput = document.getElementById('caption-title');
  const captionCues = document.getElementById('caption-cues');
  const addCaptionCueButton = document.getElementById('add-caption-cue');
  const captionsReviewedInput = document.getElementById('captions-reviewed');
  const captionReviewStatus = document.getElementById('caption-review-status');
  const cancelCaptionReviewButton = document.getElementById('cancel-caption-review');
  const audioDescriptionReviewSection = document.getElementById('audio-description-review-section');
  const audioDescriptionReviewForm = document.getElementById('audio-description-review-form');
  const audioDescriptionReviewSummary = document.getElementById('audio-description-review-summary');
  const audioDescriptionTitleInput = document.getElementById('audio-description-title');
  const audioDescriptionNotesInput = document.getElementById('audio-description-notes');
  const audioDescriptionCues = document.getElementById('audio-description-cues');
  const addAudioDescriptionCueButton = document.getElementById('add-audio-description-cue');
  const audioDescriptionReviewedInput = document.getElementById('audio-description-reviewed');
  const audioDescriptionReviewStatus = document.getElementById('audio-description-review-status');
  const cancelAudioDescriptionReviewButton = document.getElementById('cancel-audio-description-review');

  const packageReviewSection = document.getElementById('package-review-section');
  const packageReviewForm = document.getElementById('package-review-form');
  const packageReviewSummary = document.getElementById('package-review-summary');
  const packageNameInput = document.getElementById('package-name');
  const packageArtifactOptions = document.getElementById('package-artifact-options');
  const packagePrivacyNotices = document.getElementById('package-privacy-notices');
  const packagePrivacyConfirm = document.getElementById('package-privacy-confirm');
  const packageReviewStatus = document.getElementById('package-review-status');
  const cancelPackageReviewButton = document.getElementById('cancel-package-review');
  const resultsSection = document.getElementById('results-section');
  const resultsOutput = document.getElementById('results-output');

  let currentFile = null;
  let currentSource = null;
  let currentInspection = null;
  let activeJob = null;
  let pendingTranscriptIntent = null;
  let pendingCaptionIntent = null;
  let captionCueCounter = 0;
  let pendingAudioDescriptionIntent = null;
  let audioDescriptionCueCounter = 0;
  let pendingPackageIntent = null;
  let currentPackageReview = null;
  let currentKnowledgeModel = null;
  let currentAssessment = null;
  let currentPlan = null;
  let currentRecommendations = null;
  const executionEngine = new window.WorkflowExecutionEngine({
    onQueued: queuedProgress,
    onUpdate: updateProgress,
    onComplete: completeProgress,
    onError: failProgress,
    onCancel: cancelProgress
  });

  function setStatus(message) {
    statusRegion.textContent = message;
  }

  async function handleFile(file) {
    if (!file) return;

    currentFile = file;
    currentSource = { type: 'file', name: file.name, file };
    currentInspection = null;
    currentKnowledgeModel = null;
    currentAssessment = null;
    currentPlan = null;
    currentRecommendations = null;
    activeJob = null;
    urlInput.value = '';
    urlHelp.textContent = 'Paste a link to media or a page containing media.';
    resetViewer();
    resetKnowledge();
    resetAssessment();
    resetRecommendations();
    resetPlan();
    resetProgress();
    resetResults();
    resetTranscriptReview();
    resetCaptionReview();
    resetAudioDescriptionReview();
    resetPackageReview();

    fileHelp.textContent = `${file.name} selected. The file stays on this device.`;
    dropZone.querySelector('strong').textContent = file.name;
    dropZone.querySelector('span').textContent = 'Press Enter to choose a different file';

    setStatus(`Checking ${file.name}.`);
    inspectionOutput.hidden = false;
    inspectionOutput.innerHTML = '<p class="muted">Checking the file...</p>';

    try {
      currentInspection = await window.MediaInspector.inspect(file);
      renderInspection(currentInspection);
      renderAssessment(currentInspection);
      renderPlan(currentInspection);
      renderRecommendations(currentInspection);
      renderKnowledge();
      await renderViewer(file, currentInspection);
      renderGoals(currentInspection);
      setStatus(`${currentInspection.recommendedSummary} Choices are available.`);
    } catch (error) {
      console.error(error);
      setStatus('This file could not be checked. Try another file.');
      inspectionOutput.innerHTML = '<p role="alert">This file could not be checked. Try another file.</p>';
    }
  }

  async function handleUrl(rawUrl) {
    const value = String(rawUrl || '').trim();
    if (!value) return;

    currentFile = null;
    currentSource = null;
    currentInspection = null;
    currentKnowledgeModel = null;
    currentAssessment = null;
    currentPlan = null;
    currentRecommendations = null;
    activeJob = null;
    resetViewer();
    resetKnowledge();
    resetAssessment();
    resetRecommendations();
    resetPlan();
    resetProgress();
    resetResults();
    resetTranscriptReview();
    resetCaptionReview();
    resetAudioDescriptionReview();
    resetPackageReview();

    inspectionOutput.hidden = false;
    inspectionOutput.innerHTML = '<p class="muted">Checking the web address...</p>';
    setStatus('Checking the web address.');

    try {
      currentInspection = await window.MediaInspector.inspectUrl(value);
      currentSource = {
        type: 'url',
        name: currentInspection.name,
        url: currentInspection.sourceUrl
      };
      urlInput.value = currentInspection.sourceUrl;
      urlHelp.textContent = `Using ${currentInspection.sourceHost}.`;
      fileInput.value = '';
      fileHelp.textContent = 'No local file selected.';
      dropZone.querySelector('strong').textContent = 'Drop a file here';
      dropZone.querySelector('span').textContent = 'or press Enter to choose a file';

      renderInspection(currentInspection);
      renderAssessment(currentInspection);
      renderPlan(currentInspection);
      renderRecommendations(currentInspection);
      renderKnowledge();
      await renderViewer(currentSource, currentInspection);
      renderGoals(currentInspection);
      setStatus(`${currentInspection.recommendedSummary} Choices are available.`);
    } catch (error) {
      console.error(error);
      currentSource = null;
      setStatus('That web address could not be used. Check it and try again.');
      inspectionOutput.innerHTML = `<p role="alert">${escapeHtml(error.message || 'That web address could not be used. Check it and try again.')}</p>`;
      urlInput.focus();
    }
  }

  function renderInspection(inspection) {
    const details = [
      [inspection.sourceType === 'url' ? 'Source name' : 'File name', inspection.name],
      ...(inspection.sourceType === 'url' ? [['Website', inspection.sourceHost], ['Web address', inspection.sourceUrl]] : []),
      ['Type', titleCase(inspection.mediaType)],
      ['Size', inspection.sizeLabel],
      ['Duration', inspection.durationLabel],
      ['Dimensions', inspection.dimensionsLabel],
      ['Contains audio', yesNo(inspection.hasAudio)],
      ['Contains video', yesNo(inspection.hasVideo)],
      ['Contains images', yesNo(inspection.hasImages)],
      ['Readable text likely', yesNo(inspection.hasReadableText)],
      ['Captions found', yesNo(inspection.hasCaptions)]
    ];

    inspectionOutput.innerHTML = `
      <p class="inspection-summary">${escapeHtml(inspection.recommendedSummary)}</p>
      <div class="inspection-grid" aria-label="Source details">
        ${details.map(([label, value]) => fact(label, value)).join('')}
      </div>
    `;
  }

  function fact(label, value) {
    return `<div class="fact"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
  }


  function renderAssessment(inspection) {
    currentKnowledgeModel = window.AccessibilityIntelligence.buildKnowledgeModel(inspection);
    currentAssessment = window.AccessibilityAssessment.assess(currentKnowledgeModel);
    assessmentSection.hidden = false;
    assessmentSummary.textContent = currentAssessment.summary;

    if (!currentAssessment.items.length) {
      assessmentOutput.innerHTML = '<p>No assessment items are available for this source yet.</p>';
      return;
    }

    assessmentOutput.innerHTML = `
      <p class="muted">This first assessment uses the source type and technical details already available. Deeper speech and visual analysis will improve future recommendations.</p>
      <ul class="assessment-list">
        ${currentAssessment.items.map((entry) => `
          <li>
            <h3>${escapeHtml(entry.title)}</h3>
            <p><strong>${escapeHtml(entry.status)}</strong></p>
            <p>${escapeHtml(entry.reason)}</p>
            <p class="muted">${escapeHtml(entry.confidence)}</p>
          </li>
        `).join('')}
      </ul>
      <p class="analysis-status">Initial analysis completed. ${currentAssessment.pendingAnalysis} deeper analysis area${currentAssessment.pendingAnalysis === 1 ? '' : 's'} remain.</p>
    `;
  }

  function resetAssessment() {
    assessmentSection.hidden = true;
    assessmentSummary.textContent = 'The assessment will appear after the source is checked.';
    assessmentOutput.innerHTML = '';
  }

  function renderPlan(inspection) {
    const intents = window.IntentEngine.getIntents(inspection);
    currentPlan = window.AccessibilityPlan.build(currentKnowledgeModel, currentAssessment, intents);
    planSection.hidden = false;
    planSummary.textContent = currentPlan.summary;

    if (!currentPlan.steps.length) {
      planOutput.innerHTML = '<p>No accessibility plan is available for this source yet.</p>';
      return;
    }

    planOutput.innerHTML = `
      <p class="muted">The assistant ordered this work so later steps can reuse earlier analysis instead of starting over.</p>
      <ol class="accessibility-plan-list">
        ${currentPlan.steps.map((step) => `
          <li>
            <h3>${escapeHtml(step.title)}</h3>
            <p>${escapeHtml(step.purpose)}</p>
            <p><strong>Status:</strong> ${escapeHtml(planStatusLabel(step.status))}</p>
            <p class="muted">${escapeHtml(step.availability)}</p>
            ${step.dependencies.length ? `<p class="muted"><strong>Uses:</strong> ${escapeHtml(step.dependencies.map((dependency) => planStepTitle(dependency)).join(', '))}</p>` : ''}
          </li>
        `).join('')}
      </ol>
      <p class="analysis-status">The future single action will be called "${escapeHtml(currentPlan.recommendedAction)}." It will run only the work that is needed and available.</p>
    `;
  }


  function renderRecommendations(inspection) {
    const intents = window.IntentEngine.getIntents(inspection);
    currentRecommendations = window.RecommendationEngine.build(
      currentKnowledgeModel,
      currentAssessment,
      currentPlan,
      intents
    );

    recommendationsSection.hidden = false;
    recommendationsSummary.textContent = currentRecommendations.summary;

    if (!currentRecommendations.recommendations.length) {
      recommendationsOutput.innerHTML = '<p>No recommendations are available for this source yet.</p>';
      return;
    }

    recommendationsOutput.innerHTML = `
      <p class="muted">Recommendations are ranked from Shared Knowledge, missing accessibility features, workflow order, completed work, and provider availability.</p>
      <ol class="smart-recommendation-list">
        ${currentRecommendations.recommendations.map((item) => `
          <li data-recommendation-level="${escapeHtml(item.recommendationLevel.toLowerCase().replace(/\s+/g, '-'))}">
            <h3>${escapeHtml(item.title)}</h3>
            <p><strong>${escapeHtml(item.recommendationLevel)}</strong></p>
            <p>${escapeHtml(item.recommendationReason)}</p>
            ${item.isTopRecommendation ? '<p class="analysis-status">Best next action for this source.</p>' : ''}
          </li>
        `).join('')}
      </ol>
    `;
  }

  function resetRecommendations() {
    currentRecommendations = null;
    recommendationsSection.hidden = true;
    recommendationsSummary.textContent = 'Prioritized recommendations will appear after the source is checked.';
    recommendationsOutput.innerHTML = '';
  }

  function resetPlan() {
    currentPlan = null;
    planSection.hidden = true;
    planSummary.textContent = 'The plan will appear after the source is checked.';
    planOutput.innerHTML = '';
  }

  function planStatusLabel(status) {
    return ({
      complete: 'Complete',
      ready: 'Available now',
      'template-only': 'Preparation only',
      planned: 'Planned'
    })[status] || 'Planned';
  }

  function planStepTitle(id) {
    const definition = window.AccessibilityPlan.taskDefinitions[id];
    return definition ? definition.title : id;
  }



  function renderKnowledge() {
    if (!currentKnowledgeModel) {
      resetKnowledge();
      return;
    }

    const summary = window.SharedKnowledge.summarize(currentKnowledgeModel);
    const results = Array.isArray(currentKnowledgeModel.results) ? currentKnowledgeModel.results : [];
    knowledgeSection.hidden = false;
    knowledgeSummary.textContent = summary.results
      ? `${summary.results} created result${summary.results === 1 ? '' : 's'} are saved in the shared knowledge for this source.`
      : 'The source inspection is saved in shared knowledge. Created results will be added here and reused by later actions.';

    knowledgeOutput.innerHTML = `
      <p><strong>Completed knowledge areas:</strong> ${summary.completed}</p>
      ${summary.restored ? '<p class="analysis-status">Previous work for this source was restored from this browser.</p>' : ''}
      ${results.length ? `
        <h3>Results available to later actions</h3>
        <ul class="results-list">
          ${results.map((result) => `
            <li>
              <strong>${escapeHtml(result.name)}</strong>
              <span>${escapeHtml(result.type || 'Created result')}</span>
              <p>${escapeHtml(result.description || '')}</p>
            </li>
          `).join('')}
        </ul>
      ` : '<p class="muted">No workflow results have been created for this source yet.</p>'}
    `;
  }

  function resetKnowledge() {
    knowledgeSection.hidden = true;
    knowledgeSummary.textContent = 'Saved analysis and results will appear here.';
    knowledgeOutput.innerHTML = '';
  }

  async function renderViewer(source, inspection) {
    viewerSection.hidden = false;
    viewerOutput.innerHTML = '';

    if (inspection.sourceType === 'url') {
      renderUrlViewer(source, inspection);
      return;
    }

    const file = source;
    const objectUrl = URL.createObjectURL(file);
    const type = inspection.mediaType;

    if (type === 'video') {
      const video = document.createElement('video');
      video.controls = true;
      video.preload = 'metadata';
      video.src = objectUrl;
      video.className = 'media-viewer';
      video.setAttribute('aria-label', `Video preview for ${file.name}`);
      viewerOutput.appendChild(video);
      return;
    }

    if (type === 'audio') {
      const audio = document.createElement('audio');
      audio.controls = true;
      audio.preload = 'metadata';
      audio.src = objectUrl;
      audio.className = 'media-viewer';
      audio.setAttribute('aria-label', `Audio player for ${file.name}`);
      viewerOutput.appendChild(audio);
      return;
    }

    if (type === 'image') {
      const image = document.createElement('img');
      image.src = objectUrl;
      image.alt = `Selected image: ${file.name}`;
      image.className = 'image-viewer';
      viewerOutput.appendChild(image);
      return;
    }

    if (file.type === 'application/pdf' || inspection.extension === 'pdf') {
      const frame = document.createElement('iframe');
      frame.src = objectUrl;
      frame.title = `PDF viewer for ${file.name}`;
      frame.className = 'document-viewer';
      viewerOutput.appendChild(frame);

      const fallback = document.createElement('p');
      fallback.className = 'help-text';
      fallback.textContent = 'If the PDF does not appear here, open the original file with your usual PDF reader.';
      viewerOutput.appendChild(fallback);
      return;
    }

    if (
      file.type.startsWith('text/') ||
      ['txt', 'md', 'csv', 'json', 'xml', 'html', 'htm'].includes(inspection.extension)
    ) {
      try {
        const text = await file.text();
        const pre = document.createElement('pre');
        pre.className = 'text-viewer';
        pre.tabIndex = 0;
        pre.textContent = text;
        viewerOutput.appendChild(pre);
      } catch (error) {
        viewerOutput.innerHTML = '<p>This text file could not be displayed.</p>';
      }
      return;
    }

    viewerOutput.innerHTML = '<p>This file cannot be shown here yet. The file details and available choices are still available below.</p>';
  }

  function renderUrlViewer(source, inspection) {
    const url = inspection.sourceUrl;

    if (inspection.youtubeId) {
      const frame = document.createElement('iframe');
      frame.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(inspection.youtubeId)}`;
      frame.title = `Video viewer for ${inspection.name}`;
      frame.className = 'video-embed';
      frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      frame.allowFullscreen = true;
      viewerOutput.appendChild(frame);
      appendOpenLink(url, 'Open the video on its website');
      return;
    }

    if (inspection.mediaType === 'video' && inspection.isDirectMedia) {
      const video = document.createElement('video');
      video.controls = true;
      video.preload = 'metadata';
      video.src = url;
      video.className = 'media-viewer';
      video.setAttribute('aria-label', `Video from ${inspection.sourceHost}`);
      viewerOutput.appendChild(video);
      appendOpenLink(url, 'Open the original video');
      return;
    }

    if (inspection.mediaType === 'audio' && inspection.isDirectMedia) {
      const audio = document.createElement('audio');
      audio.controls = true;
      audio.preload = 'metadata';
      audio.src = url;
      audio.className = 'media-viewer';
      audio.setAttribute('aria-label', `Audio from ${inspection.sourceHost}`);
      viewerOutput.appendChild(audio);
      appendOpenLink(url, 'Open the original audio');
      return;
    }

    if (inspection.mediaType === 'image' && inspection.isDirectMedia) {
      const image = document.createElement('img');
      image.src = url;
      image.alt = `Image from ${inspection.sourceHost}`;
      image.className = 'image-viewer';
      viewerOutput.appendChild(image);
      appendOpenLink(url, 'Open the original image');
      return;
    }

    if (inspection.extension === 'pdf') {
      const frame = document.createElement('iframe');
      frame.src = url;
      frame.title = `PDF viewer for ${inspection.name}`;
      frame.className = 'document-viewer';
      viewerOutput.appendChild(frame);
      appendOpenLink(url, 'Open the PDF in a new tab');
      return;
    }

    const card = document.createElement('div');
    card.className = 'viewer-link-card';
    card.innerHTML = '<p>This web source cannot be displayed safely inside the assistant. You can open it in a new tab and continue using the choices below.</p>';
    viewerOutput.appendChild(card);
    appendOpenLink(url, 'Open this web source');
  }

  function appendOpenLink(url, label) {
    const paragraph = document.createElement('p');
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.className = 'web-source-link';
    link.textContent = label;
    paragraph.appendChild(link);
    viewerOutput.appendChild(paragraph);
  }

  function resetViewer() {
    viewerSection.hidden = true;
    viewerOutput.innerHTML = '';
  }

  function renderGoals(inspection) {
    const intents = currentRecommendations
      ? currentRecommendations.recommendations
      : window.IntentEngine.getIntents(inspection);
    goals.innerHTML = '';
    goalsSection.hidden = false;

    if (!intents.length) {
      goalsIntro.textContent = 'No choices are available for this file yet.';
      return;
    }

    const remaining = intents.filter((intent) => !intent.completed);
    const availableCount = remaining.filter((intent) => intent.capability.canRun).length;
    goalsIntro.textContent = `${remaining.length} remaining choice${remaining.length === 1 ? '' : 's'}. ${availableCount} available now. Choices are ordered by recommendation priority.`;

    intents.forEach((intent) => {
      const card = document.createElement('article');
      card.className = 'recommendation-card';
      card.setAttribute('aria-labelledby', `goal-title-${intent.id}`);

      const title = document.createElement('h3');
      title.id = `goal-title-${intent.id}`;
      title.textContent = intent.title;
      card.appendChild(title);

      if (intent.recommendationLevel) {
        const priority = document.createElement('p');
        priority.className = 'recommendation-priority';
        priority.innerHTML = `<strong>${escapeHtml(intent.recommendationLevel)}</strong>`;
        card.appendChild(priority);
      }

      const description = document.createElement('p');
      description.textContent = intent.recommendationReason || intent.description;
      card.appendChild(description);

      const button = document.createElement('button');
      button.type = 'button';

      if (intent.completed) {
        button.textContent = 'Already complete';
        button.disabled = true;
        button.setAttribute('aria-label', `${intent.title}. Already complete.`);
      } else if (intent.inProgress) {
        button.textContent = 'In progress';
        button.disabled = true;
        button.setAttribute('aria-label', `${intent.title}. In progress.`);
      } else if (intent.capability.canRun) {
        button.textContent = intent.actionLabel;
        button.addEventListener('click', () => runIntent(intent));
      } else {
        button.textContent = 'Not available yet';
        button.disabled = true;
        button.setAttribute('aria-label', `${intent.title}. Not available yet.`);
      }

      card.appendChild(button);
      goals.appendChild(card);
    });
  }

  function runIntent(intent) {
    if (!currentSource || !currentInspection || !intent.capability.canRun) return;

    if (intent.workflowId === 'create-transcript') {
      openTranscriptReview(intent);
      return;
    }
    if (intent.workflowId === 'create-captions') {
      openCaptionReview(intent);
      return;
    }
    if (intent.workflowId === 'audio-description') {
      openAudioDescriptionReview(intent);
      return;
    }
    if (intent.workflowId === 'accessibility-package') {
      openPackageReview(intent);
      return;
    }
    startIntentJob(intent, null);
  }

  function startIntentJob(intent, exportOptions) {
    resetProgress();
    resetResults();
    resetTranscriptReview();
    resetCaptionReview();
    resetAudioDescriptionReview();
    resetPackageReview();
    activeJob = window.createJob(intent, currentFile || currentSource, currentInspection);
    activeJob.exportOptions = exportOptions || null;
    activeJob.transcriptOptions = intent.workflowId === 'create-transcript' ? (exportOptions || null) : null;
    activeJob.captionOptions = intent.workflowId === 'create-captions' ? (exportOptions || null) : null;
    activeJob.audioDescriptionOptions = intent.workflowId === 'audio-description' ? (exportOptions || null) : null;
    activeJob.knowledgeModel = currentKnowledgeModel;
    activeJob.assessment = currentAssessment;
    activeJob.accessibilityPlan = currentPlan;
    currentKnowledgeModel.activeJobs = Array.isArray(currentKnowledgeModel.activeJobs) ? currentKnowledgeModel.activeJobs : [];
    currentKnowledgeModel.activeJobs.push({ jobId: activeJob.id, workflowId: intent.workflowId, status: 'queued' });
    window.SharedKnowledge.save(currentKnowledgeModel);
    renderProgress(activeJob);
    refreshAfterJobStateChange();
    progressSection.hidden = false;
    progressSection.focus();
    executionEngine.enqueue(activeJob);
  }

  function openTranscriptReview(intent) {
    pendingTranscriptIntent = intent;
    const review = window.TranscriptReview.build(currentFile ? currentFile.name : currentInspection.name);
    transcriptTitleInput.value = review.suggestedTitle;
    transcriptTextInput.value = '';
    transcriptReviewedInput.checked = false;
    transcriptReviewStatus.textContent = '';
    transcriptReviewSummary.textContent = `Use the Viewer for ${currentFile ? currentFile.name : currentInspection.name}. Enter the spoken content, identify speakers when useful, and include meaningful sounds.`;
    transcriptReviewSection.hidden = false;
    transcriptReviewSection.focus();
  }

  function submitTranscriptReview(event) {
    event.preventDefault();
    if (!pendingTranscriptIntent) return;
    const text = window.TranscriptReview.normalizeText(transcriptTextInput.value);
    if (!text) {
      transcriptReviewStatus.textContent = 'Enter transcript text before saving.';
      transcriptTextInput.focus();
      return;
    }
    if (!transcriptReviewedInput.checked) {
      transcriptReviewStatus.textContent = 'Confirm that you reviewed the transcript before saving it as complete.';
      transcriptReviewedInput.focus();
      return;
    }
    const options = {
      title: transcriptTitleInput.value.trim() || `Transcript for ${currentFile ? currentFile.name : currentInspection.name}`,
      text,
      wordCount: window.TranscriptReview.wordCount(text),
      reviewed: true,
      reviewedAt: new Date().toISOString()
    };
    const intent = pendingTranscriptIntent;
    startIntentJob(intent, options);
  }

  function resetTranscriptReview() {
    pendingTranscriptIntent = null;
    transcriptReviewSection.hidden = true;
    transcriptTitleInput.value = '';
    transcriptTextInput.value = '';
    transcriptReviewedInput.checked = false;
    transcriptReviewStatus.textContent = '';
  }

  function openCaptionReview(intent) {
    pendingCaptionIntent = intent;
    const review = window.CaptionReview.build(
      currentFile ? currentFile.name : currentInspection.name,
      currentInspection.durationSeconds,
      currentKnowledgeModel,
      currentKnowledgeModel.source
    );
    captionTitleInput.value = review.suggestedTitle;
    captionCueCounter = 0;
    captionCues.innerHTML = '';
    review.cues.forEach((cue) => addCaptionCue(cue));
    captionsReviewedInput.checked = false;
    captionReviewStatus.textContent = '';
    captionReviewSummary.textContent = review.reusedTranscript
      ? 'A completed transcript was used to create starter cues. Review every cue against the Viewer and correct the timing and text.'
      : 'Use the Viewer to enter each caption and its timing. Include spoken words, speaker identification when needed, and meaningful sounds.';
    captionReviewSection.hidden = false;
    captionReviewSection.focus();
  }

  function addCaptionCue(cue = {}) {
    captionCueCounter += 1;
    const cueId = captionCueCounter;
    const fieldset = document.createElement('fieldset');
    fieldset.className = 'caption-cue';
    fieldset.dataset.cueId = String(cueId);
    fieldset.innerHTML = `
      <legend>Caption cue ${cueId}</legend>
      <div class="caption-time-fields">
        <div class="form-field">
          <label for="caption-start-${cueId}">Start time</label>
          <input id="caption-start-${cueId}" class="caption-start" type="text" inputmode="decimal" value="${escapeHtml(cue.start || '00:00:00.000')}" aria-describedby="caption-time-format-${cueId}" required>
        </div>
        <div class="form-field">
          <label for="caption-end-${cueId}">End time</label>
          <input id="caption-end-${cueId}" class="caption-end" type="text" inputmode="decimal" value="${escapeHtml(cue.end || '00:00:04.000')}" aria-describedby="caption-time-format-${cueId}" required>
        </div>
      </div>
      <p id="caption-time-format-${cueId}" class="help-text">Format: 00:00:00.000</p>
      <div class="form-field">
        <label for="caption-text-${cueId}">Caption text</label>
        <textarea id="caption-text-${cueId}" class="caption-text" rows="3" required>${escapeHtml(cue.text || '')}</textarea>
      </div>
      <button type="button" class="remove-caption-cue">Remove caption cue ${cueId}</button>
    `;
    fieldset.querySelector('.remove-caption-cue').addEventListener('click', () => {
      if (captionCues.children.length === 1) {
        captionReviewStatus.textContent = 'At least one caption cue is required.';
        return;
      }
      const nextFocus = fieldset.previousElementSibling || fieldset.nextElementSibling || addCaptionCueButton;
      fieldset.remove();
      renumberCaptionCues();
      captionReviewStatus.textContent = 'Caption cue removed.';
      nextFocus.focus();
    });
    captionCues.appendChild(fieldset);
  }

  function renumberCaptionCues() {
    Array.from(captionCues.children).forEach((fieldset, index) => {
      fieldset.querySelector('legend').textContent = `Caption cue ${index + 1}`;
    });
  }

  function collectCaptionCues() {
    return Array.from(captionCues.querySelectorAll('.caption-cue')).map((fieldset) => ({
      start: fieldset.querySelector('.caption-start').value.trim(),
      end: fieldset.querySelector('.caption-end').value.trim(),
      text: fieldset.querySelector('.caption-text').value.trim()
    }));
  }

  function submitCaptionReview(event) {
    event.preventDefault();
    if (!pendingCaptionIntent) return;
    const cues = collectCaptionCues();
    const errors = window.CaptionReview.validate(cues, currentInspection.durationSeconds);
    if (errors.length) {
      captionReviewStatus.textContent = errors.join(' ');
      const firstInvalid = captionCues.querySelector(':invalid');
      if (firstInvalid) firstInvalid.focus();
      return;
    }
    if (!captionsReviewedInput.checked) {
      captionReviewStatus.textContent = 'Confirm that you reviewed the caption text and timing before saving the captions as complete.';
      captionsReviewedInput.focus();
      return;
    }
    const options = {
      title: captionTitleInput.value.trim() || `Captions for ${currentFile ? currentFile.name : currentInspection.name}`,
      cues,
      cueCount: cues.length,
      reviewed: true,
      reviewedAt: new Date().toISOString(),
      webVtt: window.CaptionReview.toWebVtt(captionTitleInput.value, currentFile ? currentFile.name : currentInspection.name, cues)
    };
    const intent = pendingCaptionIntent;
    startIntentJob(intent, options);
  }

  function resetCaptionReview() {
    pendingCaptionIntent = null;
    captionReviewSection.hidden = true;
    captionTitleInput.value = '';
    captionCues.innerHTML = '';
    captionsReviewedInput.checked = false;
    captionReviewStatus.textContent = '';
  }

  function openAudioDescriptionReview(intent) {
    pendingAudioDescriptionIntent = intent;
    const review = window.AudioDescriptionReview.build(currentFile ? currentFile.name : currentInspection.name);
    audioDescriptionTitleInput.value = review.suggestedTitle;
    audioDescriptionNotesInput.value = '';
    audioDescriptionCueCounter = 0;
    audioDescriptionCues.innerHTML = '';
    review.cues.forEach((cue) => addAudioDescriptionCue(cue));
    audioDescriptionReviewedInput.checked = false;
    audioDescriptionReviewStatus.textContent = '';
    audioDescriptionReviewSummary.textContent = 'Use the Viewer to identify essential visual information that is not already communicated by dialogue, narration, or sound. Add concise narration and verify each proposed placement.';
    audioDescriptionReviewSection.hidden = false;
    audioDescriptionReviewSection.focus();
  }

  function addAudioDescriptionCue(cue = {}) {
    audioDescriptionCueCounter += 1;
    const cueId = audioDescriptionCueCounter;
    const fieldset = document.createElement('fieldset');
    fieldset.className = 'audio-description-cue';
    fieldset.innerHTML = `
      <legend>Description cue ${cueId}</legend>
      <div class="caption-time-fields">
        <div class="form-field"><label for="ad-start-${cueId}">Start time</label><input id="ad-start-${cueId}" class="ad-start" type="text" inputmode="decimal" value="${escapeHtml(cue.start || '00:00:00.000')}" required></div>
        <div class="form-field"><label for="ad-end-${cueId}">End time</label><input id="ad-end-${cueId}" class="ad-end" type="text" inputmode="decimal" value="${escapeHtml(cue.end || '00:00:04.000')}" required></div>
      </div>
      <div class="form-field"><label for="ad-placement-${cueId}">Narration placement</label><select id="ad-placement-${cueId}" class="ad-placement"><option>During a pause</option><option>Before the scene</option><option>After the scene</option><option>Extended description</option></select></div>
      <div class="form-field"><label for="ad-text-${cueId}">Description narration</label><textarea id="ad-text-${cueId}" class="ad-text" rows="4" required>${escapeHtml(cue.text || '')}</textarea></div>
      <button type="button" class="remove-audio-description-cue">Remove description cue ${cueId}</button>`;
    fieldset.querySelector('.ad-placement').value = cue.placement || 'During a pause';
    fieldset.querySelector('.remove-audio-description-cue').addEventListener('click', () => {
      if (audioDescriptionCues.children.length === 1) {
        audioDescriptionReviewStatus.textContent = 'At least one description cue is required.';
        return;
      }
      const nextFocus = fieldset.previousElementSibling || fieldset.nextElementSibling || addAudioDescriptionCueButton;
      fieldset.remove();
      renumberAudioDescriptionCues();
      audioDescriptionReviewStatus.textContent = 'Description cue removed.';
      nextFocus.focus();
    });
    audioDescriptionCues.appendChild(fieldset);
  }

  function renumberAudioDescriptionCues() {
    Array.from(audioDescriptionCues.children).forEach((fieldset, index) => {
      fieldset.querySelector('legend').textContent = `Description cue ${index + 1}`;
    });
  }

  function collectAudioDescriptionCues() {
    return Array.from(audioDescriptionCues.querySelectorAll('.audio-description-cue')).map((fieldset) => ({
      start: fieldset.querySelector('.ad-start').value.trim(),
      end: fieldset.querySelector('.ad-end').value.trim(),
      placement: fieldset.querySelector('.ad-placement').value,
      text: fieldset.querySelector('.ad-text').value.trim()
    }));
  }

  function submitAudioDescriptionReview(event) {
    event.preventDefault();
    if (!pendingAudioDescriptionIntent) return;
    const cues = collectAudioDescriptionCues();
    const errors = window.AudioDescriptionReview.validate(cues, currentInspection.durationSeconds);
    if (errors.length) {
      audioDescriptionReviewStatus.textContent = errors.join(' ');
      const firstInvalid = audioDescriptionCues.querySelector(':invalid');
      if (firstInvalid) firstInvalid.focus();
      return;
    }
    if (!audioDescriptionReviewedInput.checked) {
      audioDescriptionReviewStatus.textContent = 'Confirm that you reviewed the script and narration placement before saving it as complete.';
      audioDescriptionReviewedInput.focus();
      return;
    }
    const sourceName = currentFile ? currentFile.name : currentInspection.name;
    const options = {
      title: audioDescriptionTitleInput.value.trim() || `Audio description script for ${sourceName}`,
      notes: audioDescriptionNotesInput.value.trim(),
      cues,
      cueCount: cues.length,
      reviewed: true,
      reviewedAt: new Date().toISOString(),
      scriptMarkdown: window.AudioDescriptionReview.toMarkdown(audioDescriptionTitleInput.value, sourceName, cues, audioDescriptionNotesInput.value)
    };
    const intent = pendingAudioDescriptionIntent;
    startIntentJob(intent, options);
  }

  function resetAudioDescriptionReview() {
    pendingAudioDescriptionIntent = null;
    audioDescriptionReviewSection.hidden = true;
    audioDescriptionTitleInput.value = '';
    audioDescriptionNotesInput.value = '';
    audioDescriptionCues.innerHTML = '';
    audioDescriptionReviewedInput.checked = false;
    audioDescriptionReviewStatus.textContent = '';
  }

  function openPackageReview(intent) {
    pendingPackageIntent = intent;
    currentPackageReview = window.PackageReview.build(
      currentKnowledgeModel,
      currentKnowledgeModel.source,
      currentInspection,
      currentPlan
    );

    packageNameInput.value = currentPackageReview.suggestedName;
    packagePrivacyConfirm.checked = false;
    packageReviewStatus.textContent = '';
    packageReviewSummary.textContent = `${currentPackageReview.availableArtifacts.length} generated file${currentPackageReview.availableArtifacts.length === 1 ? '' : 's'} can be included. The package will also contain two manifests, ${currentPackageReview.historyCount} workflow history record${currentPackageReview.historyCount === 1 ? '' : 's'}, and ${currentPackageReview.remainingGapCount} remaining accessibility gap${currentPackageReview.remainingGapCount === 1 ? '' : 's'}.`;

    if (currentPackageReview.availableArtifacts.length) {
      packageArtifactOptions.innerHTML = currentPackageReview.availableArtifacts.map((artifact) => `
        <div class="package-option">
          <label>
            <input type="checkbox" name="packageArtifact" value="${escapeHtml(artifact.id)}" checked>
            <strong>${escapeHtml(artifact.name)}</strong>
          </label>
          <p>${escapeHtml(artifact.type)}${Number.isFinite(artifact.size) ? `, ${escapeHtml(formatBytes(artifact.size))}` : ''}</p>
          ${artifact.description ? `<p class="muted">${escapeHtml(artifact.description)}</p>` : ''}
        </div>
      `).join('');
    } else {
      packageArtifactOptions.innerHTML = '<p>No generated files are available in this browser session. The manifests, history, completed work, remaining gaps, and follow-up actions can still be packaged.</p>';
    }

    const privacyItems = currentPackageReview.availableArtifacts.filter((artifact) => artifact.privacyNotice);
    packagePrivacyNotices.innerHTML = privacyItems.length
      ? `<ul>${privacyItems.map((artifact) => `<li><strong>${escapeHtml(artifact.name)}:</strong> ${escapeHtml(artifact.privacyNotice)}</li>`).join('')}</ul>`
      : '<p>No selected generated files have a specific privacy warning. Review the manifest information before export.</p>';

    packageReviewSection.hidden = false;
    packageReviewSection.focus();
  }

  function submitPackageReview(event) {
    event.preventDefault();
    if (!pendingPackageIntent || !currentPackageReview) return;

    const selectedArtifactIds = Array.from(packageArtifactOptions.querySelectorAll('input[name="packageArtifact"]:checked'))
      .map((input) => input.value);
    const selectedSensitive = currentPackageReview.availableArtifacts
      .some((artifact) => selectedArtifactIds.includes(artifact.id) && artifact.privacyNotice);

    if (selectedSensitive && !packagePrivacyConfirm.checked) {
      packageReviewStatus.textContent = 'Confirm the privacy review before creating a package that includes source-derived files.';
      packagePrivacyConfirm.focus();
      return;
    }

    const packageName = window.PackageReview.normalizeName(packageNameInput.value, currentPackageReview.suggestedName);
    const options = {
      packageName,
      selectedArtifactIds,
      privacyConfirmed: packagePrivacyConfirm.checked,
      reviewedAt: new Date().toISOString()
    };
    const intent = pendingPackageIntent;
    startIntentJob(intent, options);
  }

  function resetPackageReview() {
    pendingPackageIntent = null;
    currentPackageReview = null;
    packageReviewSection.hidden = true;
    packageArtifactOptions.innerHTML = '';
    packagePrivacyNotices.innerHTML = '';
    packageReviewStatus.textContent = '';
    packagePrivacyConfirm.checked = false;
  }

  function queuedProgress(job, position) {
    jobStatus.textContent = position > 1 ? `${job.intent.title} is queued at position ${position}.` : `${job.intent.title} is queued and ready to start.`;
  }

  function renderProgress(job) {
    progressSection.hidden = false;
    jobStatus.textContent = `${job.intent.title} is starting.`;
    progressBar.style.width = '0%';
    cancelJobButton.disabled = false;
    progressSteps.innerHTML = job.intent.steps.map((step) => `
      <li data-step-status="pending">
        <span class="step-state">Waiting</span>
        <span>${escapeHtml(step)}</span>
      </li>
    `).join('');
  }

  function updateProgress(job, detail) {
    jobStatus.textContent = detail.message;
    updateActiveJobStatus(job, job.status);
    progressBar.style.width = `${job.progress}%`;
    const meter = progressBar.parentElement;
    if (meter) meter.setAttribute('aria-valuenow', String(job.progress));

    Array.from(progressSteps.children).forEach((item, index) => {
      let state = 'pending';
      let label = 'Waiting';

      if (index < job.currentStepIndex) {
        state = 'done';
        label = 'Done';
      } else if (index === job.currentStepIndex) {
        state = 'current';
        label = 'Now';
      }

      item.dataset.stepStatus = state;
      item.querySelector('.step-state').textContent = label;
    });
  }

  function completeProgress(job) {
    removeActiveJob(job.id);
    currentKnowledgeModel = window.SharedKnowledge.recordJob(currentKnowledgeModel, job);
    job.knowledgeModel = currentKnowledgeModel;
    currentAssessment = window.AccessibilityAssessment.assess(currentKnowledgeModel);
    currentPlan = window.AccessibilityPlan.build(currentKnowledgeModel, currentAssessment, window.IntentEngine.getIntents(currentInspection));
    renderAssessment(currentInspection);
    renderPlan(currentInspection);
    renderRecommendations(currentInspection);
    renderKnowledge();
    renderGoals(currentInspection);

    jobStatus.textContent = `${job.intent.title} finished. Your file is ready.`;
    progressBar.style.width = '100%';
    const meter = progressBar.parentElement;
    if (meter) meter.setAttribute('aria-valuenow', '100');

    Array.from(progressSteps.children).forEach((item) => {
      item.dataset.stepStatus = 'done';
      item.querySelector('.step-state').textContent = 'Done';
    });

    cancelJobButton.disabled = true;
    renderResults(job);
  }

  function failProgress(job, error) {
    removeActiveJob(job.id);
    refreshAfterJobStateChange();
    cancelJobButton.disabled = true;
    jobStatus.textContent = `This action could not be completed. ${error.message}`;
  }

  function cancelProgress(job) {
    removeActiveJob(job.id);
    refreshAfterJobStateChange();
    cancelJobButton.disabled = true;
    jobStatus.textContent = 'The workflow was cancelled. No output was saved.';
  }

  function updateActiveJobStatus(job, status) {
    const entry = (currentKnowledgeModel.activeJobs || []).find((item) => item.jobId === job.id);
    if (entry) entry.status = status;
    window.SharedKnowledge.save(currentKnowledgeModel);
    renderRecommendations(currentInspection);
    renderGoals(currentInspection);
  }

  function removeActiveJob(jobId) {
    currentKnowledgeModel.activeJobs = (currentKnowledgeModel.activeJobs || []).filter((item) => item.jobId !== jobId);
    window.SharedKnowledge.save(currentKnowledgeModel);
  }

  function refreshAfterJobStateChange() {
    currentAssessment = window.AccessibilityAssessment.assess(currentKnowledgeModel);
    currentPlan = window.AccessibilityPlan.build(currentKnowledgeModel, currentAssessment, window.IntentEngine.getIntents(currentInspection));
    renderRecommendations(currentInspection);
    renderGoals(currentInspection);
    renderKnowledge();
  }

  function renderResults(job) {
    resultsSection.hidden = false;

    resultsOutput.innerHTML = `
      <section class="result-explanation" aria-labelledby="result-explanation-heading">
        <h3 id="result-explanation-heading">What happened</h3>
        <p>${escapeHtml(job.intent.title)} finished. Your file is ready.</p>
        <p class="muted">The original file stayed on this device.</p>
      </section>

      <h3>Files created</h3>
      <ul class="results-list">
        ${job.outputs.map((output, index) => `
          <li>
            <strong>${escapeHtml(output.name)}</strong>
            <span>${escapeHtml(output.type)}</span>
            <p>${escapeHtml(output.description)}</p>
            ${output.url ? `<button type="button" data-download-index="${index}">Download ${escapeHtml(output.name)}</button>` : ''}
            ${output.content ? `<button type="button" data-preview-index="${index}">Read ${escapeHtml(output.name)}</button>` : ''}
            ${output.content ? `<button type="button" data-copy-index="${index}">Copy the text</button>` : ''}
          </li>
        `).join('')}
      </ul>

      <section id="file-preview" class="artifact-preview" aria-labelledby="file-preview-heading" hidden>
        <h3 id="file-preview-heading">File preview</h3>
        <pre id="file-preview-content" tabindex="0"></pre>
      </section>

      <div class="next-actions" aria-label="Next steps">
        <button type="button" id="choose-another-goal">Do something else with this file</button>
        <button type="button" id="choose-another-file">Choose another file</button>
      </div>
    `;

    Array.from(resultsOutput.querySelectorAll('[data-download-index]')).forEach((button) => {
      button.addEventListener('click', () => {
        const artifact = job.outputs[Number(button.dataset.downloadIndex)];
        try {
          window.ProviderManager.downloadArtifact(artifact);
          setStatus(`${artifact.name} download started. Check your Downloads folder.`);
        } catch (error) {
          setStatus(error.message);
        }
      });
    });

    Array.from(resultsOutput.querySelectorAll('[data-preview-index]')).forEach((button) => {
      button.addEventListener('click', () => {
        const artifact = job.outputs[Number(button.dataset.previewIndex)];
        const preview = document.getElementById('file-preview');
        const previewContent = document.getElementById('file-preview-content');
        preview.hidden = false;
        previewContent.textContent = artifact.content || 'No preview is available.';
        setStatus(`${artifact.name} is open below.`);
        previewContent.focus();
      });
    });

    Array.from(resultsOutput.querySelectorAll('[data-copy-index]')).forEach((button) => {
      button.addEventListener('click', async () => {
        const artifact = job.outputs[Number(button.dataset.copyIndex)];
        try {
          await navigator.clipboard.writeText(artifact.content || '');
          setStatus('The text was copied.');
        } catch (error) {
          setStatus('Copy failed. Open the file preview and copy the text manually.');
        }
      });
    });

    document.getElementById('choose-another-goal').addEventListener('click', () => {
      goalsSection.focus();
    });

    document.getElementById('choose-another-file').addEventListener('click', () => {
      fileInput.click();
    });

    resultsSection.focus();
  }

  function resetProgress() {
    progressSection.hidden = true;
    jobStatus.textContent = 'Nothing is running.';
    progressBar.style.width = '0%';
    progressSteps.innerHTML = '';
    cancelJobButton.disabled = true;
    const meter = progressBar.parentElement;
    if (meter) meter.setAttribute('aria-valuenow', '0');
  }

  function resetResults() {
    resultsSection.hidden = true;
    resultsOutput.textContent = 'No result yet.';
  }

  function titleCase(value) {
    return String(value).replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function yesNo(value) {
    return value ? 'Yes' : 'No';
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  dropZone.addEventListener('click', () => fileInput.click());

  dropZone.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      fileInput.click();
    }
  });

  ['dragenter', 'dragover'].forEach((eventName) => {
    dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropZone.classList.add('is-dragging');
      setStatus('Drop the file to continue.');
    });
  });

  ['dragleave', 'drop'].forEach((eventName) => {
    dropZone.addEventListener(eventName, () => {
      dropZone.classList.remove('is-dragging');
    });
  });

  dropZone.addEventListener('drop', (event) => {
    event.preventDefault();
    handleFile(event.dataTransfer.files[0]);
  });

  fileInput.addEventListener('change', (event) => {
    handleFile(event.target.files[0]);
  });

  transcriptReviewForm.addEventListener('submit', submitTranscriptReview);
  captionReviewForm.addEventListener('submit', submitCaptionReview);
  audioDescriptionReviewForm.addEventListener('submit', submitAudioDescriptionReview);
  addAudioDescriptionCueButton.addEventListener('click', () => { addAudioDescriptionCue(); audioDescriptionReviewStatus.textContent = 'Description cue added.'; });
  cancelAudioDescriptionReviewButton.addEventListener('click', () => { resetAudioDescriptionReview(); goalsSection.focus(); });
  addCaptionCueButton.addEventListener('click', () => { addCaptionCue(); captionCues.lastElementChild.querySelector('.caption-start').focus(); });
  cancelCaptionReviewButton.addEventListener('click', () => { resetCaptionReview(); goalsSection.focus(); });
  cancelTranscriptReviewButton.addEventListener('click', () => {
    resetTranscriptReview();
    goalsSection.focus();
    setStatus('Transcript creation cancelled.');
  });
  packageReviewForm.addEventListener('submit', submitPackageReview);

  cancelPackageReviewButton.addEventListener('click', () => {
    resetTranscriptReview();
    resetCaptionReview();
    resetAudioDescriptionReview();
    resetPackageReview();
    goalsSection.focus();
    setStatus('Package review cancelled.');
  });

  cancelJobButton.addEventListener('click', () => {
    if (activeJob) executionEngine.cancel(activeJob.id);
  });

  urlForm.addEventListener('submit', (event) => {
    event.preventDefault();
    handleUrl(urlInput.value);
  });
})();
