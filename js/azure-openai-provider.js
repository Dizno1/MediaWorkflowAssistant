(function () {
  const STORE_ID = 'azure-openai-provider';
  let configuration = { profiles: [], activeProfileId: '' };
  let ready = false;

  const provider = {
    id: 'azure-openai-direct',
    name: 'Azure OpenAI service',
    kind: 'built-in connected service adapter',
    description: 'Uses the active Azure OpenAI resource for image analysis, audio-description drafting, and advanced accessibility analysis.',
    privacy: 'Source-derived content is sent to the active Azure resource only after confirmation.',
    external: true,
    costCategory: 'may-charge',
    costMessage: 'May charge for usage',
    requiresConfirmation: true,
    quality: { 'visual-analysis': 94, 'audio-description-draft': 93, 'advanced-accessibility-analysis': 94 },
    preferredCapabilities: [],
    isAvailable: () => ready && Boolean(getActiveProfile() && getActiveProfile().apiKey && getActiveProfile().endpoint && getActiveProfile().deployment),
    getCapabilities: () => ['visual-analysis', 'audio-description-draft', 'advanced-accessibility-analysis'],
    async run(capability, context, options) {
      if (!provider.isAvailable()) throw new Error('Add and activate an Azure OpenAI profile in Advanced assistance settings first.');
      const content = buildContent(capability, context);
      const result = await request(content, options.signal);
      const text = extractText(result);
      if (capability === 'visual-analysis') return { description: text, summary: 'An image-description draft was created with Azure OpenAI.' };
      if (capability === 'audio-description-draft') return normalizeCues(text);
      return { report: parseJson(text), summary: 'Advanced accessibility analysis completed with Azure OpenAI.' };
    }
  };

  function normalizeStored(value) {
    if (value && Array.isArray(value.profiles)) return { profiles: value.profiles, activeProfileId: value.activeProfileId || (value.profiles[0] && value.profiles[0].id) || '' };
    if (value && (value.endpoint || value.deployment || value.apiKey)) {
      const migrated = { id: createId(), name: 'Azure resource 1', endpoint: value.endpoint || '', deployment: value.deployment || '', apiKey: value.apiKey || '', lastTestedAt: '', lastTestStatus: '' };
      return { profiles: [migrated], activeProfileId: migrated.id };
    }
    return { profiles: [], activeProfileId: '' };
  }

  function createId() { return `azure-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }
  function getActiveProfile() { return configuration.profiles.find((item) => item.id === configuration.activeProfileId) || null; }

  function buildContent(capability, context) {
    const parts = [];
    if (capability === 'visual-analysis') parts.push({ type: 'input_text', text: 'Write a concise, objective image description for accessibility. Return only the description.' });
    else if (capability === 'audio-description-draft') parts.push({ type: 'input_text', text: `Create a JSON array of concise audio-description cues with start, end, text, and placement. Duration is ${context.durationSeconds || 0} seconds. Transcript context: ${String(context.transcriptText || '').slice(0, 8000)}` });
    else parts.push({ type: 'input_text', text: `Return JSON with scores and findings for media accessibility quality. Context: ${JSON.stringify(context.knowledge || {}).slice(0, 12000)}` });
    if (context.sourceData && context.sourceData.base64 && String(context.sourceData.mimeType || '').startsWith('image/')) parts.push({ type: 'input_image', image_url: `data:${context.sourceData.mimeType};base64,${context.sourceData.base64}` });
    return [{ role: 'user', content: parts }];
  }

  async function request(input, signal, profileOverride) {
    const profile = profileOverride || getActiveProfile();
    if (!profile) throw new Error('No active Azure OpenAI profile is configured.');
    const base = profile.endpoint.replace(/\/+$/, '');
    const url = `${base}/openai/v1/responses`;
    const response = await fetch(url, { method: 'POST', signal, headers: { 'Content-Type': 'application/json', 'api-key': profile.apiKey }, body: JSON.stringify({ model: profile.deployment, input }) });
    let result = {};
    try { result = await response.json(); } catch (error) {}
    if (!response.ok) throw new Error(result.error && result.error.message ? result.error.message : `Azure OpenAI returned HTTP ${response.status}.`);
    return result;
  }

  function extractText(result) { if (typeof result.output_text === 'string') return result.output_text.trim(); return (result.output || []).flatMap((item) => item.content || []).map((item) => item.text || '').filter(Boolean).join('\n').trim(); }
  function parseJson(text) { return JSON.parse(String(text || '').replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')); }
  function normalizeCues(text) { const parsed = parseJson(text); const cues = Array.isArray(parsed) ? parsed : parsed.cues; if (!Array.isArray(cues)) throw new Error('Azure OpenAI did not return usable audio-description cues.'); return { cues, summary: `${cues.length} audio-description cues were drafted with Azure OpenAI for human review.` }; }

  async function configure(next) {
    const existing = getActiveProfile() || {};
    const id = next.profileId || existing.id || createId();
    const profile = {
      id,
      name: String(next.name || existing.name || `Azure resource ${configuration.profiles.length + 1}`).trim(),
      endpoint: String(next.endpoint || '').trim().replace(/\/+$/, ''),
      deployment: String(next.deployment || '').trim(),
      apiKey: String(next.apiKey || '').trim() || existing.apiKey || '',
      lastTestedAt: existing.lastTestedAt || '',
      lastTestStatus: existing.lastTestStatus || ''
    };
    if (profile.endpoint && !/^https:\/\//i.test(profile.endpoint)) throw new Error('Azure endpoint must use HTTPS.');
    configuration.profiles = configuration.profiles.filter((item) => item.id !== id).concat(profile);
    configuration.activeProfileId = id;
    await persist();
    ready = true;
    return getConfiguration();
  }

  async function setActiveProfile(profileId) { if (!configuration.profiles.some((item) => item.id === profileId)) throw new Error('That Azure profile was not found.'); configuration.activeProfileId = profileId; await persist(); return getConfiguration(); }
  async function removeProfile(profileId) { configuration.profiles = configuration.profiles.filter((item) => item.id !== profileId); if (configuration.activeProfileId === profileId) configuration.activeProfileId = (configuration.profiles[0] && configuration.profiles[0].id) || ''; await persist(); return getConfiguration(); }
  function getConfiguration() { const active = getActiveProfile(); return { profiles: configuration.profiles.map((item) => ({ id: item.id, name: item.name, endpoint: item.endpoint, deployment: item.deployment, hasApiKey: Boolean(item.apiKey), lastTestedAt: item.lastTestedAt || '', lastTestStatus: item.lastTestStatus || '' })), activeProfileId: configuration.activeProfileId, endpoint: active ? active.endpoint : '', deployment: active ? active.deployment : '', hasApiKey: Boolean(active && active.apiKey), ready }; }
  async function clear() { configuration = { profiles: [], activeProfileId: '' }; ready = true; await window.SecureCredentialStore.remove(STORE_ID); }
  async function testConnection(signal) { const profile = getActiveProfile(); await request([{ role: 'user', content: [{ type: 'input_text', text: 'Reply with the single word Connected.' }] }], signal, profile); profile.lastTestedAt = new Date().toISOString(); profile.lastTestStatus = 'Connected'; await persist(); return { message: `Azure OpenAI profile ${profile.name} responded successfully.` }; }
  async function persist() { await window.SecureCredentialStore.save(STORE_ID, configuration); }
  async function initialize() { configuration = normalizeStored(await window.SecureCredentialStore.load(STORE_ID)); ready = true; if (configuration.profiles.length) await persist(); document.dispatchEvent(new CustomEvent('provider-credentials-ready')); }

  window.AzureOpenAIProvider = { configure, getConfiguration, clear, testConnection, initialize, setActiveProfile, removeProfile };
  window.AIProviderLayer.register(provider);
  initialize();
})();
