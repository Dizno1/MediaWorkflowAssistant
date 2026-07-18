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
    health: () => ({ status: !configuration.apiKey ? 'unknown' : configuration.lastTestStatus === 'Connected' ? 'connected' : configuration.lastTestStatus ? 'failed' : 'unknown', testedAt: configuration.lastTestedAt || '' }),
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
  const DEFAULT_MODEL = 'gemini-2.5-flash';
  const FALLBACK_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.5-pro'];

  async function generate(capability, context, signal) {
    const prompt = capability === 'transcription-draft' ? 'Transcribe this audio accurately. Return only the transcript.' : capability === 'visual-analysis' ? 'Write a concise objective image description for accessibility. Return only the description.' : capability === 'audio-description-draft' ? (Array.isArray(context.priorDraftCues) && context.priorDraftCues.length
      ? `Review this draft audio-description script for a ${context.durationSeconds || 0}-second source. Identify missing important visuals, redundant descriptions, timing conflicts with dialogue, and subjective wording. Return improved JSON cues with start, end, text, and placement — the same format as the draft. Transcript: ${String(context.transcriptText || '').slice(0, 8000)}. Draft cues to review and improve: ${JSON.stringify(context.priorDraftCues).slice(0, 8000)}`
      : `Create JSON audio-description cues with start, end, text, and placement for a ${context.durationSeconds || 0}-second source. Transcript: ${String(context.transcriptText || '').slice(0, 8000)}`) : `Return JSON with scores and findings for media accessibility quality. Context: ${JSON.stringify(context.knowledge || {}).slice(0, 12000)}`;
    const parts = [{ text: prompt }];
    if (context.sourceData && context.sourceData.base64) parts.push({ inline_data: { mime_type: context.sourceData.mimeType || 'application/octet-stream', data: context.sourceData.base64 } });
    return callModel(configuration.model, parts, signal);
  }

  async function callModel(model, parts, signal) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    let response;
    try {
      response = await fetch(url, { method: 'POST', signal, headers: { 'Content-Type': 'application/json', 'x-goog-api-key': configuration.apiKey }, body: JSON.stringify({ contents: [{ role: 'user', parts }] }) });
    } catch (error) {
      if (error && error.name === 'AbortError') throw error;
      throw new Error('Network request failed. Check the internet connection and try again.');
    }
    let result = {}; try { result = await response.json(); } catch (error) {}
    if (!response.ok) {
      const message = result.error && result.error.message ? result.error.message : '';
      if (response.status === 401 || response.status === 403) { recordTestResult('Failed'); throw new Error(window.AIProviderLayer.plainLanguageError('Gemini', response.status)); }
      if (response.status === 404 || /not found|not supported/i.test(message)) { const notFound = new Error(window.AIProviderLayer.plainLanguageError('Gemini', response.status, 'model')); notFound.modelNotFound = true; throw notFound; }
      // message is intentionally not surfaced: only a sanitized, categorized message is shown.
      throw new Error(window.AIProviderLayer.plainLanguageError('Gemini', response.status));
    }
    return result;
  }

  async function listModels(signal) {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(configuration.apiKey)}`, { signal });
    if (!response.ok) throw new Error(`Gemini model list returned HTTP ${response.status}.`);
    const result = await response.json();
    return (result.models || [])
      .filter((item) => Array.isArray(item.supportedGenerationMethods) && item.supportedGenerationMethods.includes('generateContent'))
      .map((item) => String(item.name || '').replace(/^models\//, ''))
      .filter(Boolean);
  }

  // Confirms the configured model is still supported, falling back to a currently
  // supported default when an imported or previously saved model has been retired.
  async function resolveModel(signal) {
    const requested = configuration.model || DEFAULT_MODEL;
    let available = [];
    try { available = await listModels(signal); } catch (error) { return { model: requested, changed: false, verified: false }; }
    if (available.includes(requested)) return { model: requested, changed: false, verified: true };
    const fallback = FALLBACK_MODELS.find((name) => available.includes(name)) || available[0] || DEFAULT_MODEL;
    return { model: fallback, changed: fallback !== requested, verified: available.length > 0, previous: requested };
  }

  function extractText(result) { return (result.candidates || []).flatMap((candidate) => candidate.content && candidate.content.parts || []).map((part) => part.text || '').filter(Boolean).join('\n').trim(); }
  function parseJson(text) { return JSON.parse(String(text || '').replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')); }
  async function recordTestResult(status) {
    configuration.lastTestedAt = new Date().toISOString(); configuration.lastTestStatus = status;
    await window.SecureCredentialStore.save(STORE_ID, configuration);
  }
  async function configure(next) {
    configuration = { apiKey: String(next.apiKey || '').trim() || configuration.apiKey || '', model: String(next.model || '').trim() || configuration.model || DEFAULT_MODEL };
    await window.SecureCredentialStore.save(STORE_ID, configuration);
    ready = true;
    if (configuration.apiKey) {
      try {
        const resolved = await resolveModel();
        if (resolved.verified && resolved.model !== configuration.model) {
          configuration.model = resolved.model;
          await window.SecureCredentialStore.save(STORE_ID, configuration);
        }
      } catch (error) { /* Model discovery is best-effort; keep the requested model. */ }
    }
    return getConfiguration();
  }
  function getConfiguration() { return { model: configuration.model || DEFAULT_MODEL, hasApiKey: Boolean(configuration.apiKey), lastTestedAt: configuration.lastTestedAt || '', lastTestStatus: configuration.lastTestStatus || '', ready }; }
  async function clear() { configuration = {}; ready = true; await window.SecureCredentialStore.remove(STORE_ID); }
  async function testConnection(signal) {
    if (!configuration.apiKey) throw new Error('Configuration file did not contain a recognized API key. Add a Gemini API key before testing.');
    let usedModel = configuration.model || DEFAULT_MODEL;
    try {
      const result = await generate('visual-analysis', { sourceData: null }, signal);
      if (!extractText(result)) throw new Error('Gemini returned no response.');
    } catch (error) {
      if (error && error.modelNotFound) {
        const resolved = await resolveModel(signal);
        if (!resolved.verified || resolved.model === usedModel) { await recordTestResult('Failed'); throw error; }
        configuration.model = resolved.model;
        await window.SecureCredentialStore.save(STORE_ID, configuration);
        usedModel = resolved.model;
        const retry = await generate('visual-analysis', { sourceData: null }, signal);
        if (!extractText(retry)) { await recordTestResult('Failed'); throw new Error('Gemini returned no response.'); }
      } else {
        await recordTestResult('Failed');
        throw error;
      }
    }
    configuration.lastTestedAt = new Date().toISOString(); configuration.lastTestStatus = 'Connected';
    await window.SecureCredentialStore.save(STORE_ID, configuration);
    return { message: 'Connected.', model: usedModel };
  }
  async function initialize() { configuration = await window.SecureCredentialStore.load(STORE_ID) || {}; ready = true; document.dispatchEvent(new CustomEvent('provider-credentials-ready')); }
  window.GeminiProvider = { configure, getConfiguration, clear, testConnection, initialize }; window.AIProviderLayer.register(provider); initialize();
})();
