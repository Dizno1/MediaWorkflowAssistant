(function () {
  const STORAGE_KEY = 'media-workflow-assistant-ai-provider';
  const providers = new Map();
  const listeners = new Set();
  let selectedProviderId = loadSelection();

  function register(provider) {
    if (!provider || !provider.id || typeof provider.getCapabilities !== 'function' || typeof provider.run !== 'function') {
      throw new Error('AI providers must include an id, capabilities, and a run function.');
    }
    providers.set(provider.id, provider);
    if (!selectedProviderId) selectedProviderId = provider.id;
    notify();
    return provider;
  }

  function unregister(providerId) {
    providers.delete(providerId);
    if (selectedProviderId === providerId) selectedProviderId = providers.keys().next().value || '';
    notify();
  }

  function list() {
    return Array.from(providers.values()).map(describe);
  }

  function describe(provider) {
    const capabilities = provider.getCapabilities();
    return {
      id: provider.id,
      name: provider.name || provider.id,
      kind: provider.kind || 'AI provider',
      description: provider.description || '',
      privacy: provider.privacy || '',
      available: provider.isAvailable ? Boolean(provider.isAvailable()) : true,
      capabilities: Array.isArray(capabilities) ? capabilities.slice() : [],
      selected: provider.id === selectedProviderId
    };
  }

  function select(providerId) {
    if (!providers.has(providerId)) throw new Error('That AI provider is not registered.');
    selectedProviderId = providerId;
    try { localStorage.setItem(STORAGE_KEY, providerId); } catch (error) {}
    notify();
    return getSelected();
  }

  function getSelected() {
    return providers.get(selectedProviderId) || providers.values().next().value || null;
  }

  function getProviderFor(capability) {
    const selected = getSelected();
    if (supports(selected, capability)) return selected;
    return Array.from(providers.values()).find((provider) => supports(provider, capability)) || null;
  }

  function getCapability(capability) {
    const provider = getProviderFor(capability);
    if (!provider) return { capability, canRun: false, provider: null, message: 'No AI provider supports this assistance yet.' };
    const available = provider.isAvailable ? Boolean(provider.isAvailable()) : true;
    return {
      capability,
      canRun: available,
      provider: describe(provider),
      message: available ? `${provider.name} is ready.` : `${provider.name} needs configuration.`
    };
  }

  async function run(capability, context, options = {}) {
    const provider = options.providerId ? providers.get(options.providerId) : getProviderFor(capability);
    if (!provider || !supports(provider, capability)) throw new Error('No compatible AI provider is available for this assistance.');
    if (provider.isAvailable && !provider.isAvailable()) throw new Error(`${provider.name} is not configured.`);
    const result = await provider.run(capability, sanitizeContext(context), options);
    if (!result || typeof result !== 'object') throw new Error('The AI provider returned an invalid result.');
    return { ...result, providerId: provider.id, providerName: provider.name, capability };
  }

  function supports(provider, capability) {
    if (!provider) return false;
    if (provider.isAvailable && !provider.isAvailable()) return false;
    return provider.getCapabilities().includes(capability);
  }

  function sanitizeContext(context) {
    const value = context || {};
    return {
      sourceName: String(value.sourceName || ''),
      mediaType: String(value.mediaType || ''),
      durationSeconds: Number(value.durationSeconds) || 0,
      transcriptText: String(value.transcriptText || ''),
      captionCues: Array.isArray(value.captionCues) ? value.captionCues.map((cue) => ({ start: String(cue.start || ''), end: String(cue.end || ''), text: String(cue.text || '') })) : [],
      knowledge: value.knowledge && typeof value.knowledge === 'object' ? value.knowledge : {}
    };
  }

  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function notify() {
    const snapshot = list();
    listeners.forEach((listener) => listener(snapshot));
  }

  function loadSelection() {
    try { return localStorage.getItem(STORAGE_KEY) || ''; } catch (error) { return ''; }
  }

  window.AIProviderLayer = { register, unregister, list, select, getSelected, getCapability, run, subscribe };
})();
