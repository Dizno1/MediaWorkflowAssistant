(function () {
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const statusRegion = document.getElementById('status-region');
  const inspectionOutput = document.getElementById('inspection-output');
  const recommendationsSection = document.getElementById('recommendations-section');
  const recommendationsIntro = document.getElementById('recommendations-intro');
  const recommendations = document.getElementById('recommendations');
  const workflowSection = document.getElementById('workflow-section');
  const workflowPreview = document.getElementById('workflow-preview');
  const progressSection = document.getElementById('progress-section');
  const jobStatus = document.getElementById('job-status');
  const progressBar = document.getElementById('progress-bar');
  const progressSteps = document.getElementById('progress-steps');
  const resultsSection = document.getElementById('results-section');
  const resultsOutput = document.getElementById('results-output');
  const fileHelp = document.getElementById('file-help');

  let currentInspection = null;
  let currentFile = null;
  let activeWorkflow = null;
  let activeJob = null;

  function setStatus(message) {
    statusRegion.textContent = message;
  }

  async function handleFile(file) {
    if (!file) return;

    currentFile = file;
    currentInspection = null;
    activeWorkflow = null;
    activeJob = null;

    resetWorkflow();
    resetProgress();
    resetResults();

    fileHelp.textContent = `${file.name} selected. The file stays on this device and is inspected in your browser.`;
    dropZone.querySelector('strong').textContent = file.name;
    dropZone.querySelector('span').textContent = 'Press Enter to choose a different file';

    setStatus(`Analyzing ${file.name}.`);
    inspectionOutput.hidden = false;
    inspectionOutput.innerHTML = '<p class="muted">Analyzing media...</p>';

    try {
      currentInspection = await window.MediaInspector.inspect(file);
      renderInspection(currentInspection);
      renderRecommendations(currentInspection);
      setStatus(`${currentInspection.recommendedSummary} Recommended actions are available.`);
    } catch (error) {
      console.error(error);
      setStatus('The file could not be inspected. Try another file.');
      inspectionOutput.innerHTML = '<p role="alert">The file could not be inspected. Try another file.</p>';
    }
  }

  function renderInspection(inspection) {
    const details = [
      ['File name', inspection.name],
      ['Media type', titleCase(inspection.mediaType)],
      ['File size', inspection.sizeLabel],
      ['Duration', inspection.durationLabel],
      ['Dimensions', inspection.dimensionsLabel],
      ['Contains audio', yesNo(inspection.hasAudio)],
      ['Contains video', yesNo(inspection.hasVideo)],
      ['Contains images', yesNo(inspection.hasImages)],
      ['Readable text likely', yesNo(inspection.hasReadableText)],
      ['Captions detected', yesNo(inspection.hasCaptions)],
      ['File extension', inspection.extension],
      ['MIME type', inspection.mimeType],
      ['Last modified', inspection.lastModified]
    ];

    inspectionOutput.innerHTML = `
      <p class="inspection-summary">${escapeHtml(inspection.recommendedSummary)}</p>
      <div class="inspection-grid" aria-label="Media inspection details">
        ${details.map(([label, value]) => fact(label, value)).join('')}
      </div>
    `;
  }

  function fact(label, value) {
    return `<div class="fact"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
  }

  function renderRecommendations(inspection) {
    const recommended = window.WorkflowRegistry.getRecommendations(inspection);
    recommendations.innerHTML = '';
    recommendationsSection.hidden = false;

    if (!recommended.length) {
      recommendationsIntro.textContent = 'No available outcomes were found for this file yet.';
      return;
    }

    recommendationsIntro.textContent = `${recommended.length} available outcome${recommended.length === 1 ? '' : 's'} found.`;

    recommended.forEach((workflow) => {
      const card = document.createElement('article');
      card.className = 'recommendation-card';
      card.setAttribute('aria-labelledby', `workflow-title-${workflow.id}`);

      const category = document.createElement('p');
      category.className = 'category-label';
      category.textContent = workflow.category;
      card.appendChild(category);

      const title = document.createElement('h3');
      title.id = `workflow-title-${workflow.id}`;
      title.textContent = workflow.name;
      card.appendChild(title);

      const description = document.createElement('p');
      description.id = `workflow-desc-${workflow.id}`;
      description.textContent = workflow.description;
      card.appendChild(description);

      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = 'Review workflow';
      button.setAttribute('aria-label', `Review ${workflow.name} workflow`);
      button.addEventListener('click', () => renderWorkflow(workflow));
      card.appendChild(button);

      recommendations.appendChild(card);
    });
  }

  function renderWorkflow(workflow) {
    activeWorkflow = workflow;
    const capability = window.ProviderManager.getCapability(workflow);

    resetProgress();
    resetResults();

    workflowSection.hidden = false;
    workflowPreview.innerHTML = `
      <article class="workflow-card" aria-labelledby="workflow-${workflow.id}-heading">
        <p class="category-label">${escapeHtml(workflow.category)}</p>
        <h3 id="workflow-${workflow.id}-heading">${escapeHtml(workflow.name)}</h3>
        <p>${escapeHtml(workflow.description)}</p>

        <div class="provider-status ${capability.canRun ? 'is-ready' : 'is-planned'}" role="note">
          <h4>Provider status</h4>
          <p><strong>${escapeHtml(capability.status)}:</strong> ${escapeHtml(capability.message)}</p>
          ${capability.provider ? `<p class="muted">Provider: ${escapeHtml(capability.provider.name)}. Type: ${escapeHtml(capability.provider.kind)}.</p>` : ''}
        </div>

        <h4>Workflow steps</h4>
        <ol>
          ${workflow.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join('')}
        </ol>
        <h4>Expected output</h4>
        <ul>
          ${workflow.outputs.map((output) => `<li>${escapeHtml(output)}</li>`).join('')}
        </ul>
        <button type="button" id="run-workflow">${capability.canRun ? 'Run workflow' : 'Build planned job'}</button>
        <p class="muted">${capability.canRun ? 'This workflow can run in the current browser prototype.' : 'This workflow will run as a planned job so the engine, progress, results, and provider handoff can be tested before desktop processing is connected.'}</p>
      </article>
    `;

    document.getElementById('run-workflow').addEventListener('click', () => runActiveWorkflow(capability));
    setStatus(`${workflow.name} workflow ready. ${capability.status}.`);
    workflowSection.focus();
  }

  async function runActiveWorkflow(capability) {
    if (!activeWorkflow || !currentFile || !currentInspection) return;

    activeJob = window.createJob(activeWorkflow, currentFile, currentInspection, capability);
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
    jobStatus.textContent = `${job.workflow.name} is ready to start using ${job.provider ? job.provider.name : 'no provider'}.`;
    progressBar.style.width = '0%';
    progressSteps.innerHTML = job.workflow.steps.map((step) => `
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
    const resultWord = job.outputs.length === 1 ? 'result' : 'results';
    const verb = job.status === 'completed' ? 'completed' : 'planned';
    jobStatus.textContent = `${job.workflow.name} ${verb}. ${job.outputs.length} ${resultWord} available.`;
    progressBar.style.width = '100%';

    Array.from(progressSteps.children).forEach((item) => {
      item.dataset.stepStatus = 'done';
      item.querySelector('.step-state').textContent = 'Done';
    });

    renderResults(job);
  }

  function failProgress(job, error) {
    jobStatus.textContent = `${job.workflow.name} failed. ${error.message}`;
  }

  function renderResults(job) {
    resultsSection.hidden = false;

    const durationLabel = window.formatJobDuration(job.durationMs);
    const statusLabel = job.status === 'completed' ? 'Completed' : job.status === 'planned' ? 'Planned' : titleCase(job.status);
    const providerLabel = job.provider ? job.provider.name : 'No provider';
    const downloadableCount = job.outputs.filter((output) => output.url).length;

    resultsOutput.innerHTML = `
      <section class="result-explanation" aria-labelledby="result-explanation-heading">
        <h3 id="result-explanation-heading">What happened</h3>
        <p>
          ${escapeHtml(job.workflow.name)} finished. The app created ${job.outputs.length} artifact${job.outputs.length === 1 ? '' : 's'} from the inspected file metadata.
          ${downloadableCount ? `${downloadableCount} artifact${downloadableCount === 1 ? ' is' : 's are'} ready to download.` : 'No downloadable artifact was created yet.'}
        </p>
        <p class="muted">Nothing is uploaded. Browser-created files appear in your Downloads folder only after you activate a Download button.</p>
      </section>

      <dl class="job-summary">
        <div>
          <dt>Workflow</dt>
          <dd>${escapeHtml(job.workflow.name)}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>${escapeHtml(statusLabel)}</dd>
        </div>
        <div>
          <dt>Provider</dt>
          <dd>${escapeHtml(providerLabel)}</dd>
        </div>
        <div>
          <dt>Duration</dt>
          <dd>${escapeHtml(durationLabel)}</dd>
        </div>
        <div>
          <dt>Source file</dt>
          <dd>${escapeHtml(job.sourceFileName)}</dd>
        </div>
      </dl>

      <h3>Artifacts</h3>
      <ul class="results-list">
        ${job.outputs.map((output, index) => `
          <li>
            <strong>${escapeHtml(output.name)}</strong>
            <span>${escapeHtml(output.type)}. ${escapeHtml(output.status)}.</span>
            <p>${escapeHtml(output.description)}</p>
            <p class="muted">Provider: ${escapeHtml(output.provider)}</p>
            ${output.url ? `<button type="button" data-download-index="${index}">Download ${escapeHtml(output.name)}</button>` : '<p class="muted">Download is not available for this artifact yet.</p>'}
            ${output.content ? `<button type="button" data-preview-index="${index}">Preview text for ${escapeHtml(output.name)}</button>` : ''}
            ${output.content ? `<button type="button" data-copy-index="${index}">Copy text for ${escapeHtml(output.name)}</button>` : ''}
          </li>
        `).join('')}
      </ul>

      <section id="artifact-preview" class="artifact-preview" aria-labelledby="artifact-preview-heading" hidden>
        <h3 id="artifact-preview-heading">Artifact preview</h3>
        <pre id="artifact-preview-content" tabindex="0"></pre>
      </section>

      <div class="next-actions" aria-label="Next actions">
        <button type="button" id="choose-another-workflow">Choose another workflow for this file</button>
        <button type="button" id="process-another-file">Process another file</button>
      </div>
    `;

    Array.from(resultsOutput.querySelectorAll('[data-download-index]')).forEach((button) => {
      button.addEventListener('click', () => {
        const index = Number(button.getAttribute('data-download-index'));
        const artifact = job.outputs[index];

        try {
          window.ProviderManager.downloadArtifact(artifact);
          setStatus(`${artifact.name} download started. Check your browser Downloads folder.`);
        } catch (error) {
          setStatus(error.message);
        }
      });
    });

    Array.from(resultsOutput.querySelectorAll('[data-preview-index]')).forEach((button) => {
      button.addEventListener('click', () => {
        const index = Number(button.getAttribute('data-preview-index'));
        const artifact = job.outputs[index];
        const preview = document.getElementById('artifact-preview');
        const previewContent = document.getElementById('artifact-preview-content');

        preview.hidden = false;
        previewContent.textContent = artifact.content || 'No preview content is available.';
        setStatus(`${artifact.name} preview loaded.`);
        previewContent.focus();
      });
    });

    Array.from(resultsOutput.querySelectorAll('[data-copy-index]')).forEach((button) => {
      button.addEventListener('click', async () => {
        const index = Number(button.getAttribute('data-copy-index'));
        const artifact = job.outputs[index];

        try {
          await navigator.clipboard.writeText(artifact.content || '');
          setStatus(`${artifact.name} text copied to clipboard.`);
        } catch (error) {
          setStatus('Copy failed. Use the preview button and copy the text manually.');
        }
      });
    });

    document.getElementById('choose-another-workflow').addEventListener('click', () => {
      recommendationsSection.focus();
    });

    document.getElementById('process-another-file').addEventListener('click', () => {
      fileInput.click();
    });

    resultsSection.focus();
  }

  function resetWorkflow() {
    workflowPreview.textContent = 'Select a recommended action to preview its workflow steps.';
    workflowSection.hidden = true;
  }

  function resetProgress() {
    progressSection.hidden = true;
    jobStatus.textContent = 'No workflow running.';
    progressBar.style.width = '0%';
    progressSteps.innerHTML = '';
  }

  function resetResults() {
    resultsSection.hidden = true;
    resultsOutput.textContent = 'No results yet.';
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
      setStatus('Drop the file to inspect it.');
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
})();
