(function () {
  class BrowserProvider {
    constructor() {
      this.id = 'browser';
      this.name = 'Browser Provider';
      this.supportedWorkflows = ['prepare-for-ai', 'accessibility-package', 'compress-video', 'extract-audio', 'create-transcript', 'create-captions', 'audio-description', 'generate-alt-text'];
    }

    initialize() {
      return true;
    }

    canRun(job) {
      return Boolean(
        job &&
        job.workflow &&
        this.supportedWorkflows.includes(job.workflow.id) &&
        (['prepare-for-ai', 'accessibility-package'].includes(job.workflow.id) || isLocalFile(job.sourceFile))
      );
    }

    async execute(job, onProgress) {
      if (!this.canRun(job)) {
        throw new Error('This action needs a file from your device. Web addresses cannot be processed yet.');
      }


      if (job.workflow.id === 'accessibility-package') {
        return this.createAccessibilityPackage(job, onProgress);
      }

      if (job.workflow.id === 'compress-video') {
        return this.createSmallerVideo(job);
      }

      if (job.workflow.id === 'extract-audio') {
        return this.createAudioCopy(job, onProgress);
      }

      if (job.workflow.id === 'create-transcript') {
        return this.createTranscript(job);
      }

      if (job.workflow.id === 'create-captions') {
        return this.createCaptions(job);
      }

      if (job.workflow.id === 'audio-description') {
        return this.createDescriptionWorkspace(job);
      }

      if (job.workflow.id === 'generate-alt-text') {
        return this.createImageDescription(job);
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

    async createAudioCopy(job, onProgress) {
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
        },
        signal: job.abortController ? job.abortController.signal : null,
        onProgress
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
          mimeType: result.blob.type || 'audio/webm',
          size: result.blob.size,
          durationSeconds: Number(job.inspection.durationSeconds) || null
        }
      ];
    }


    createTranscript(job) {
      const options = job.transcriptOptions || {};
      const transcriptText = String(options.text || '').trim();
      if (!transcriptText) throw new Error('Enter transcript text before running this workflow.');
      const baseName = stripExtension(job.sourceFileName);
      const title = String(options.title || `Transcript for ${job.sourceFileName}`).trim();
      const text = [title, '', `Source: ${job.sourceFileName}`, `Created: ${new Date().toLocaleString()}`, `Reviewed: ${options.reviewed ? 'Yes' : 'No'}`, '', description, ''].join('\n');
      return [createTextArtifact(`${baseName}-transcript.txt`, 'Completed transcript', `A reviewed plain-text transcript containing ${Number(options.wordCount) || transcriptText.split(/\s+/).length} words.`, text, 'text/plain')];
    }

    createCaptions(job) {
      const options = job.captionOptions || {};
      const cues = Array.isArray(options.cues) ? options.cues : [];
      if (!cues.length || !String(options.webVtt || '').trim()) throw new Error('Enter and review at least one caption cue before running this workflow.');
      const baseName = stripExtension(job.sourceFileName);
      const worksheet = [
        `# Caption Review Record for ${job.sourceFileName}`,
        '',
        `Title: ${options.title || `Captions for ${job.sourceFileName}`}`,
        `Reviewed: ${options.reviewed ? 'Yes' : 'No'}`,
        `Reviewed at: ${options.reviewedAt || new Date().toISOString()}`,
        `Cue count: ${cues.length}`,
        '',
        ...cues.flatMap((cue, index) => [`## Cue ${index + 1}`, `${cue.start} --> ${cue.end}`, cue.text, ''])
      ].join('\n');
      return [
        createTextArtifact(`${baseName}-captions.vtt`, 'Completed WebVTT captions', `A reviewed WebVTT caption file containing ${cues.length} timed cue${cues.length === 1 ? '' : 's'}.`, options.webVtt, 'text/vtt'),
        createTextArtifact(`${baseName}-caption-review.md`, 'Caption review record', 'A readable record of the completed caption cues and review confirmation.', worksheet, 'text/markdown')
      ];
    }


    createImageDescription(job) {
      const options = job.imageDescriptionOptions || {};
      const description = String(options.description || '').trim();
      if (!description) throw new Error('Enter and review an image description before running this workflow.');
      const baseName = stripExtension(job.sourceFileName);
      const title = String(options.title || `Image description for ${job.sourceFileName}`).trim();
      const text = [title, '', `Source: ${job.sourceFileName}`, `Created: ${new Date().toLocaleString()}`, `Reviewed: ${options.reviewed ? 'Yes' : 'No'}`, '', description, ''].join('\n');
      return [createTextArtifact(`${baseName}-image-description.txt`, 'Reviewed image description', 'A reviewed plain-text description suitable for adaptation as alt text or a longer image description.', text, 'text/plain')];
    }

    createDescriptionWorkspace(job) {
      const options = job.audioDescriptionOptions || {};
      const cues = Array.isArray(options.cues) ? options.cues : [];
      if (!cues.length || !String(options.scriptMarkdown || '').trim()) throw new Error('Enter and review at least one audio description cue before running this workflow.');
      const baseName = stripExtension(job.sourceFileName);
      const reviewRecord = [
        `# Audio Description Review Record for ${job.sourceFileName}`,
        '',
        `Reviewed: ${options.reviewed ? 'Yes' : 'No'}`,
        `Reviewed at: ${options.reviewedAt || new Date().toISOString()}`,
        `Description cues: ${cues.length}`,
        '',
        'The script was reviewed for visual relevance, objective language, timing, dialogue conflicts, and preservation of essential sound.',
        ''
      ].join('\n');
      return [
        createTextArtifact(`${baseName}-audio-description-script.md`, 'Completed audio description script', `A reviewed, timestamped audio description script containing ${cues.length} narration cue${cues.length === 1 ? '' : 's'}.`, options.scriptMarkdown, 'text/markdown'),
        createTextArtifact(`${baseName}-audio-description-review.md`, 'Audio description review record', 'A readable record of the completed script review.', reviewRecord, 'text/markdown')
      ];
    }

    async createAccessibilityPackage(job, onProgress) {
      const model = job.knowledgeModel || {};
      const source = model.source || {};
      const sourceName = job.sourceFileName || source.name || 'media-source';
      const baseName = stripExtension(sourceName).replace(/[^a-z0-9._-]+/gi, '-').replace(/^-+|-+$/g, '') || 'media-source';
      const allRuntimeArtifacts = window.OutputManager
        .listForSource(source)
        .filter((artifact) => artifact.workflowId !== 'accessibility-package');
      const exportOptions = job.exportOptions || {};
      const selectedArtifactIds = Array.isArray(exportOptions.selectedArtifactIds) ? new Set(exportOptions.selectedArtifactIds) : null;
      const runtimeArtifacts = selectedArtifactIds
        ? allRuntimeArtifacts.filter((artifact) => selectedArtifactIds.has(artifact.id))
        : allRuntimeArtifacts;
      const persistentArtifacts = Array.isArray(model.results)
        ? model.results.filter((artifact) => artifact.workflowId !== 'accessibility-package')
        : [];
      const history = Array.isArray(model.history) ? model.history : [];
      const completedHistory = history.filter((entry) => entry.status === 'completed' && entry.workflowId !== 'accessibility-package');
      const planSteps = job.accessibilityPlan && Array.isArray(job.accessibilityPlan.steps) ? job.accessibilityPlan.steps : [];
      const remainingGaps = planSteps.filter((step) => step.status !== 'complete').map((step) => ({
        title: step.title,
        purpose: step.purpose,
        status: step.status,
        availability: step.availability
      }));
      const followUpActions = remainingGaps.map((gap) => `${gap.title}: ${gap.availability}`);
      const availableNames = new Set(runtimeArtifacts.map((artifact) => artifact.name));
      const unavailableArtifacts = persistentArtifacts.filter((artifact) => !availableNames.has(artifact.name));
      const generatedAt = new Date().toISOString();

      if (onProgress) onProgress({ progress: 15, message: 'Collected Shared Knowledge and workflow history.' });

      const manifest = {
        packageVersion: 2,
        exportReview: {
          reviewedAt: exportOptions.reviewedAt || generatedAt,
          privacyConfirmed: Boolean(exportOptions.privacyConfirmed),
          selectedArtifactIds: runtimeArtifacts.map((artifact) => artifact.id),
          excludedArtifactNames: allRuntimeArtifacts.filter((artifact) => !runtimeArtifacts.includes(artifact)).map((artifact) => artifact.name)
        },
        generatedAt,
        source: {
          name: sourceName,
          type: source.type || source.sourceType || 'file',
          mediaType: source.mediaType || job.inspection.mediaType || 'unknown',
          mimeType: source.mimeType || job.inspection.mimeType || '',
          size: Number.isFinite(source.size) ? source.size : null,
          durationSeconds: Number.isFinite(source.durationSeconds) ? source.durationSeconds : null
        },
        completedAccessibilityWork: completedHistory.map((entry) => ({
          workflowId: entry.workflowId,
          title: entry.title,
          completedAt: entry.completedAt,
          artifactNames: entry.artifactNames || []
        })),
        includedFiles: runtimeArtifacts.map((artifact) => ({
          name: artifact.name,
          type: artifact.type,
          mimeType: artifact.mimeType,
          workflowId: artifact.workflowId,
          createdAt: artifact.createdAt
        })),
        recordedButUnavailableFiles: unavailableArtifacts.map((artifact) => ({
          name: artifact.name,
          type: artifact.type,
          workflowId: artifact.workflowId,
          createdAt: artifact.createdAt,
          reason: 'The browser remembers this output, but its temporary file data is no longer available in this session.'
        })),
        remainingGaps,
        workflowHistory: history,
        recommendedFollowUpActions: followUpActions
      };

      const markdown = buildAccessibilityManifest(manifest);
      const entries = [
        { name: 'manifest.md', data: new TextEncoder().encode(markdown) },
        { name: 'manifest.json', data: new TextEncoder().encode(JSON.stringify(manifest, null, 2)) }
      ];

      if (onProgress) onProgress({ progress: 35, message: 'Created the readable package manifest.' });

      for (let index = 0; index < runtimeArtifacts.length; index += 1) {
        if (job.abortController && job.abortController.signal.aborted) throw new DOMException('The workflow was cancelled.', 'AbortError');
        const artifact = runtimeArtifacts[index];
        const data = await artifactBytes(artifact);
        if (data) entries.push({ name: `files/${safePackageName(artifact.name)}`, data });
        if (onProgress) {
          const progress = 40 + Math.round(((index + 1) / Math.max(runtimeArtifacts.length, 1)) * 35);
          onProgress({ progress, message: `Collected ${index + 1} of ${runtimeArtifacts.length} available file${runtimeArtifacts.length === 1 ? '' : 's'}.` });
        }
      }

      const zipBytes = window.ZipBuilder.create(entries);
      const blob = new Blob([zipBytes], { type: 'application/zip' });
      if (onProgress) onProgress({ progress: 90, message: 'Built the accessibility package ZIP.' });

      return [{
        name: exportOptions.packageName || `${baseName}-accessibility-package.zip`,
        type: 'Accessibility package',
        description: `A portable ZIP containing a readable manifest, project history, remaining gaps, follow-up actions, and ${runtimeArtifacts.length} available output file${runtimeArtifacts.length === 1 ? '' : 's'}.`,
        provider: this.name,
        status: 'Created',
        url: URL.createObjectURL(blob),
        mimeType: 'application/zip',
        size: blob.size
      }];
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


  async function artifactBytes(artifact) {
    if (artifact.content) return new TextEncoder().encode(artifact.content);
    if (!artifact.url) return null;
    try {
      const response = await fetch(artifact.url);
      if (!response.ok) return null;
      return new Uint8Array(await response.arrayBuffer());
    } catch (error) {
      return null;
    }
  }

  function safePackageName(name) {
    return String(name || 'output-file').replace(/[\\/:*?"<>|]+/g, '-');
  }

  function buildAccessibilityManifest(manifest) {
    const lines = [
      '# Accessibility Package Manifest',
      '',
      `Generated: ${manifest.generatedAt}`,
      '',
      '## Source',
      '',
      `- Name: ${manifest.source.name}`,
      `- Media type: ${manifest.source.mediaType}`,
      `- MIME type: ${manifest.source.mimeType || 'Unknown'}`,
      `- Size: ${manifest.source.size === null ? 'Unknown' : formatBytes(manifest.source.size)}`,
      `- Duration: ${manifest.source.durationSeconds === null ? 'Unknown' : formatTimestamp(manifest.source.durationSeconds)}`,
      '',
      '## Completed Accessibility Work',
      ''
    ];

    if (manifest.completedAccessibilityWork.length) {
      manifest.completedAccessibilityWork.forEach((item) => {
        lines.push(`- ${item.title} (${item.workflowId}), completed ${item.completedAt || 'date unknown'}`);
      });
    } else {
      lines.push('- No completed accessibility workflows are recorded yet.');
    }

    lines.push('', '## Included Files', '');
    if (manifest.includedFiles.length) {
      manifest.includedFiles.forEach((item) => lines.push(`- files/${item.name}: ${item.type}`));
    } else {
      lines.push('- No generated output files were available in this browser session.');
    }

    lines.push('', '## Recorded Files Not Available in This Session', '');
    if (manifest.recordedButUnavailableFiles.length) {
      manifest.recordedButUnavailableFiles.forEach((item) => lines.push(`- ${item.name}: ${item.reason}`));
    } else {
      lines.push('- None.');
    }

    lines.push('', '## Remaining Gaps', '');
    if (manifest.remainingGaps.length) {
      manifest.remainingGaps.forEach((gap) => lines.push(`- ${gap.title}: ${gap.purpose} Status: ${gap.availability}`));
    } else {
      lines.push('- No remaining gaps are identified by the current accessibility plan.');
    }

    lines.push('', '## Workflow History', '');
    if (manifest.workflowHistory.length) {
      manifest.workflowHistory.forEach((entry) => lines.push(`- ${entry.title || entry.workflowId}: ${entry.status}, ${entry.completedAt || entry.createdAt || 'date unknown'}`));
    } else {
      lines.push('- No workflow history is recorded.');
    }

    lines.push('', '## Recommended Follow-up Actions', '');
    if (manifest.recommendedFollowUpActions.length) {
      manifest.recommendedFollowUpActions.forEach((action) => lines.push(`- ${action}`));
    } else {
      lines.push('- No follow-up actions are currently recommended.');
    }

    lines.push('', '## Export Review', '');
    lines.push(`- Reviewed: ${manifest.exportReview.reviewedAt}`);
    lines.push(`- Privacy confirmation recorded: ${manifest.exportReview.privacyConfirmed ? 'Yes' : 'No'}`);
    if (manifest.exportReview.excludedArtifactNames.length) {
      lines.push('- Files excluded by the user:');
      manifest.exportReview.excludedArtifactNames.forEach((name) => lines.push(`  - ${name}`));
    } else {
      lines.push('- Files excluded by the user: None');
    }

    lines.push('', '## Package Notes', '', 'The original source file is not included automatically. Generated files are included only when their browser-session data is still available and selected during export review. The JSON manifest contains the same package record in a machine-readable format.', '');
    return lines.join('\n');
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
          window.clearInterval(progressTimer);
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

        const duration = Number(element.duration) || 0;
        const progressTimer = window.setInterval(() => {
          if (typeof options.onProgress === 'function' && duration > 0) {
            options.onProgress(Math.min(100, Math.round((element.currentTime / duration) * 100)));
          }
        }, 500);

        if (options.signal) {
          options.signal.addEventListener('abort', () => {
            if (recorder.state !== 'inactive') recorder.stop();
            fail(new DOMException('Cancelled', 'AbortError'));
          }, { once: true });
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
