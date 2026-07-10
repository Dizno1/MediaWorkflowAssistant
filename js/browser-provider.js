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

      const markdown = this.buildFileInformation(job);
      const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const baseName = stripExtension(job.sourceFileName);

      return [
        {
          name: `${baseName}-file-information.md`,
          type: 'Media file information',
          description: 'Readable file containing the media details and available next steps.',
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

    buildFileInformation(job) {
      const inspection = job.inspection || {};
      const recommendations = window.IntentEngine
        ? window.IntentEngine.getIntents(inspection).map((intent) => intent.title)
        : [];

      const rows = [
        [inspection.sourceType === 'url' ? 'Web address' : 'File name', inspection.sourceType === 'url' ? inspection.sourceUrl : job.sourceFileName],
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
        '# Media File Information',
        '',
        '## Source',
        '',
        inspection.sourceType === 'url' ? `- Web address: ${inspection.sourceUrl}` : `- File: ${job.sourceFileName}`, 
        `- Requested action: Save information about this file`,
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
        '## Available Choices',
        '',
        ...(recommendations.length ? recommendations.map((name) => `- ${name}`) : ['- No recommendations were available.']),
        '',
        '## Helpful Questions',
        '',
        'These questions may help you decide what to do next:',
        '',
        '1. Do I need captions or a transcript?',
        '2. Is important visual information missing from the audio?',
        '3. Does the file need to be smaller before I share it?',
        '4. Do I need an audio-only copy?',
        '',
        '## Notes',
        '',
        inspection.sourceType === 'url'
          ? 'This information file was generated in the browser from the web address. The linked media was not copied or uploaded.'
          : 'This information file was generated locally in the browser. The original media file was not uploaded.',
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
