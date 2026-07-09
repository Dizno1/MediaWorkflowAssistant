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

  let currentInspection = null;

  function setStatus(message) {
    statusRegion.textContent = message;
  }

  async function handleFile(file) {
    if (!file) return;

    resetWorkflow();
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
      recommendationsIntro.textContent = 'No recommendations are available for this file yet.';
      return;
    }

    recommendationsIntro.textContent = `${recommended.length} recommended action${recommended.length === 1 ? '' : 's'} found. Choose an outcome to preview the workflow.`;

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
      button.textContent = `Preview ${workflow.name}`;
      button.setAttribute('aria-describedby', `workflow-desc-${workflow.id}`);
      button.addEventListener('click', () => renderWorkflow(workflow));
      card.appendChild(button);

      recommendations.appendChild(card);
    });
  }

  function renderWorkflow(workflow) {
    workflowSection.hidden = false;
    workflowPreview.innerHTML = `
      <article class="workflow-card" aria-labelledby="workflow-${workflow.id}-heading">
        <p class="category-label">${escapeHtml(workflow.category)}</p>
        <h3 id="workflow-${workflow.id}-heading">${escapeHtml(workflow.name)}</h3>
        <p>${escapeHtml(workflow.description)}</p>
        <h4>Workflow steps</h4>
        <ol>
          ${workflow.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join('')}
        </ol>
        <h4>Expected output</h4>
        <ul>
          ${workflow.outputs.map((output) => `<li>${escapeHtml(output)}</li>`).join('')}
        </ul>
        <p class="muted">This is a preview only. Real processing begins in the next implementation sprint.</p>
      </article>
    `;
    setStatus(`${workflow.name} workflow preview loaded.`);
    workflowSection.focus();
  }

  function resetWorkflow() {
    workflowPreview.textContent = 'Select a recommended action to preview its workflow steps.';
    workflowSection.hidden = true;
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
