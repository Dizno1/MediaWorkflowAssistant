(function () {
  async function render(sourceFile, artifacts, options, signal, onProgress) {
    if (!(sourceFile instanceof File)) throw new Error('Publication rendering requires the original local video file.');
    const captions = findArtifact(artifacts, (item) => item.mimeType === 'text/vtt' || /captions\.vtt$/i.test(item.name));
    const describedAudio = findArtifact(artifacts, (item) => item.mimeType === 'audio/wav' || /described-audio\.wav$/i.test(item.name));
    if (!captions || !captions.content) throw new Error('Create and review WebVTT captions before rendering the publication export.');
    if (!describedAudio || !describedAudio.url) throw new Error('Create the described-audio mix before rendering the publication export.');
    if (!window.MediaRecorder) throw new Error('This browser does not support local video rendering with MediaRecorder.');

    const mimeType = chooseMimeType();
    if (!mimeType) throw new Error('This browser cannot create a WebM publication video.');
    const video = document.createElement('video');
    const audio = document.createElement('audio');
    const sourceUrl = URL.createObjectURL(sourceFile);
    video.src = sourceUrl;
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    audio.src = describedAudio.url;
    audio.preload = 'auto';

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) throw new Error('This browser does not support the audio routing required for publication rendering.');
    const context = new AudioContextClass();
    let sourceNode;
    let destination;
    try {
      await Promise.all([waitForMedia(video), waitForMedia(audio)]);
      checkCancelled(signal);
      const capture = video.captureStream ? video.captureStream() : video.mozCaptureStream ? video.mozCaptureStream() : null;
      if (!capture || !capture.getVideoTracks().length) throw new Error('This browser cannot capture the source video picture for local rendering.');
      sourceNode = context.createMediaElementSource(audio);
      destination = context.createMediaStreamDestination();
      sourceNode.connect(destination);
      sourceNode.connect(context.destination);
      const stream = new MediaStream([...capture.getVideoTracks(), ...destination.stream.getAudioTracks()]);
      const chunks = [];
      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: Number(options.videoBitrate) || 4000000,
        audioBitsPerSecond: Number(options.audioBitrate) || 128000
      });
      const completed = new Promise((resolve, reject) => {
        recorder.ondataavailable = (event) => { if (event.data && event.data.size) chunks.push(event.data); };
        recorder.onerror = () => reject(recorder.error || new Error('The browser stopped publication rendering.'));
        recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
      });
      const cancel = () => {
        video.pause(); audio.pause();
        if (recorder.state !== 'inactive') recorder.stop();
      };
      if (signal) signal.addEventListener('abort', cancel, { once: true });
      recorder.start(1000);
      await context.resume();
      video.currentTime = 0; audio.currentTime = 0;
      if (onProgress) onProgress({ progress: 10, message: 'Started local accessible-video rendering.' });
      await Promise.all([video.play(), audio.play()]);
      await monitor(video, recorder, signal, onProgress);
      audio.pause();
      if (recorder.state !== 'inactive') recorder.stop();
      const videoBlob = await completed;
      if (signal) signal.removeEventListener('abort', cancel);
      checkCancelled(signal);
      if (!videoBlob.size) throw new Error('The browser did not create a publication video file.');
      if (onProgress) onProgress({ progress: 90, message: 'Building the publication package with selectable captions.' });
      return buildOutputs(sourceFile.name, videoBlob, captions.content, options);
    } finally {
      video.pause(); audio.pause();
      URL.revokeObjectURL(sourceUrl);
      if (sourceNode) sourceNode.disconnect();
      if (context.close) context.close();
    }
  }

  function buildOutputs(sourceName, videoBlob, captionsText, options) {
    const base = safeBase(sourceName);
    const videoName = `${base}-accessible.webm`;
    const captionsName = `${base}-captions.vtt`;
    const playerName = 'index.html';
    const manifestName = 'publication-manifest.json';
    const validationName = 'publication-validation.txt';
    const player = playerHtml(sourceName, videoName, captionsName, options);
    const manifest = JSON.stringify({
      packageVersion: 1,
      createdAt: new Date().toISOString(),
      sourceName,
      preset: options.preset || 'web-standard',
      video: videoName,
      captions: captionsName,
      player: playerName,
      captionLanguage: options.language || 'en',
      captionLabel: options.captionLabel || 'English',
      describedAudioIncluded: true,
      captionsSelectable: true,
      validation: validationName
    }, null, 2);
    const validation = [
      `Publication export for ${sourceName}`,
      '',
      'Validation status: Ready for human playback review',
      'Video picture: Included from the original source',
      'Described audio: Included as the rendered soundtrack',
      'Captions: Included as a selectable WebVTT track in the supplied HTML player',
      `Caption language: ${options.language || 'en'}`,
      '',
      'Required final check: Open index.html through a web server, play the full video, enable captions, verify synchronization, and confirm narration placement before publication.',
      ''
    ].join('\n');
    return Promise.all([
      videoBlob.arrayBuffer(),
      Promise.resolve(new TextEncoder().encode(captionsText)),
      Promise.resolve(new TextEncoder().encode(player)),
      Promise.resolve(new TextEncoder().encode(manifest)),
      Promise.resolve(new TextEncoder().encode(validation))
    ]).then(([videoBytes, captionBytes, playerBytes, manifestBytes, validationBytes]) => {
      const zipBytes = window.ZipBuilder.create([
        { name: videoName, data: new Uint8Array(videoBytes) },
        { name: captionsName, data: captionBytes },
        { name: playerName, data: playerBytes },
        { name: manifestName, data: manifestBytes },
        { name: validationName, data: validationBytes }
      ]);
      const zipBlob = new Blob([zipBytes], { type: 'application/zip' });
      return [
        { name: videoName, type: 'Accessible publication video', mimeType: videoBlob.type || 'video/webm', description: 'A locally rendered WebM containing the original picture and approved described-audio soundtrack.', url: URL.createObjectURL(videoBlob), size: videoBlob.size },
        { name: `${base}-publication.zip`, type: 'Publication-ready accessible video package', mimeType: 'application/zip', description: 'A portable package containing the accessible WebM, selectable WebVTT captions, an accessible HTML player, manifest, and validation checklist.', url: URL.createObjectURL(zipBlob), size: zipBlob.size },
        { name: validationName, type: 'Publication validation checklist', mimeType: 'text/plain', description: 'A readable final playback and caption verification checklist.', content: validation }
      ];
    });
  }

  function playerHtml(sourceName, videoName, captionsName, options) {
    const title = escapeHtml(options.title || `Accessible video: ${sourceName}`);
    return `<!doctype html>\n<html lang="${escapeHtml(options.language || 'en')}">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n<title>${title}</title>\n<style>body{font-family:system-ui,sans-serif;max-width:70rem;margin:0 auto;padding:1rem;line-height:1.5}video{width:100%;height:auto;background:#000}video:focus{outline:3px solid currentColor;outline-offset:3px}</style>\n</head>\n<body>\n<main>\n<h1>${title}</h1>\n<video controls preload="metadata">\n<source src="${encodeURI(videoName)}" type="video/webm">\n<track kind="captions" src="${encodeURI(captionsName)}" srclang="${escapeHtml(options.language || 'en')}" label="${escapeHtml(options.captionLabel || 'English')}" default>\n<p>Your browser does not support HTML video. Download the video and caption files from this package.</p>\n</video>\n<p>This version includes an audio-described soundtrack. Captions can be turned on or off with the player's captions control.</p>\n</main>\n</body>\n</html>\n`;
  }

  function waitForMedia(element) {
    if (element.readyState >= 1) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const done = () => { cleanup(); resolve(); };
      const fail = () => { cleanup(); reject(new Error('A required media file could not be decoded.')); };
      const cleanup = () => { element.removeEventListener('loadedmetadata', done); element.removeEventListener('error', fail); };
      element.addEventListener('loadedmetadata', done, { once: true });
      element.addEventListener('error', fail, { once: true });
      element.load();
    });
  }
  function monitor(video, recorder, signal, onProgress) {
    return new Promise((resolve, reject) => {
      const tick = () => {
        if (signal && signal.aborted) return reject(new DOMException('Cancelled', 'AbortError'));
        if (video.ended || recorder.state === 'inactive') return resolve();
        const duration = Number(video.duration) || 0;
        const progress = duration ? 10 + Math.min(75, Math.round((video.currentTime / duration) * 75)) : 20;
        if (onProgress) onProgress({ progress, message: `Rendering accessible video at ${formatTime(video.currentTime)} of ${formatTime(duration)}.` });
        window.setTimeout(tick, 750);
      };
      video.addEventListener('error', () => reject(new Error('The source video could not be rendered.')), { once: true });
      tick();
    });
  }
  function chooseMimeType() { return ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find((type) => MediaRecorder.isTypeSupported(type)) || ''; }
  function findArtifact(items, predicate) { return (items || []).filter(predicate).sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))[0] || null; }
  function safeBase(name) { return String(name || 'video').replace(/\.[^.]+$/, '').replace(/[^a-z0-9._-]+/gi, '-').replace(/^-+|-+$/g, '') || 'video'; }
  function formatTime(seconds) { const value = Math.max(0, Number(seconds) || 0); const minutes = Math.floor(value / 60); return `${minutes}:${String(Math.floor(value % 60)).padStart(2, '0')}`; }
  function checkCancelled(signal) { if (signal && signal.aborted) throw new DOMException('Cancelled', 'AbortError'); }
  function escapeHtml(value) { return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;'); }
  window.PublicationRenderer = { render };
})();
