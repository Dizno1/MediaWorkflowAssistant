(function () {
  class BrowserProvider {
    constructor() {
      this.id = 'browser';
      this.name = 'Browser Provider';
    }

    initialize() {
      return true;
    }

    canRun(job) {
      return job.workflow.id === 'prepare-for-ai';
    }

    async execute(job) {
      if (!this.canRun(job)) {
        throw new Error(`${this.name} cannot run ${job.workflow.name}.`);
      }

      const markdown = this.buildAiPackage(job);
      const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const baseName = stripExtension(job.sourceFileName);

      return [
        {
          name: `${baseName}-ai-package.md`,
          type: 'AI preparation package',
          description: 'Markdown package created in the browser from the inspected media metadata.',
          provider: this.name,
          status: 'Created',
          url,
          mimeType: 'text/markdown',
          content: markdown
        }
      ];
    }

    downloadArtifact(artifact) {
      if (!artifact || !artifact.url) {
        throw new Error('This artifact does not have a downloadable file yet.');
      }

      const link = document.createElement('a');
      link.href = artifact.url;
      link.download = artifact.name || 'media-workflow-artifact.md';
      document.body.appendChild(link);
      link.click();
      link.remove();
    }

    buildAiPackage(job) {
      const inspection = job.inspection || {};
      const recommendations = window.WorkflowRegistry
        ? window.WorkflowRegistry.getRecommendations(inspection).map((workflow) => workflow.name)
        : [];

      const rows = [
        ['File name', job.sourceFileName],
        ['Media type', titleCase(inspection.mediaType || 'unknown')],
        ['File size', inspection.sizeLabel || 'Unknown'],
        ['Duration', inspection.durationLabel || 'Unknown'],
        ['Dimensions', inspection.dimensionsLabel || 'Unknown'],
        ['Contains audio', yesNo(inspection.hasAudio)],
        ['Contains video', yesNo(inspection.hasVideo)],
        ['Contains images', yesNo(inspection.hasImages)],
        ['Readable text likely', yesNo(inspection.hasReadableText)],
        ['Captions detected', yesNo(inspection.hasCaptions)],
        ['MIME type', inspection.mimeType || 'Unknown'],
        ['File extension', inspection.extension || 'Unknown']
      ];

      return [
        '# AI Preparation Package',
        '',
        '## Source',
        '',
        `- File: ${job.sourceFileName}`,
        `- Workflow: ${job.workflow.name}`,
        `- Provider: ${this.name}`,
        `- Generated: ${new Date().toLocaleString()}`,
        '',
        '## Inspection Summary',
        '',
        inspection.recommendedSummary || 'No inspection summary was available.',
        '',
        '## Media Details',
        '',
        ...rows.map(([label, value]) => `- ${label}: ${value}`),
        '',
        '## Available Outcomes',
        '',
        ...(recommendations.length ? recommendations.map((name) => `- ${name}`) : ['- No recommendations were available.']),
        '',
        '## Suggested AI Prompts',
        '',
        'Use one of these prompts with the media file, transcript, or extracted content:',
        '',
        '1. Summarize this media in plain language and identify the main purpose.',
        '2. Identify accessibility issues or production concerns that may affect screen reader users, caption users, or audio description users.',
        '3. Create a concise description of this media for someone deciding whether it is relevant.',
        '4. List likely next workflow steps, such as transcript, captions, audio description, compression, or review.',
        '',
        '## Notes',
        '',
        'This package was generated locally in the browser. The original media file was not uploaded by this prototype.',
        ''
      ].join('\n');
    }
  }

  function stripExtension(fileName) {
    return String(fileName || 'media').replace(/\.[^/.]+$/, '');
  }

  function yesNo(value) {
    return value ? 'Yes' : 'No';
  }

  function titleCase(value) {
    return String(value).replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  window.BrowserProvider = BrowserProvider;
})();
