(function () {
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const statusRegion = document.getElementById('status-region');
  const inspectionOutput = document.getElementById('inspection-output');
  const recommendations = document.getElementById('recommendations');
  const workflowPreview = document.getElementById('workflow-preview');

  function setStatus(message) {
    statusRegion.textContent = message;
  }

  function handleFile(file) {
    if (!file) return;
    setStatus(`Analyzing ${file.name}.`);
    const inspection = window.MediaInspector.inspect(file);
    renderInspection(inspection);
    renderRecommendations(inspection);
    setStatus(`I found a ${inspection.mediaType} file named ${inspection.name}. Recommended actions are available.`);
  }

  function renderInspection(inspection) {
    inspectionOutput.hidden = false;
    inspectionOutput.innerHTML = `
      <div class="inspection-grid" aria-label="Media inspection details">
        ${fact('File name', inspection.name)}
        ${fact('Media type', titleCase(inspection.mediaType))}
        ${fact('File size', inspection.sizeLabel)}
        ${fact('File extension', inspection.extension)}
        ${fact('MIME type', inspection.mimeType)}
        ${fact('Last modified', inspection.lastModified)}
      </div>
    `;
  }

  function fact(label, value) {
    return `<div class="fact"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
  }

  function renderRecommendations(inspection) {
    const recommended = window.WorkflowRegistry.getRecommendations(inspection);
    recommendations.innerHTML = '';

    if (!recommended.length) {
      recommendations.textContent = 'No recommendations are available for this file yet.';
      return;
    }

    recommended.forEach((workflow) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = workflow.name;
      button.setAttribute('aria-describedby', `workflow-desc-${workflow.id}`);
      button.addEventListener('click', () => renderWorkflow(workflow));

      const wrapper = document.createElement('div');
      wrapper.appendChild(button);

      const description = document.createElement('p');
      description.id = `workflow-desc-${workflow.id}`;
      description.className = 'muted';
      description.textContent = workflow.description;
      wrapper.appendChild(description);

      recommendations.appendChild(wrapper);
    });
  }

  function renderWorkflow(workflow) {
    workflowPreview.innerHTML = `
      <article class="workflow-card" aria-labelledby="workflow-${workflow.id}-heading">
        <h3 id="workflow-${workflow.id}-heading">${escapeHtml(workflow.name)}</h3>
        <p>${escapeHtml(workflow.description)}</p>
        <ol>
          ${workflow.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join('')}
        </ol>
        <p class="muted">This is a preview only. Processing will be added after the inspector and workflow shell are stable.</p>
      </article>
    `;
    setStatus(`${workflow.name} workflow preview loaded.`);
  }

  function titleCase(value) {
    return String(value).replace(/\b\w/g, (letter) => letter.toUpperCase());
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
