(function () {
  class BrowserProvider {
    constructor() {
      this.id = 'browser';
      this.name = 'Browser Provider';
      this.supportedWorkflows = ['prepare-for-ai', 'compress-video', 'extract-audio', 'create-transcript', 'create-captions', 'audio-description'];
    }

    initialize() {
      return true;
    }

    canRun(job) {
      return Boolean(
        job &&
        job.workflow &&
        this.supportedWorkflows.includes(job.workflow.id) &&
        (job.workflow.id === 'prepare-for-ai' || isLocalFile(job.sourceFile))
      );
    }

    async execute(job) {
      if (!this.canRun(job)) {
        throw new Error('This action needs a file from your device. Web addresses cannot be processed yet.');
      }

      if (job.workflow.id === 'compress-video') {
        return this.createSmallerVideo(job);
      }

      if (job.workflow.id === 'extract-audio') {
        return this.createAudioCopy(job);
      }

      if (job.workflow.id === 'create-transcript') {
        return this.createTranscriptWorkspace(job);
      }

      if (job.workflow.id === 'create-captions') {
        return this.createCaptionWorkspace(job);
      }

      if (job.workflow.id === 'audio-description') {
        return this.createDescriptionWorkspace(job);
      }

      return this.createFileInformation(job);
    }

    createFileInformation(job) {
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

    async createSmallerVideo(job) {
      ensureRecordingSupport();
      const file = job.sourceFile;
      const result = await recordMedia(file, {
        mediaKind: 'video',
        mimeTypes: [
          'video/webm;codecs=vp9,opus',
          'video/webm;codecs=vp8,opus',
          'video/webm'
        ],
        recorderOptions: {
          videoBitsPerSecond: chooseVideoBitrate(job.inspection),
          audioBitsPerSecond: 96000
        }
      });
      const baseName = stripExtension(file.name);
      const name = `${baseName}-smaller.webm`;

      return [
        {
          name,
          type: 'Smaller video copy',
          description: `A browser-compatible WebM copy was created. Original size: ${job.inspection.sizeLabel}. New size: ${formatBytes(result.blob.size)}.`,
          provider: this.name,
          status: 'Created',
          url: URL.createObjectURL(result.blob),
          mimeType: result.blob.type || 'video/webm'
        }
      ];
    }

    async createAudioCopy(job) {
      ensureRecordingSupport();
      const file = job.sourceFile;
      const result = await recordMedia(file, {
        mediaKind: 'audio',
        mimeTypes: [
          'audio/webm;codecs=opus',
          'audio/ogg;codecs=opus',
          'audio/webm'
        ],
        recorderOptions: {
          audioBitsPerSecond: 128000
        }
      });
      const extension = result.blob.type.includes('ogg') ? 'ogg' : 'webm';
      const baseName = stripExtension(file.name);
      const name = `${baseName}-audio.${extension}`;

      return [
        {
          name,
          type: 'Audio-only copy',
          description: `The audio track was saved as a separate ${extension.toUpperCase()} file. Size: ${formatBytes(result.blob.size)}.`,
          provider: this.name,
          status: 'Created',
          url: URL.createObjectURL(result.blob),
          mimeType: result.blob.type || 'audio/webm'
        }
      ];
    }


    createTranscriptWorkspace(job) {
      const inspection = job.inspection || {};
      const baseName = stripExtension(job.sourceFileName);
      const text = [
        `Transcript worksheet for ${job.sourceFileName}`,
        '',
        `Duration: ${inspection.durationLabel || 'Unknown'}`,
        '',
        'Instructions',
        'Play the media in the viewer. Pause as needed and type the spoken words below.',
        'Identify speakers when that information is important. Include meaningful non-speech audio in brackets.',
        '',
        'Transcript',
        '',
        '[Begin typing here]',
        ''
      ].join('\n');
      return [createTextArtifact(`${baseName}-transcript.txt`, 'Transcript worksheet', 'An editable plain-text worksheet for creating a transcript while reviewing the media.', text, 'text/plain')];
    }

    createCaptionWorkspace(job) {
      const inspection = job.inspection || {};
      const baseName = stripExtension(job.sourceFileName);
      const worksheet = buildTimedWorksheet(job.sourceFileName, inspection.durationSeconds, 'Caption text', [
        'Use the viewer to find the beginning and end of each spoken phrase.',
        'Keep each caption concise and synchronized with the audio.',
        'Include meaningful sounds when they are needed to understand the media.'
      ]);
      const vtt = ['WEBVTT', '', 'NOTE Add caption cues using this pattern:', 'NOTE 00:00:00.000 --> 00:00:04.000', 'NOTE Caption text', ''].join('\n');
      return [
        createTextArtifact(`${baseName}-caption-workspace.md`, 'Caption worksheet', 'A timestamped worksheet for drafting and reviewing captions.', worksheet, 'text/markdown'),
        createTextArtifact(`${baseName}-captions.vtt`, 'WebVTT caption file', 'A valid WebVTT starter file ready for caption cues.', vtt, 'text/vtt')
      ];
    }

    createDescriptionWorkspace(job) {
      const inspection = job.inspection || {};
      const baseName = stripExtension(job.sourceFileName);
      const worksheet = buildTimedWorksheet(job.sourceFileName, inspection.durationSeconds, 'Description note', [
        'Review the video and note important visual information that is not already explained by the audio.',
        'Write descriptions in natural language and place them during pauses whenever possible.',
        'Do not describe decorative details that do not help someone understand the content.'
      ]);
      return [createTextArtifact(`${baseName}-audio-description-workspace.md`, 'Audio description worksheet', 'A timestamped worksheet for planning and reviewing audio description.', worksheet, 'text/markdown')];
    }

    downloadArtifact(artifact) {
      if (!artifact || !artifact.url) {
        throw new Error('This file is not available for download.');
      }

      const link = document.createElement('a');
      link.href = artifact.url;
      link.download = artifact.name || 'media-result';
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
        '- Requested action: Save information about this file',
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


  function createTextArtifact(name, type, description, content, mimeType) {
    const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
    return {
      name,
      type,
      description,
      provider: 'Browser Provider',
      status: 'Created',
      url: URL.createObjectURL(blob),
      mimeType,
      content
    };
  }

  function buildTimedWorksheet(fileName, durationSeconds, entryLabel, instructions) {
    const seconds = Number(durationSeconds);
    const safeDuration = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
    const interval = safeDuration > 1800 ? 120 : safeDuration > 600 ? 60 : 30;
    const timestamps = [];
    if (safeDuration) {
      for (let current = 0; current < safeDuration; current += interval) {
        timestamps.push(`- ${formatTimestamp(current)} - ${entryLabel}:`);
      }
      if (!timestamps.length || !timestamps[timestamps.length - 1].startsWith(`- ${formatTimestamp(safeDuration)}`)) {
        timestamps.push(`- ${formatTimestamp(safeDuration)} - End`);
      }
    } else {
      timestamps.push(`- 00:00 - ${entryLabel}:`);
    }

    return [
      `# ${entryLabel} workspace`,
      '',
      `Source: ${fileName}`,
      safeDuration ? `Duration: ${formatTimestamp(safeDuration)}` : 'Duration: Unknown',
      '',
      '## Instructions',
      '',
      ...instructions.map((item) => `- ${item}`),
      '',
      '## Notes by time',
      '',
      ...timestamps,
      ''
    ].join('\n');
  }

  function formatTimestamp(totalSeconds) {
    const rounded = Math.max(0, Math.floor(Number(totalSeconds) || 0));
    const hours = Math.floor(rounded / 3600);
    const minutes = Math.floor((rounded % 3600) / 60);
    const seconds = rounded % 60;
    return hours
      ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  function isLocalFile(value) {
    return typeof File !== 'undefined' && value instanceof File;
  }

  function ensureRecordingSupport() {
    if (typeof MediaRecorder === 'undefined') {
      throw new Error('This browser cannot create media files. Try the current version of Chrome or Edge.');
    }
  }

  function chooseVideoBitrate(inspection) {
    const width = Number(inspection && inspection.width) || 0;
    if (width >= 1920) return 1800000;
    if (width >= 1280) return 1200000;
    return 800000;
  }

  async function recordMedia(file, options) {
    const element = document.createElement(options.mediaKind === 'video' ? 'video' : 'audio');
    const sourceUrl = URL.createObjectURL(file);
    element.src = sourceUrl;
    element.preload = 'auto';
    element.playsInline = true;
    element.muted = true;
    element.className = 'processing-media';
    element.setAttribute('aria-hidden', 'true');
    document.body.appendChild(element);

    try {
      await waitForMedia(element);
      const capture = element.captureStream || element.mozCaptureStream;
      if (typeof capture !== 'function') {
        throw new Error('This browser cannot process this media file locally.');
      }

      const sourceStream = capture.call(element);
      const tracks = options.mediaKind === 'audio'
        ? sourceStream.getAudioTracks()
        : sourceStream.getTracks();

      if (!tracks.length) {
        throw new Error(options.mediaKind === 'audio'
          ? 'No audio track could be read from this video.'
          : 'No video track could be read from this file.');
      }

      const outputStream = new MediaStream(tracks);
      const mimeType = chooseMimeType(options.mimeTypes);
      const recorderOptions = { ...options.recorderOptions };
      if (mimeType) recorderOptions.mimeType = mimeType;

      const recorder = new MediaRecorder(outputStream, recorderOptions);
      const chunks = [];

      return await new Promise((resolve, reject) => {
        let settled = false;

        function cleanup() {
          element.pause();
          outputStream.getTracks().forEach((track) => track.stop());
          sourceStream.getTracks().forEach((track) => track.stop());
          URL.revokeObjectURL(sourceUrl);
          element.remove();
        }

        function fail(error) {
          if (settled) return;
          settled = true;
          cleanup();
          reject(error instanceof Error ? error : new Error('The file could not be processed.'));
        }

        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) chunks.push(event.data);
        };

        recorder.onerror = () => fail(recorder.error || new Error('The browser stopped processing the file.'));

        recorder.onstop = () => {
          if (settled) return;
          settled = true;
          const type = recorder.mimeType || mimeType || (options.mediaKind === 'video' ? 'video/webm' : 'audio/webm');
          const blob = new Blob(chunks, { type });
          cleanup();
          if (!blob.size) {
            reject(new Error('The browser did not create a usable media file.'));
            return;
          }
          resolve({ blob });
        };

        element.onended = () => {
          if (recorder.state !== 'inactive') recorder.stop();
        };
        element.onerror = () => fail(new Error('The browser could not read this media file.'));

        try {
          recorder.start(1000);
          const playPromise = element.play();
          if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(() => fail(new Error('The browser could not start processing the file.')));
          }
        } catch (error) {
          fail(error);
        }
      });
    } catch (error) {
      URL.revokeObjectURL(sourceUrl);
      element.remove();
      throw error;
    }
  }

  function waitForMedia(element) {
    return new Promise((resolve, reject) => {
      if (element.readyState >= 2) {
        resolve();
        return;
      }
      const timeout = window.setTimeout(() => reject(new Error('The media file took too long to open.')), 15000);
      element.onloadeddata = () => {
        window.clearTimeout(timeout);
        resolve();
      };
      element.onerror = () => {
        window.clearTimeout(timeout);
        reject(new Error('The browser could not open this media file.'));
      };
      element.load();
    });
  }

  function chooseMimeType(types) {
    if (!MediaRecorder.isTypeSupported) return '';
    return types.find((type) => MediaRecorder.isTypeSupported(type)) || '';
  }

  function stripExtension(fileName) {
    return String(fileName || 'media').replace(/\.[^/.]+$/, '');
  }

  function formatBytes(bytes) {
    if (window.MediaInspector && typeof window.MediaInspector.formatBytes === 'function') {
      return window.MediaInspector.formatBytes(bytes);
    }
    return `${bytes} bytes`;
  }

  function yesNo(value) {
    return value ? 'Yes' : 'No';
  }

  function titleCase(value) {
    return String(value).replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  window.BrowserProvider = BrowserProvider;
})();
