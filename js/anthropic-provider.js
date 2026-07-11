(function () {
  const STORE_ID = 'anthropic-provider';
  let configuration = {};
  let ready = false;
  const provider = {
    id: 'anthropic-direct', name: 'Anthropic service', kind: 'connected service adapter',
    description: 'Uses Anthropic for image descriptions, audio-description planning, and advanced accessibility analysis.',
    privacy: 'Source-derived content is sent to Anthropic only after confirmation.', external: true, costCategory: 'may-charge', costMessage: 'May charge for usage', requiresConfirmation: true,
    quality: { 'visual-analysis': 95, 'audio-description-draft': 93, 'advanced-accessibility-analysis': 94 },
    isAvailable: () => ready && Boolean(configuration.apiKey && configuration.model),
    getCapabilities: () => ['visual-analysis', 'audio-description-draft', 'advanced-accessibility-analysis'],
    async run(capability, context, options) {
      if (!provider.isAvailable()) throw new Error('Configure Anthropic in Advanced assistance settings first.');
      const text = await request(capability, context, options.signal);
      if (capability === 'visual-analysis') return { description: text, summary: 'An image-description draft was created with Anthropic.' };
      if (capability === 'audio-description-draft') { const parsed = parseJson(text); const cues = Array.isArray(parsed) ? parsed : parsed.cues; if (!Array.isArray(cues)) throw new Error('Anthropic did not return usable cues.'); return { cues, summary: `${cues.length} audio-description cues were drafted with Anthropic for review.` }; }
      return { report: parseJson(text), summary: 'Advanced accessibility analysis completed with Anthropic.' };
    }
  };
  async function request(capability, context, signal) {
    const prompt = capability === 'visual-analysis' ? 'Write a concise, objective image description for accessibility. Return only the description.' : capability === 'audio-description-draft' ? `Create JSON audio-description cues with start, end, text, and placement for a ${context.durationSeconds || 0}-second source. Transcript: ${String(context.transcriptText || '').slice(0, 8000)}` : `Return JSON with scores and findings for media accessibility quality. Context: ${JSON.stringify(context.knowledge || {}).slice(0, 12000)}`;
    const content = [{ type: 'text', text: prompt }];
    if (context.sourceData && context.sourceData.base64 && String(context.sourceData.mimeType || '').startsWith('image/')) content.push({ type: 'image', source: { type: 'base64', media_type: context.sourceData.mimeType, data: context.sourceData.base64 } });
    const response = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', signal, headers: { 'Content-Type': 'application/json', 'x-api-key': configuration.apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' }, body: JSON.stringify({ model: configuration.model, max_tokens: 4096, messages: [{ role: 'user', content }] }) });
    let result = {}; try { result = await response.json(); } catch (error) {}
    if (!response.ok) throw new Error(result.error && result.error.message ? result.error.message : `Anthropic returned HTTP ${response.status}.`);
    return (result.content || []).map((item) => item.text || '').filter(Boolean).join('\n').trim();
  }
  function parseJson(text) { return JSON.parse(String(text || '').replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')); }
  async function configure(next) { configuration = { apiKey: String(next.apiKey || '').trim() || configuration.apiKey || '', model: String(next.model || '').trim() || 'claude-sonnet-4-5' }; await window.SecureCredentialStore.save(STORE_ID, configuration); ready = true; return getConfiguration(); }
  function getConfiguration() { return { model: configuration.model || 'claude-sonnet-4-5', hasApiKey: Boolean(configuration.apiKey), lastTestedAt: configuration.lastTestedAt || '', lastTestStatus: configuration.lastTestStatus || '', ready }; }
  async function clear() { configuration = {}; ready = true; await window.SecureCredentialStore.remove(STORE_ID); }
  async function testConnection(signal) { const text = await request('visual-analysis', { sourceData: null }, signal); if (!text) throw new Error('Anthropic returned no response.'); configuration.lastTestedAt = new Date().toISOString(); configuration.lastTestStatus = 'Connected'; await window.SecureCredentialStore.save(STORE_ID, configuration); return { message: 'Anthropic responded successfully.' }; }
  async function initialize() { configuration = await window.SecureCredentialStore.load(STORE_ID) || {}; ready = true; document.dispatchEvent(new CustomEvent('provider-credentials-ready')); }
  window.AnthropicProvider = { configure, getConfiguration, clear, testConnection, initialize }; window.AIProviderLayer.register(provider); initialize();
})();
