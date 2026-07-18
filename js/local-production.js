(function () {
  // Client for the optional local production helper (tools/local-production-helper).
  // This is a local production engine, not an AI provider — it is never registered with
  // AIProviderLayer and never appears in provider selection. It only exists to do what a
  // browser sandbox cannot: invoke the person's own installed FFmpeg/FFprobe.
  const BASE = 'http://127.0.0.1:8788';
  let lastHealth = null;

  async function checkHealth() {
    try {
      const response = await fetch(`${BASE}/health`, { signal: AbortSignal.timeout(3000) });
      if (!response.ok) throw new Error('unhealthy');
      lastHealth = await response.json();
      lastHealth.helperRunning = true;
    } catch (error) {
      lastHealth = { ffmpeg: { found: false }, ffprobe: { found: false }, helperRunning: false };
    }
    document.dispatchEvent(new CustomEvent('local-production-updated'));
    return lastHealth;
  }

  function getStatus() { return lastHealth; }

  async function uploadAsset(kind, blob) {
    const response = await fetch(`${BASE}/upload/${kind}`, { method: 'POST', body: blob });
    if (!response.ok) throw new Error('The local production helper rejected that file.');
    const result = await response.json();
    return result.assetId;
  }

  // Renders the accessible video locally via the FFmpeg helper. Requires the original video
  // File, the described-audio mix as a Blob, and (optionally) reviewed caption text. Returns a
  // downloadable URL on success. Throws a plain-language error the caller can present directly.
  async function renderAccessibleVideo({ videoFile, describedAudioBlob, captionsText, keepOriginalAudio, outputName, onProgress }) {
    const health = await checkHealth();
    if (!health.helperRunning) throw new Error('Local video production is not ready because the local production helper is not running.');
    if (!health.ffmpeg || !health.ffmpeg.found) throw new Error('Local video production is not ready because FFmpeg could not be located.');

    if (onProgress) onProgress({ status: 'uploading', message: 'Sending the video and described audio to the local production helper.' });
    const videoAssetId = await uploadAsset('video', videoFile);
    const describedAudioAssetId = describedAudioBlob ? await uploadAsset('audio', describedAudioBlob) : null;
    const captionsAssetId = captionsText ? await uploadAsset('captions', new Blob([captionsText], { type: 'text/vtt' })) : null;

    const startResponse = await fetch(`${BASE}/render`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoAssetId, describedAudioAssetId, captionsAssetId, keepOriginalAudio: Boolean(keepOriginalAudio), outputName })
    });
    if (!startResponse.ok) {
      const detail = await startResponse.json().catch(() => ({}));
      throw new Error(detail.error || 'Local rendering could not start.');
    }
    const { jobId } = await startResponse.json();

    // Polls rather than streaming progress: this is a single local HTTP server with no
    // dependencies, and polling every 1.5 seconds is simple, reliable, and light enough not to
    // need a WebSocket or server-sent-events implementation for this.
    for (;;) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const statusResponse = await fetch(`${BASE}/render/${jobId}`);
      if (!statusResponse.ok) throw new Error('Lost contact with the local production helper during rendering.');
      const status = await statusResponse.json();
      if (onProgress) onProgress({ status: status.status, message: status.message });
      if (status.status === 'complete') return { downloadUrl: `${BASE}/render/${jobId}/download`, jobId };
      if (status.status === 'failed') throw new Error(status.message || 'Local rendering failed.');
      if (status.status === 'cancelled') throw new Error('Rendering was cancelled.');
    }
  }

  async function cancelRender(jobId) {
    try { await fetch(`${BASE}/render/${jobId}/cancel`, { method: 'POST' }); } catch (error) { /* best effort */ }
  }

  window.LocalProduction = { checkHealth, getStatus, renderAccessibleVideo, cancelRender };
  checkHealth();
})();
