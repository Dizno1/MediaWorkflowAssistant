(function () {
  const STORAGE_KEY = 'media-workflow-assistant-connected-provider';
  let configuration = load();

  const provider = {
    id: 'connected-json',
    get name() { return configuration.serviceName || 'Connected service'; },
    kind: 'connected assistance service',
    description: 'Uses a configured HTTPS service when a task needs capabilities that are not available privately in this browser.',
    privacy: 'Source-derived text and metadata may leave this browser only after a clear confirmation.',
    external: true,
    get costCategory() { return configuration.costCategory || 'may-charge'; },
    get costMessage() { return costMessage(configuration.costCategory || 'may-charge'); },
    requiresConfirmation: true,
    quality: { 'transcription-draft': 90, 'caption-draft': 90, 'visual-analysis': 90, 'audio-description-draft': 90 },
    preferredCapabilities: ['transcription-draft'],
    isAvailable: () => Boolean(configuration.endpoint),
    getCapabilities: () => ['transcription-draft', 'caption-draft', 'visual-analysis', 'audio-description-draft'],
    async run(capability, context, options) {
      if (!configuration.endpoint) throw new Error('Configure a connected service first.');
      const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
      if (configuration.apiKey) headers.Authorization = `Bearer ${configuration.apiKey}`;
      const response = await fetch(configuration.endpoint, {
        method: 'POST', headers, signal: options.signal,
        body: JSON.stringify({ schemaVersion: 1, capability, model: configuration.model || '', context })
      });
      if (!response.ok) throw new Error(`The connected service returned HTTP ${response.status}.`);
      return normalize(capability, await response.json());
    }
  };

  function configure(next) {
    const endpoint = String(next.endpoint || '').trim();
    if (endpoint && !/^https:\/\//i.test(endpoint) && !/^http:\/\/localhost(?::\d+)?(?:\/|$)/i.test(endpoint)) {
      throw new Error('Use an HTTPS endpoint, or localhost for local development.');
    }
    const existingKey = configuration.apiKey || '';
    configuration = {
      serviceName: String(next.serviceName || 'Connected service').trim() || 'Connected service',
      endpoint,
      model: String(next.model || '').trim(),
      apiKey: String(next.apiKey || '').trim() || existingKey,
      costCategory: ['may-charge', 'included', 'no-additional-cost', 'unknown'].includes(next.costCategory) ? next.costCategory : 'may-charge'
    };
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(configuration)); } catch (error) {}
    return getConfiguration();
  }

  function getConfiguration() {
    return { serviceName: configuration.serviceName || 'Connected service', endpoint: configuration.endpoint || '', model: configuration.model || '', costCategory: configuration.costCategory || 'may-charge', hasApiKey: Boolean(configuration.apiKey) };
  }

  async function testConnection(signal) {
    if (!configuration.endpoint) throw new Error('Save an endpoint before testing the connection.');
    const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
    if (configuration.apiKey) headers.Authorization = `Bearer ${configuration.apiKey}`;
    const response = await fetch(configuration.endpoint, {
      method: 'POST', headers, signal,
      body: JSON.stringify({ schemaVersion: 1, capability: 'connection-test', model: configuration.model || '', context: {} })
    });
    if (!response.ok) throw new Error(`Connection test returned HTTP ${response.status}.`);
    return { ok: true, message: `${provider.name} responded successfully.` };
  }

  function clear() {
    configuration = {};
    try { sessionStorage.removeItem(STORAGE_KEY); } catch (error) {}
  }

  function load() {
    try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}'); } catch (error) { return {}; }
  }

  function costMessage(category) {
    if (category === 'no-additional-cost') return 'No additional usage charge';
    if (category === 'included') return 'Included in an existing account';
    if (category === 'unknown') return 'Cost is unknown';
    return 'May charge for usage';
  }

  function normalize(capability, result) {
    if (capability === 'transcription-draft' && typeof result.text !== 'string') throw new Error('The service response must include transcript text.');
    if ((capability === 'caption-draft' || capability === 'audio-description-draft') && !Array.isArray(result.cues)) throw new Error('The service response must include a cues array.');
    if (capability === 'visual-analysis' && typeof result.description !== 'string' && typeof result.text !== 'string') throw new Error('The service response must include an image description.');
    if (capability === 'visual-analysis' && typeof result.description !== 'string') result.description = result.text;
    return result;
  }

  window.ConnectedAIProvider = { configure, getConfiguration, testConnection, clear };
  window.AIProviderLayer.register(provider);
})();
