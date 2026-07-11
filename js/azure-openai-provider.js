(function () {
  const STORE_ID = 'azure-openai-provider';
  let configuration = {};
  let ready = false;

  const provider = {
    id: 'azure-openai-direct',
    name: 'Azure OpenAI service',
    kind: 'built-in connected service adapter',
    description: 'Uses an Azure OpenAI resource for image analysis, audio-description drafting, and advanced accessibility analysis.',
    privacy: 'Source-derived content is sent to the configured Azure resource only after confirmation.',
    external: true,
    costCategory: 'may-charge',
    costMessage: 'May charge for usage',
    requiresConfirmation: true,
    quality: { 'visual-analysis': 94, 'audio-description-draft': 93, 'advanced-accessibility-analysis': 94 },
    preferredCapabilities: [],
    isAvailable: () => ready && Boolean(configuration.apiKey && configuration.endpoint && configuration.deployment),
    getCapabilities: () => ['visual-analysis', 'audio-description-draft', 'advanced-accessibility-analysis'],
    async run(capability, context, options) {
      if (!provider.isAvailable()) throw new Error('Add Azure OpenAI settings in Advanced assistance settings first.');
      const content = buildContent(capability, context);
      const result = await request(content, options.signal);
      const text = extractText(result);
      if (capability === 'visual-analysis') return { description: text, summary: 'An image-description draft was created with Azure OpenAI.' };
      if (capability === 'audio-description-draft') return normalizeCues(text, context.durationSeconds);
      return { report: parseJson(text), summary: 'Advanced accessibility analysis completed with Azure OpenAI.' };
    }
  };

  function buildContent(capability, context) {
    const parts = [];
    if (capability === 'visual-analysis') parts.push({ type: 'input_text', text: 'Write a concise, objective image description for accessibility. Return only the description.' });
    else if (capability === 'audio-description-draft') parts.push({ type: 'input_text', text: `Create a JSON array of concise audio-description cues with start, end, text, and placement. Duration is ${context.durationSeconds || 0} seconds. Transcript context: ${String(context.transcriptText || '').slice(0, 8000)}` });
    else parts.push({ type: 'input_text', text: `Return JSON with scores and findings for media accessibility quality. Context: ${JSON.stringify(context.knowledge || {}).slice(0, 12000)}` });
    if (context.sourceData && context.sourceData.base64 && String(context.sourceData.mimeType || '').startsWith('image/')) {
      parts.push({ type: 'input_image', image_url: `data:${context.sourceData.mimeType};base64,${context.sourceData.base64}` });
    }
    return [{ role: 'user', content: parts }];
  }

  async function request(input, signal) {
    const base = configuration.endpoint.replace(/\/+$/, '');
    const url = `${base}/openai/v1/responses`;
    const response = await fetch(url, { method: 'POST', signal, headers: { 'Content-Type': 'application/json', 'api-key': configuration.apiKey }, body: JSON.stringify({ model: configuration.deployment, input }) });
    let result = {};
    try { result = await response.json(); } catch (error) {}
    if (!response.ok) throw new Error(result.error && result.error.message ? result.error.message : `Azure OpenAI returned HTTP ${response.status}.`);
    return result;
  }

  function extractText(result) {
    if (typeof result.output_text === 'string') return result.output_text.trim();
    return (result.output || []).flatMap((item) => item.content || []).map((item) => item.text || '').filter(Boolean).join('\n').trim();
  }
  function parseJson(text) { const cleaned = String(text || '').replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''); return JSON.parse(cleaned); }
  function normalizeCues(text, duration) {
    const parsed = parseJson(text); const cues = Array.isArray(parsed) ? parsed : parsed.cues;
    if (!Array.isArray(cues)) throw new Error('Azure OpenAI did not return usable audio-description cues.');
    return { cues, summary: `${cues.length} audio-description cues were drafted with Azure OpenAI for human review.` };
  }

  async function configure(next) {
    configuration = { endpoint: String(next.endpoint || '').trim().replace(/\/+$/, ''), deployment: String(next.deployment || '').trim(), apiKey: String(next.apiKey || '').trim() || configuration.apiKey || '' };
    if (configuration.endpoint && !/^https:\/\//i.test(configuration.endpoint)) throw new Error('Azure endpoint must use HTTPS.');
    await window.SecureCredentialStore.save(STORE_ID, configuration); ready = true; return getConfiguration();
  }
  function getConfiguration() { return { endpoint: configuration.endpoint || '', deployment: configuration.deployment || '', hasApiKey: Boolean(configuration.apiKey), ready }; }
  async function clear() { configuration = {}; ready = true; await window.SecureCredentialStore.remove(STORE_ID); }
  async function testConnection(signal) { await request([{ role: 'user', content: [{ type: 'input_text', text: 'Reply with the single word Connected.' }] }], signal); return { message: 'Azure OpenAI responded successfully.' }; }
  async function initialize() { configuration = await window.SecureCredentialStore.load(STORE_ID) || {}; ready = true; document.dispatchEvent(new CustomEvent('provider-credentials-ready')); }

  window.AzureOpenAIProvider = { configure, getConfiguration, clear, testConnection, initialize };
  window.AIProviderLayer.register(provider);
  initialize();
})();
