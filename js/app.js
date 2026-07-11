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
  const viewerSection = document.getElementById('viewer-section');
  const viewerOutput = document.getElementById('viewer-output');
  const goalsSection = document.getElementById('goals-section');
  const goalsIntro = document.getElementById('goals-intro');
  const goals = document.getElementById('goals');
  const progressSection = document.getElementById('progress-section');
  const jobStatus = document.getElementById('job-status');
  const progressBar = document.getElementById('progress-bar');
  const progressSteps = document.getElementById('progress-steps');
  const resultsSection = document.getElementById('results-section');
  const resultsOutput = document.getElementById('results-output');

  let currentFile = null;
  let currentSource = null;
  let currentInspection = null;
  let activeJob = null;
  let currentKnowledgeModel = null;
  let currentAssessment = null;

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
    activeJob = null;
    urlInput.value = '';
    urlHelp.textContent = 'Paste a link to media or a page containing media.';
    resetViewer();
    resetAssessment();
    resetProgress();
    resetResults();

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
    activeJob = null;
    resetViewer();
    resetAssessment();
    resetProgress();
    resetResults();

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
    const intents = window.IntentEngine.getIntents(inspection);
    goals.innerHTML = '';
    goalsSection.hidden = false;

    if (!intents.length) {
      goalsIntro.textContent = 'No choices are available for this file yet.';
      return;
    }

    const availableCount = intents.filter((intent) => intent.capability.canRun).length;
    goalsIntro.textContent = `${intents.length} choice${intents.length === 1 ? '' : 's'} found. ${availableCount} available now.`;

    intents.forEach((intent) => {
      const card = document.createElement('article');
      card.className = 'recommendation-card';
      card.setAttribute('aria-labelledby', `goal-title-${intent.id}`);

      const title = document.createElement('h3');
      title.id = `goal-title-${intent.id}`;
      title.textContent = intent.title;
      card.appendChild(title);

      const description = document.createElement('p');
      description.textContent = intent.description;
      card.appendChild(description);

      const button = document.createElement('button');
      button.type = 'button';

      if (intent.capability.canRun) {
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

  async function runIntent(intent) {
    if (!currentSource || !currentInspection || !intent.capability.canRun) return;

    resetProgress();
    resetResults();
    activeJob = window.createJob(intent, currentFile || currentSource, currentInspection);
    activeJob.knowledgeModel = currentKnowledgeModel;
    activeJob.assessment = currentAssessment;
    renderProgress(activeJob);

    const runner = new window.WorkflowRunner({
      onUpdate: updateProgress,
      onComplete: completeProgress,
      onError: failProgress
    });

    progressSection.hidden = false;
    progressSection.focus();
    await runner.run(activeJob);
  }

  function renderProgress(job) {
    progressSection.hidden = false;
    jobStatus.textContent = `${job.intent.title} is starting.`;
    progressBar.style.width = '0%';
    progressSteps.innerHTML = job.intent.steps.map((step) => `
      <li data-step-status="pending">
        <span class="step-state">Waiting</span>
        <span>${escapeHtml(step)}</span>
      </li>
    `).join('');
  }

  function updateProgress(job, detail) {
    jobStatus.textContent = detail.message;
    progressBar.style.width = `${job.progress}%`;

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
    jobStatus.textContent = `${job.intent.title} finished. Your file is ready.`;
    progressBar.style.width = '100%';

    Array.from(progressSteps.children).forEach((item) => {
      item.dataset.stepStatus = 'done';
      item.querySelector('.step-state').textContent = 'Done';
    });

    renderResults(job);
  }

  function failProgress(job, error) {
    jobStatus.textContent = `This action could not be completed. ${error.message}`;
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

  urlForm.addEventListener('submit', (event) => {
    event.preventDefault();
    handleUrl(urlInput.value);
  });
})();
