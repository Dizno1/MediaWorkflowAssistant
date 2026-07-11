(function () {
  const STORE_ID = 'local-service-provider';
  let configuration = { ollamaEndpoint: 'http://localhost:11434', ollamaModel: '', whisperEndpoint: 'http://localhost:9000/transcribe', whisperModel: 'base' };
  let ready = false;
  const provider = {
    id: 'local-services', name: 'Local Ollama and Whisper services', kind: 'local connected services',
    description: 'Uses optional services running on this computer for private transcription and analysis.',
    privacy: 'Work is sent only to the configured local computer addresses.', external: false, costCategory: 'no-additional-cost', costMessage: 'No additional usage charge', requiresConfirmation: false,
    quality: { 'transcription-draft': 88, 'visual-analysis': 88, 'audio-description-draft': 86, 'advanced-accessibility-analysis': 86 }, preferredCapabilities: ['transcription-draft'],
    isAvailable: () => ready && Boolean((configuration.whisperAvailable && configuration.whisperEndpoint) || (configuration.ollamaAvailable && configuration.ollamaEndpoint && configuration.ollamaModel)),
    getCapabilities() { const capabilities = []; if (configuration.whisperAvailable) capabilities.push('transcription-draft'); if (configuration.ollamaAvailable && configuration.ollamaModel) capabilities.push('visual-analysis', 'audio-description-draft', 'advanced-accessibility-analysis'); return capabilities; },
    async run(capability, context, options) {
      if (capability === 'transcription-draft') return transcribe(context, options.signal);
      return runOllama(capability, context, options.signal);
    }
  };
  async function transcribe(context, signal) {
    if (!context.sourceData || !context.sourceData.base64) throw new Error('The local Whisper service needs the selected media file.');
    const response = await fetch(configuration.whisperEndpoint, { method: 'POST', signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: configuration.whisperModel, filename: context.sourceData.name, mimeType: context.sourceData.mimeType, base64: context.sourceData.base64 }) });
    let result = {}; try { result = await response.json(); } catch (error) {}
    if (!response.ok) throw new Error(result.error || `Local Whisper returned HTTP ${response.status}.`);
    return { text: String(result.text || result.transcript || '').trim(), summary: 'A transcript draft was created by the local Whisper service.' };
  }
  async function runOllama(capability, context, signal) {
    const prompt = capability === 'visual-analysis' ? 'Write a concise objective image description for accessibility. Return only the description.' : capability === 'audio-description-draft' ? `Return JSON audio-description cues with start, end, text, and placement for a ${context.durationSeconds || 0}-second source. Transcript: ${String(context.transcriptText || '').slice(0, 8000)}` : `Return JSON accessibility quality scores and findings. Context: ${JSON.stringify(context.knowledge || {}).slice(0, 12000)}`;
    const body = { model: configuration.ollamaModel, prompt, stream: false };
    if (context.sourceData && context.sourceData.base64 && String(context.sourceData.mimeType || '').startsWith('image/')) body.images = [context.sourceData.base64];
    const response = await fetch(`${configuration.ollamaEndpoint.replace(/\/+$/, '')}/api/generate`, { method: 'POST', signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    let result = {}; try { result = await response.json(); } catch (error) {}
    if (!response.ok) throw new Error(result.error || `Ollama returned HTTP ${response.status}.`);
    const text = String(result.response || '').trim();
    if (capability === 'visual-analysis') return { description: text, summary: 'An image-description draft was created by local Ollama.' };
    const parsed = JSON.parse(text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''));
    if (capability === 'audio-description-draft') return { cues: Array.isArray(parsed) ? parsed : parsed.cues, summary: 'Audio-description cues were drafted by local Ollama for review.' };
    return { report: parsed, summary: 'Advanced accessibility analysis completed with local Ollama.' };
  }
  async function configure(next) { configuration = { ...configuration, ollamaEndpoint: String(next.ollamaEndpoint || configuration.ollamaEndpoint || '').trim().replace(/\/+$/, ''), ollamaModel: String(next.ollamaModel || '').trim(), whisperEndpoint: String(next.whisperEndpoint || configuration.whisperEndpoint || '').trim(), whisperModel: String(next.whisperModel || 'base').trim(), ollamaAvailable: Boolean(configuration.ollamaAvailable), whisperAvailable: Boolean(configuration.whisperAvailable), lastTestedAt: configuration.lastTestedAt || '' }; await window.SecureCredentialStore.save(STORE_ID, configuration); ready = true; return getConfiguration(); }
  function getConfiguration() { return { ...configuration, ready }; }
  async function clear() { configuration = { ollamaEndpoint: 'http://localhost:11434', ollamaModel: '', whisperEndpoint: 'http://localhost:9000/transcribe', whisperModel: 'base' }; ready = true; await window.SecureCredentialStore.remove(STORE_ID); }
  async function testOllama(signal) { const response = await fetch(`${configuration.ollamaEndpoint.replace(/\/+$/, '')}/api/tags`, { signal }); if (!response.ok) throw new Error(`Ollama returned HTTP ${response.status}.`); const result = await response.json(); configuration.ollamaAvailable = true; if (!configuration.ollamaModel && result.models && result.models[0]) configuration.ollamaModel = result.models[0].name; configuration.lastTestedAt = new Date().toISOString(); await window.SecureCredentialStore.save(STORE_ID, configuration); return { message: `Ollama is available${configuration.ollamaModel ? ` with ${configuration.ollamaModel}` : ''}.` }; }
  async function testWhisper(signal) { const response = await fetch(configuration.whisperEndpoint, { method: 'OPTIONS', signal }); if (!response.ok && response.status !== 405) throw new Error(`Local Whisper returned HTTP ${response.status}.`); configuration.whisperAvailable = true; configuration.lastTestedAt = new Date().toISOString(); await window.SecureCredentialStore.save(STORE_ID, configuration); return { message: 'The local Whisper endpoint is reachable.' }; }
  async function initialize() { configuration = { ...configuration, ...(await window.SecureCredentialStore.load(STORE_ID) || {}) }; ready = true; document.dispatchEvent(new CustomEvent('provider-credentials-ready')); }
  window.LocalServiceProvider = { configure, getConfiguration, clear, testOllama, testWhisper, initialize }; window.AIProviderLayer.register(provider); initialize();
})();
