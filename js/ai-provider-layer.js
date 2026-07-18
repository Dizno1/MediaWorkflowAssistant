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
      health: typeof provider.health === 'function' ? (safeHealth(provider)) : { status: 'unknown', testedAt: '' },
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
    const candidates = Array.from(providers.values()).filter((provider) => supports(provider, capability));
    // A provider whose most recent real test or real usage attempt failed must not win automatic
    // selection over a healthy or untested alternative. If every compatible provider has failed
    // health, none are silently retried automatically; the caller sees "no available method" and
    // the person can re-test or manually select a specific provider to retry it.
    const notFailed = candidates.filter((provider) => healthScore(provider) === 0);
    const pool = notFailed.length ? notFailed : (candidates.length ? [] : candidates);
    return pool.sort((a, b) => score(b, capability) - score(a, capability))[0] || null;
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
    let result;
    try {
      result = await provider.run(capability, sanitizeContext(context), options);
    } catch (error) {
      if (error && error.name !== 'AbortError') { error.providerId = provider.id; error.providerName = provider.name; error.capability = capability; }
      throw error;
    }
    if (!result || typeof result !== 'object') throw new Error('The assistance service returned an invalid result.');
    return { ...result, providerId: provider.id, providerName: provider.name, capability, costCategory: description.costCategory, external: description.external };
  }

  function safeHealth(provider) {
    try { return provider.health() || { status: 'unknown', testedAt: '' }; } catch (error) { return { status: 'unknown', testedAt: '' }; }
  }

  function score(provider, capability) {
    const quality = provider.quality && Number(provider.quality[capability]) || 50;
    const privacy = provider.external ? 0 : 35;
    const cost = provider.costCategory === 'no-additional-cost' ? 30 : provider.costCategory === 'included' ? 20 : provider.costCategory === 'may-charge' ? -20 : -10;
    const preferred = provider.preferredCapabilities && provider.preferredCapabilities.includes(capability) ? 15 : 0;
    const health = healthScore(provider);
    return quality + privacy + cost + preferred + health;
  }

  // A provider that most recently failed a real connection test is scored below one that is
  // known-working or untested, so a demonstrably broken credential does not keep winning
  // automatic selection over a healthy alternative. Unknown/untested health has no effect.
  function healthScore(provider) {
    if (typeof provider.health !== 'function') return 0;
    let info; try { info = provider.health(); } catch (error) { return 0; }
    if (!info || info.status !== 'failed') return 0;
    return -40;
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
      narrationCues: Array.isArray(value.narrationCues) ? value.narrationCues.map((cue) => ({ start: String(cue.start || ''), end: String(cue.end || ''), text: String(cue.text || ''), placement: String(cue.placement || '') })) : [],
      narrationVoice: String(value.narrationVoice || 'alloy'),
      narrationSpeed: Number(value.narrationSpeed) || 1,
      knowledge: value.knowledge && typeof value.knowledge === 'object' ? value.knowledge : {},
      sourceData: value.sourceData && typeof value.sourceData === 'object' ? {
        name: String(value.sourceData.name || ''),
        mimeType: String(value.sourceData.mimeType || ''),
        size: Number(value.sourceData.size) || 0,
        base64: String(value.sourceData.base64 || '')
      } : null
    };
  }

  // Provider response bodies are never safe to show verbatim: some providers echo back a
  // masked fragment of the submitted credential in their own error text (for example,
  // OpenAI's 401 body includes a truncated copy of the rejected key). Every adapter should
  // call this instead of throwing `result.error.message` or similar raw provider text.
  function plainLanguageError(providerLabel, status, kind) {
    if (kind === 'network') return 'Network unavailable. Check the internet connection and try again.';
    if (kind === 'config') return 'Configuration incomplete. Add the required settings in Provider Manager.';
    if (kind === 'model') return `Unsupported model. ${providerLabel} did not accept the configured model.`;
    if (kind === 'endpoint') return 'Invalid endpoint. Check the configured address in Provider Manager.';
    if (status === 401 || status === 403) return 'Authentication failed. The saved credential was rejected.';
    if (status === 429) return `${providerLabel} reported a rate limit or quota issue. Check the account usage and billing status.`;
    if (status) return `${providerLabel} returned an error (HTTP ${status}). Try again, or check the configuration in Provider Manager.`;
    return `${providerLabel} returned an unexpected error. Try again, or check the configuration in Provider Manager.`;
  }

  function getAlternative(capability, excludeProviderId) {
    const excluded = Array.isArray(excludeProviderId) ? excludeProviderId : [excludeProviderId];
    const alternative = Array.from(providers.values())
      .filter((item) => !excluded.includes(item.id) && supports(item, capability))
      .sort((a, b) => score(b, capability) - score(a, capability))[0];
    return alternative ? describe(alternative) : null;
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

  window.AIProviderLayer = { register, unregister, list, select, getSelectionMode, getProviderFor, getCapability, getExecutionNotice, getAlternative, plainLanguageError, run, subscribe };
})();
