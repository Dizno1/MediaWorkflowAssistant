(function () {
  const STORAGE_KEY = 'media-workflow-assistant-ai-provider-mode';
  const providers = new Map();
  const listeners = new Set();
  let selectionMode = loadSelection() || 'automatic';

  function register(provider) {
    if (!provider || !provider.id || typeof provider.getCapabilities !== 'function' || typeof provider.run !== 'function') {
      throw new Error('AI providers must include an id, capabilities, and a run function.');
    }
    providers.set(provider.id, provider);
    notify();
    return provider;
  }

  function unregister(providerId) {
    providers.delete(providerId);
    if (selectionMode === providerId) selectionMode = 'automatic';
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
      kind: provider.kind || 'assistance provider',
      description: provider.description || '',
      privacy: provider.privacy || '',
      costCategory: provider.costCategory || 'unknown',
      costMessage: provider.costMessage || costMessage(provider.costCategory),
      external: Boolean(provider.external),
      requiresConfirmation: Boolean(provider.requiresConfirmation || provider.external || provider.costCategory === 'may-charge' || provider.costCategory === 'unknown'),
      available: provider.isAvailable ? Boolean(provider.isAvailable()) : true,
      capabilities: Array.isArray(capabilities) ? capabilities.slice() : [],
      selected: provider.id === selectionMode
    };
  }

  function select(mode) {
    if (mode !== 'automatic' && !providers.has(mode)) throw new Error('That assistance provider is not registered.');
    selectionMode = mode;
    try { localStorage.setItem(STORAGE_KEY, mode); } catch (error) {}
    notify();
    return getSelectionMode();
  }

  function getSelectionMode() {
    return selectionMode;
  }

  function getProviderFor(capability) {
    if (selectionMode !== 'automatic') {
      const selected = providers.get(selectionMode);
      if (supports(selected, capability)) return selected;
    }
    return Array.from(providers.values())
      .filter((provider) => supports(provider, capability))
      .sort((a, b) => score(b, capability) - score(a, capability))[0] || null;
  }

  function getCapability(capability) {
    const provider = getProviderFor(capability);
    if (!provider) return { capability, canRun: false, provider: null, message: 'No available assistance method can complete this task yet.' };
    const available = provider.isAvailable ? Boolean(provider.isAvailable()) : true;
    const description = describe(provider);
    return {
      capability,
      canRun: available,
      provider: description,
      selectionMode,
      message: available ? plainLanguageReady(description) : 'The available method needs configuration before this task can begin.'
    };
  }

  function getExecutionNotice(capability) {
    const item = getCapability(capability);
    if (!item.canRun || !item.provider) return { ...item, confirmationRequired: false };
    const provider = item.provider;
    const parts = [];
    if (provider.external) parts.push('Information needed for this task will be sent to an outside service.');
    if (provider.costCategory === 'may-charge') parts.push('This service may charge your account for usage.');
    if (provider.costCategory === 'unknown') parts.push('The cost of this service is not known. Check the service account before continuing.');
    if (provider.costCategory === 'included') parts.push('Usage is marked as included in an account you already have. Provider limits may still apply.');
    if (provider.costCategory === 'no-additional-cost') parts.push('This method is marked as having no additional usage charge.');
    if (!provider.external) parts.push('The work stays in this browser.');
    return {
      ...item,
      confirmationRequired: provider.requiresConfirmation,
      notice: parts.join(' '),
      confirmationText: `${parts.join(' ')}\n\nContinue with ${provider.name}?`
    };
  }

  async function run(capability, context, options = {}) {
    const provider = options.providerId ? providers.get(options.providerId) : getProviderFor(capability);
    if (!provider || !supports(provider, capability)) throw new Error('No compatible assistance method is available for this task.');
    if (provider.isAvailable && !provider.isAvailable()) throw new Error('The selected assistance method is not configured.');
    const description = describe(provider);
    if (description.requiresConfirmation && !options.confirmed) {
      throw new Error('Review and confirm the privacy and cost notice before using this service.');
    }
    const result = await provider.run(capability, sanitizeContext(context), options);
    if (!result || typeof result !== 'object') throw new Error('The assistance service returned an invalid result.');
    return { ...result, providerId: provider.id, providerName: provider.name, capability, costCategory: description.costCategory, external: description.external };
  }

  function score(provider, capability) {
    const quality = provider.quality && Number(provider.quality[capability]) || 50;
    const privacy = provider.external ? 0 : 35;
    const cost = provider.costCategory === 'no-additional-cost' ? 30 : provider.costCategory === 'included' ? 20 : provider.costCategory === 'may-charge' ? -20 : -10;
    const preferred = provider.preferredCapabilities && provider.preferredCapabilities.includes(capability) ? 15 : 0;
    return quality + privacy + cost + preferred;
  }

  function supports(provider, capability) {
    if (!provider) return false;
    if (provider.isAvailable && !provider.isAvailable()) return false;
    return provider.getCapabilities().includes(capability);
  }

  function plainLanguageReady(provider) {
    if (!provider.external && provider.costCategory === 'no-additional-cost') return 'A private, no-additional-cost method is ready.';
    if (provider.costCategory === 'may-charge') return 'A connected method is available. You will be warned about possible charges before it runs.';
    return 'An assistance method is ready. You will review its privacy and cost information before it runs.';
  }

  function costMessage(category) {
    if (category === 'no-additional-cost') return 'No additional usage charge';
    if (category === 'included') return 'Included in an existing account';
    if (category === 'may-charge') return 'May charge for usage';
    return 'Cost is unknown';
  }

  function sanitizeContext(context) {
    const value = context || {};
    return {
      sourceName: String(value.sourceName || ''),
      mediaType: String(value.mediaType || ''),
      durationSeconds: Number(value.durationSeconds) || 0,
      transcriptText: String(value.transcriptText || ''),
      captionCues: Array.isArray(value.captionCues) ? value.captionCues.map((cue) => ({ start: String(cue.start || ''), end: String(cue.end || ''), text: String(cue.text || '') })) : [],
      knowledge: value.knowledge && typeof value.knowledge === 'object' ? value.knowledge : {},
      sourceData: value.sourceData && typeof value.sourceData === 'object' ? {
        name: String(value.sourceData.name || ''),
        mimeType: String(value.sourceData.mimeType || ''),
        size: Number(value.sourceData.size) || 0,
        base64: String(value.sourceData.base64 || '')
      } : null
    };
  }

  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function notify() {
    const snapshot = { mode: selectionMode, providers: list() };
    listeners.forEach((listener) => listener(snapshot));
  }

  function loadSelection() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return saved;
      const legacy = localStorage.getItem('media-workflow-assistant-ai-provider');
      return legacy && legacy !== 'local-assist' ? legacy : 'automatic';
    } catch (error) { return 'automatic'; }
  }

  window.AIProviderLayer = { register, unregister, list, select, getSelectionMode, getProviderFor, getCapability, getExecutionNotice, run, subscribe };
})();
