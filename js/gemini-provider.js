(function () {
  const STORE_ID = 'gemini-provider';
  let configuration = {};
  let ready = false;
  const provider = {
    id: 'gemini-direct', name: 'Google Gemini service', kind: 'built-in connected service adapter',
    description: 'Uses the Gemini API for transcription drafts, image descriptions, audio-description drafts, and accessibility analysis.',
    privacy: 'Selected source content is sent to Google only after confirmation.', external: true, costCategory: 'may-charge', costMessage: 'May charge for usage', requiresConfirmation: true,
    quality: { 'transcription-draft': 91, 'visual-analysis': 94, 'audio-description-draft': 92, 'advanced-accessibility-analysis': 93 }, preferredCapabilities: [],
    isAvailable: () => ready && Boolean(configuration.apiKey && configuration.model),
    getCapabilities: () => ['transcription-draft', 'visual-analysis', 'audio-description-draft', 'advanced-accessibility-analysis'],
    async run(capability, context, options) {
      if (!provider.isAvailable()) throw new Error('Add Gemini settings in Advanced assistance settings first.');
      const result = await generate(capability, context, options.signal); const text = extractText(result);
      if (capability === 'transcription-draft') return { text, summary: 'A transcript draft was created with Gemini.' };
      if (capability === 'visual-analysis') return { description: text, summary: 'An image-description draft was created with Gemini.' };
      if (capability === 'audio-description-draft') { const parsed = parseJson(text); const cues = Array.isArray(parsed) ? parsed : parsed.cues; if (!Array.isArray(cues)) throw new Error('Gemini did not return usable cues.'); return { cues, summary: `${cues.length} audio-description cues were drafted with Gemini for review.` }; }
      return { report: parseJson(text), summary: 'Advanced accessibility analysis completed with Gemini.' };
    }
  };
  async function generate(capability, context, signal) {
    const prompt = capability === 'transcription-draft' ? 'Transcribe this audio accurately. Return only the transcript.' : capability === 'visual-analysis' ? 'Write a concise objective image description for accessibility. Return only the description.' : capability === 'audio-description-draft' ? `Create JSON audio-description cues with start, end, text, and placement for a ${context.durationSeconds || 0}-second source. Transcript: ${String(context.transcriptText || '').slice(0, 8000)}` : `Return JSON with scores and findings for media accessibility quality. Context: ${JSON.stringify(context.knowledge || {}).slice(0, 12000)}`;
    const parts = [{ text: prompt }];
    if (context.sourceData && context.sourceData.base64) parts.push({ inline_data: { mime_type: context.sourceData.mimeType || 'application/octet-stream', data: context.sourceData.base64 } });
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(configuration.model)}:generateContent`;
    const response = await fetch(url, { method: 'POST', signal, headers: { 'Content-Type': 'application/json', 'x-goog-api-key': configuration.apiKey }, body: JSON.stringify({ contents: [{ role: 'user', parts }] }) });
    let result = {}; try { result = await response.json(); } catch (error) {}
    if (!response.ok) throw new Error(result.error && result.error.message ? result.error.message : `Gemini returned HTTP ${response.status}.`); return result;
  }
  function extractText(result) { return (result.candidates || []).flatMap((candidate) => candidate.content && candidate.content.parts || []).map((part) => part.text || '').filter(Boolean).join('\n').trim(); }
  function parseJson(text) { return JSON.parse(String(text || '').replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')); }
  async function configure(next) { configuration = { apiKey: String(next.apiKey || '').trim() || configuration.apiKey || '', model: String(next.model || '').trim() || 'gemini-2.5-flash' }; await window.SecureCredentialStore.save(STORE_ID, configuration); ready = true; return getConfiguration(); }
  function getConfiguration() { return { model: configuration.model || 'gemini-2.5-flash', hasApiKey: Boolean(configuration.apiKey), ready }; }
  async function clear() { configuration = {}; ready = true; await window.SecureCredentialStore.remove(STORE_ID); }
  async function testConnection(signal) { const result = await generate('visual-analysis', { sourceData: null }, signal); if (!extractText(result)) throw new Error('Gemini returned no response.'); return { message: 'Gemini responded successfully.' }; }
  async function initialize() { configuration = await window.SecureCredentialStore.load(STORE_ID) || {}; ready = true; document.dispatchEvent(new CustomEvent('provider-credentials-ready')); }
  window.GeminiProvider = { configure, getConfiguration, clear, testConnection, initialize }; window.AIProviderLayer.register(provider); initialize();
})();
