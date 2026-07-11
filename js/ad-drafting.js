(function () {
  async function sampleVideo(sourceData, durationSeconds, maximumFrames = 8) {
    if (!sourceData || !sourceData.base64 || !String(sourceData.mimeType || '').startsWith('video/')) throw new Error('A local video file is required for visual sampling.');
    const blob = base64Blob(sourceData.base64, sourceData.mimeType);
    const url = URL.createObjectURL(blob);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    try {
      await loadVideo(video, url);
      const duration = Number(video.duration) || Number(durationSeconds) || 1;
      const count = Math.max(2, Math.min(maximumFrames, Math.ceil(duration / 30) + 1));
      const frames = [];
      for (let index = 0; index < count; index += 1) {
        const time = count === 1 ? 0 : Math.min(Math.max(0, duration - 0.05), duration * index / (count - 1));
        await seek(video, time);
        const canvas = document.createElement('canvas');
        const width = Math.min(768, video.videoWidth || 640);
        const ratio = (video.videoHeight || 360) / (video.videoWidth || 640);
        canvas.width = width;
        canvas.height = Math.max(1, Math.round(width * ratio));
        canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
        frames.push({ timeSeconds: time, imageDataUrl: canvas.toDataURL('image/jpeg', 0.78) });
      }
      return { durationSeconds: duration, frames };
    } finally {
      URL.revokeObjectURL(url);
      video.removeAttribute('src');
      video.load();
    }
  }

  function normalizeCues(value, durationSeconds) {
    const source = Array.isArray(value) ? value : [];
    return source.map((cue) => {
      const startSeconds = Math.max(0, Number(cue.startSeconds ?? cue.start) || 0);
      const proposedEnd = Number(cue.endSeconds ?? cue.end);
      const endSeconds = Math.min(Number(durationSeconds) || Number.MAX_SAFE_INTEGER, Math.max(startSeconds + 1, Number.isFinite(proposedEnd) ? proposedEnd : startSeconds + 4));
      return {
        start: timestamp(startSeconds),
        end: timestamp(endSeconds),
        placement: normalizePlacement(cue.placement),
        text: String(cue.text || cue.narration || '').replace(/\s+/g, ' ').trim()
      };
    }).filter((cue) => cue.text);
  }

  function normalizePlacement(value) {
    const text = String(value || '').toLowerCase();
    if (text.includes('before')) return 'Before the scene';
    if (text.includes('after')) return 'After the scene';
    if (text.includes('extended')) return 'Extended description';
    return 'During a pause';
  }

  function timestamp(seconds) {
    const value = Math.max(0, Number(seconds) || 0);
    const hours = Math.floor(value / 3600);
    const minutes = Math.floor((value % 3600) / 60);
    const whole = Math.floor(value % 60);
    const milliseconds = Math.round((value - Math.floor(value)) * 1000);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(whole).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
  }

  function base64Blob(base64, mimeType) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return new Blob([bytes], { type: mimeType || 'video/mp4' });
  }

  function loadVideo(video, url) {
    return new Promise((resolve, reject) => {
      video.onloadedmetadata = resolve;
      video.onerror = () => reject(new Error('The browser could not open this video for visual sampling.'));
      video.src = url;
    });
  }

  function seek(video, time) {
    return new Promise((resolve, reject) => {
      const done = () => { cleanup(); resolve(); };
      const failed = () => { cleanup(); reject(new Error('A video frame could not be sampled.')); };
      const cleanup = () => { video.removeEventListener('seeked', done); video.removeEventListener('error', failed); };
      video.addEventListener('seeked', done, { once: true });
      video.addEventListener('error', failed, { once: true });
      video.currentTime = time;
    });
  }

  window.AudioDescriptionDrafting = { sampleVideo, normalizeCues, timestamp };
})();
