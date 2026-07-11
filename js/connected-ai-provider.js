(function () {
  const STORAGE_KEY = 'media-workflow-assistant-connected-provider';
  let configuration = load();

  const provider = {
    id: 'connected-json',
    name: 'Connected JSON Provider',
    kind: 'connected AI service',
    description: 'Sends an accessibility assistance request to a user-configured HTTPS endpoint and returns standardized draft data.',
    privacy: 'Source-derived text and metadata leave this browser only when you deliberately request assistance.',
    isAvailable: () => Boolean(configuration.endpoint),
    getCapabilities: () => ['transcription-draft', 'caption-draft', 'visual-analysis', 'audio-description-draft'],
    async run(capability, context, options) {
      if (!configuration.endpoint) throw new Error('Configure the connected provider endpoint first.');
      const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
      if (configuration.apiKey) headers.Authorization = `Bearer ${configuration.apiKey}`;
      const response = await fetch(configuration.endpoint, {
        method: 'POST',
        headers,
        signal: options.signal,
        body: JSON.stringify({ schemaVersion: 1, capability, model: configuration.model || '', context })
      });
      if (!response.ok) throw new Error(`The connected provider returned HTTP ${response.status}.`);
      const result = await response.json();
      return normalize(capability, result);
    }
  };

  function configure(next) {
    const endpoint = String(next.endpoint || '').trim();
    if (endpoint && !/^https:\/\//i.test(endpoint) && !/^http:\/\/localhost(?::\d+)?(?:\/|$)/i.test(endpoint)) {
      throw new Error('Use an HTTPS endpoint, or localhost for local development.');
    }
    configuration = { endpoint, model: String(next.model || '').trim(), apiKey: String(next.apiKey || '').trim() };
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(configuration)); } catch (error) {}
    return getConfiguration();
  }

  function getConfiguration() {
    return { endpoint: configuration.endpoint || '', model: configuration.model || '', hasApiKey: Boolean(configuration.apiKey) };
  }

  function clear() {
    configuration = { endpoint: '', model: '', apiKey: '' };
    try { sessionStorage.removeItem(STORAGE_KEY); } catch (error) {}
  }

  function load() {
    try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}'); } catch (error) { return {}; }
  }

  function normalize(capability, result) {
    if (capability === 'transcription-draft' && typeof result.text !== 'string') throw new Error('The provider response must include transcript text.');
    if ((capability === 'caption-draft' || capability === 'audio-description-draft') && !Array.isArray(result.cues)) throw new Error('The provider response must include a cues array.');
    return result;
  }

  window.ConnectedAIProvider = { configure, getConfiguration, clear };
  window.AIProviderLayer.register(provider);
})();
