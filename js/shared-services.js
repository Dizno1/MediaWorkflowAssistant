(function () {
  const STORE_ID = 'odd-shared-services';
  const HANDLE_DB = 'odd-shared-services-handles';
  const HANDLE_STORE = 'directory-handles';
  const HANDLE_ID = 'apps-root';
  const KNOWN_FILES = [
    'providers.json', 'openai.json', 'gemini.key',
    'azure_speech.key', 'azure_speech.region',
    'azure_vision.key', 'azure_vision.region', 'azure_vision.endpoint'
  ];
  let configuration = { azureSpeech: {}, azureVision: {}, importedAt: '', sourceLabel: '' };
  let ready = false;
  let directoryRemembered = false;

  function clean(value) { return String(value == null ? '' : value).trim().replace(/^['"]|['"]$/g, ''); }
  function base64Blob(base64, mimeType) {
    const binary = atob(base64); const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mimeType || 'application/octet-stream' });
  }
  function findDeep(value, names) {
    if (!value || typeof value !== 'object') return '';
    for (const [key, item] of Object.entries(value)) {
      if (names.includes(String(key).toLowerCase()) && typeof item === 'string' && item.trim()) return item.trim();
    }
    for (const item of Object.values(value)) {
      if (item && typeof item === 'object') { const found = findDeep(item, names); if (found) return found; }
    }
    return '';
  }
  // Identify a credential's likely provider by its own format, so a generically-named "key"
  // property found anywhere inside a multi-provider configuration file is never blindly
  // assigned to whichever provider's importer happened to go looking for it.
  function classifyKeyFormat(value) {
    const key = clean(value);
    if (!key) return 'empty';
    if (/^sk-ant-/i.test(key)) return 'anthropic';
    if (/^sk-/i.test(key)) return 'openai';
    if (/^pplx-/i.test(key)) return 'perplexity';
    if (/^AIza/i.test(key)) return 'gemini';
    return 'unrecognized';
  }
  function findTypedKey(value, names, expectedProvider) {
    const candidate = findDeep(value, names);
    if (!candidate) return { key: '', rejectedProvider: '' };
    const format = classifyKeyFormat(candidate);
    if (format !== expectedProvider && format !== 'unrecognized') return { key: '', rejectedProvider: format };
    return { key: candidate, rejectedProvider: '' };
  }
  function parseJsonOrText(text) { try { return JSON.parse(text); } catch (error) { return clean(text); } }
  async function readFileMap(files) {
    const map = new Map();
    for (const file of Array.from(files || [])) map.set(file.name.toLowerCase(), await file.text());
    return map;
  }
  function parseOpenAI(text) {
    const value = parseJsonOrText(text);
    if (typeof value === 'string') {
      const format = classifyKeyFormat(value);
      if (format !== 'openai' && format !== 'unrecognized') return { apiKey: '', rejectedProvider: format };
      return { apiKey: clean(value) };
    }
    const found = findTypedKey(value, ['apikey', 'api_key', 'key', 'openai_api_key'], 'openai');
    return {
      apiKey: found.key,
      rejectedProvider: found.rejectedProvider,
      transcriptionModel: findDeep(value, ['transcriptionmodel', 'transcription_model']) || 'gpt-4o-mini-transcribe',
      visionModel: findDeep(value, ['visionmodel', 'vision_model', 'imagemodel', 'image_model']) || 'gpt-4.1-mini'
    };
  }
  function parseProviders(text) { const value = parseJsonOrText(text); return value && typeof value === 'object' ? value : {}; }
  function normalizeEndpoint(value) { return clean(value).replace(/\/+$/, ''); }

  function openHandleDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(HANDLE_DB, 1);
      request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(HANDLE_STORE)) request.result.createObjectStore(HANDLE_STORE); };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('The saved folder permission store could not be opened.'));
    });
  }
  async function saveDirectoryHandle(handle) {
    const db = await openHandleDatabase();
    try {
      await new Promise((resolve, reject) => {
        const tx = db.transaction(HANDLE_STORE, 'readwrite');
        tx.objectStore(HANDLE_STORE).put(handle, HANDLE_ID);
        tx.oncomplete = resolve; tx.onerror = () => reject(tx.error);
      });
    } finally { db.close(); }
  }
  async function loadDirectoryHandle() {
    const db = await openHandleDatabase();
    try {
      return await new Promise((resolve, reject) => {
        const request = db.transaction(HANDLE_STORE, 'readonly').objectStore(HANDLE_STORE).get(HANDLE_ID);
        request.onsuccess = () => resolve(request.result || null); request.onerror = () => reject(request.error);
      });
    } finally { db.close(); }
  }
  async function clearDirectoryHandle() {
    const db = await openHandleDatabase();
    try {
      await new Promise((resolve, reject) => {
        const tx = db.transaction(HANDLE_STORE, 'readwrite'); tx.objectStore(HANDLE_STORE).delete(HANDLE_ID);
        tx.oncomplete = resolve; tx.onerror = () => reject(tx.error);
      });
    } finally { db.close(); }
  }

  function providerLabel(format) {
    return { openai: 'OpenAI', anthropic: 'Anthropic', perplexity: 'Perplexity', gemini: 'Gemini' }[format] || format;
  }

  async function importFiles(files, sourceLabel) {
    const map = await readFileMap(files);
    const found = KNOWN_FILES.filter((name) => map.has(name));
    if (!found.length) throw new Error('No recognized Open Door Design provider files were found in that selection.');
    const providers = map.has('providers.json') ? parseProviders(map.get('providers.json')) : {};
    const results = [];
    const rejected = [];

    if (map.has('openai.json')) {
      const openai = parseOpenAI(map.get('openai.json'));
      if (openai.apiKey) { await window.OpenAIProvider.configure(openai); results.push('OpenAI'); }
      else if (openai.rejectedProvider) rejected.push(`OpenAI (openai.json appears to contain a ${providerLabel(openai.rejectedProvider)} key, not an OpenAI key; it was not imported)`);
    }
    if (map.has('gemini.key')) {
      const rawKey = map.get('gemini.key');
      const format = classifyKeyFormat(rawKey);
      if (format !== 'gemini' && format !== 'unrecognized') {
        rejected.push(`Gemini (gemini.key appears to contain a ${providerLabel(format)} key, not a Gemini key; it was not imported)`);
      } else {
        const apiKey = clean(rawKey);
        const model = findDeep(providers, ['geminimodel', 'gemini_model', 'model']) || 'gemini-2.5-flash';
        if (apiKey) { await window.GeminiProvider.configure({ apiKey, model }); results.push('Gemini'); }
      }
    }

    const speech = { apiKey: clean(map.get('azure_speech.key') || ''), region: clean(map.get('azure_speech.region') || '') };
    const vision = { apiKey: clean(map.get('azure_vision.key') || ''), region: clean(map.get('azure_vision.region') || ''), endpoint: normalizeEndpoint(map.get('azure_vision.endpoint') || '') };
    configuration = {
      azureSpeech: speech.apiKey && speech.region ? speech : configuration.azureSpeech || {},
      azureVision: vision.apiKey && vision.endpoint ? vision : configuration.azureVision || {},
      importedAt: new Date().toISOString(), sourceLabel: sourceLabel || 'Selected provider files'
    };
    await window.SecureCredentialStore.save(STORE_ID, configuration);
    if (speech.apiKey && speech.region) results.push('Azure Speech');
    if (vision.apiKey && vision.endpoint) results.push('Azure Vision');
    ready = true;
    document.dispatchEvent(new CustomEvent('shared-services-updated'));
    document.dispatchEvent(new CustomEvent('provider-credentials-ready'));
    return { found, imported: results, rejected, missing: found.filter((name) => !map.get(name).trim()), sourceLabel: configuration.sourceLabel };
  }

  async function filesFromDirectory(directoryHandle) {
    const files = [];
    for await (const entry of directoryHandle.values()) {
      if (entry.kind === 'file' && KNOWN_FILES.includes(entry.name.toLowerCase())) files.push(await entry.getFile());
    }
    return files;
  }
  async function findNamedDirectory(parent, name) {
    for await (const entry of parent.values()) if (entry.kind === 'directory' && entry.name.toLowerCase() === name.toLowerCase()) return entry;
    return null;
  }
  async function discoverProviderDirectory(rootHandle) {
    if (rootHandle.name.toLowerCase() === 'sharedservices') return { handle: rootHandle, label: rootHandle.name };
    const shared = await findNamedDirectory(rootHandle, 'SharedServices');
    if (shared) return { handle: shared, label: `${rootHandle.name}\\${shared.name}` };

    const knownApps = ['ODD-AD-Author', 'ODD-SR-Doc-Remediator'];
    for (const appName of knownApps) {
      const app = await findNamedDirectory(rootHandle, appName);
      if (!app) continue;
      const data = await findNamedDirectory(app, 'data');
      if (data && (await filesFromDirectory(data)).length) return { handle: data, label: `${rootHandle.name}\\${app.name}\\${data.name}` };
    }
    throw new Error('No SharedServices folder or recognized Open Door Design provider data folder was found inside the selected folder. Select the Apps folder that contains SharedServices.');
  }
  async function importFromRootHandle(rootHandle) {
    const discovered = await discoverProviderDirectory(rootHandle);
    const files = await filesFromDirectory(discovered.handle);
    return importFiles(files, discovered.label);
  }
  async function chooseAppsDirectory() {
    if (!window.showDirectoryPicker) throw new Error('This browser does not support folder selection. Use the provider-file import control instead.');
    const handle = await window.showDirectoryPicker({ mode: 'read', id: 'odd-apps-root' });
    const result = await importFromRootHandle(handle);
    await saveDirectoryHandle(handle);
    directoryRemembered = true;
    document.dispatchEvent(new CustomEvent('shared-services-updated'));
    return result;
  }
  async function reconnectSavedDirectory() {
    const handle = await loadDirectoryHandle();
    if (!handle) throw new Error('No Open Door Design Apps folder has been remembered yet.');
    let permission = await handle.queryPermission({ mode: 'read' });
    if (permission !== 'granted') permission = await handle.requestPermission({ mode: 'read' });
    if (permission !== 'granted') throw new Error('Folder access was not granted.');
    directoryRemembered = true;
    const result = await importFromRootHandle(handle);
    document.dispatchEvent(new CustomEvent('shared-services-updated'));
    return result;
  }
  async function getDirectoryStatus() {
    const handle = await loadDirectoryHandle();
    directoryRemembered = Boolean(handle);
    if (!handle) return { remembered: false, permission: 'none', name: '' };
    let permission = 'prompt';
    try { permission = await handle.queryPermission({ mode: 'read' }); } catch (error) {}
    return { remembered: true, permission, name: handle.name || 'Apps' };
  }

  const speechProvider = {
    id: 'azure-speech-shared', name: 'Azure Speech from Shared Services', kind: 'shared connected service adapter', external: true,
    description: 'Creates transcript drafts with the Azure Speech resource imported from Open Door Design SharedServices.',
    privacy: 'The selected audio is sent to the configured Azure Speech resource only after confirmation.', costCategory: 'may-charge', requiresConfirmation: true,
    quality: { 'transcription-draft': 95 }, preferredCapabilities: ['transcription-draft'],
    isAvailable: () => ready && directoryRemembered && Boolean(configuration.azureSpeech && configuration.azureSpeech.apiKey && configuration.azureSpeech.region),
    health: () => healthOf('azureSpeech'),
    getCapabilities: () => ['transcription-draft'],
    async run(capability, context, options) {
      if (capability !== 'transcription-draft') throw new Error('Azure Speech does not support that task.');
      const source = context.sourceData; if (!source || !source.base64) throw new Error(window.AIProviderLayer.plainLanguageError('Azure Speech', null, 'config'));
      const region = encodeURIComponent(configuration.azureSpeech.region);
      const url = `https://${region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=en-US&format=detailed`;
      let response;
      try {
        response = await fetch(url, { method: 'POST', signal: options.signal, headers: { 'Ocp-Apim-Subscription-Key': configuration.azureSpeech.apiKey, 'Content-Type': source.mimeType || 'audio/wav', Accept: 'application/json' }, body: base64Blob(source.base64, source.mimeType) });
      } catch (error) {
        if (error && error.name === 'AbortError') throw error;
        throw new Error(window.AIProviderLayer.plainLanguageError('Azure Speech', null, 'network'));
      }
      let result = {}; try { result = await response.json(); } catch (error) {}
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) await recordHealth('azureSpeech', 'Failed');
        // Azure's own error body is not surfaced: only a sanitized, categorized message is shown.
        throw new Error(window.AIProviderLayer.plainLanguageError('Azure Speech', response.status));
      }
      const text = clean(result.DisplayText || (result.NBest && result.NBest[0] && result.NBest[0].Display));
      if (!text) throw new Error('Azure Speech did not return transcript text.');
      return { text, summary: 'A transcript draft was created with Azure Speech. Review it for accuracy and completeness.' };
    }
  };

  const visionProvider = {
    id: 'azure-vision-shared', name: 'Azure Vision from Shared Services', kind: 'shared connected service adapter', external: true,
    description: 'Creates image descriptions and OCR text with the Azure Vision resource imported from Open Door Design SharedServices.',
    privacy: 'The selected image is sent to the configured Azure Vision resource only after confirmation.', costCategory: 'may-charge', requiresConfirmation: true,
    quality: { 'visual-analysis': 94, 'ocr': 96 }, preferredCapabilities: ['visual-analysis', 'ocr'],
    isAvailable: () => ready && directoryRemembered && Boolean(configuration.azureVision && configuration.azureVision.apiKey && configuration.azureVision.endpoint),
    health: () => healthOf('azureVision'),
    getCapabilities: () => ['visual-analysis', 'ocr'],
    async run(capability, context, options) {
      const source = context.sourceData; if (!source || !source.base64 || !String(source.mimeType || '').startsWith('image/')) throw new Error(window.AIProviderLayer.plainLanguageError('Azure Vision', null, 'config'));
      const features = capability === 'ocr' ? 'read' : 'caption,read';
      const url = `${configuration.azureVision.endpoint}/computervision/imageanalysis:analyze?api-version=2024-02-01&features=${encodeURIComponent(features)}`;
      let response;
      try {
        response = await fetch(url, { method: 'POST', signal: options.signal, headers: { 'Ocp-Apim-Subscription-Key': configuration.azureVision.apiKey, 'Content-Type': 'application/octet-stream' }, body: base64Blob(source.base64, source.mimeType) });
      } catch (error) {
        if (error && error.name === 'AbortError') throw error;
        throw new Error(window.AIProviderLayer.plainLanguageError('Azure Vision', null, 'network'));
      }
      let result = {}; try { result = await response.json(); } catch (error) {}
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) await recordHealth('azureVision', 'Failed');
        throw new Error(window.AIProviderLayer.plainLanguageError('Azure Vision', response.status));
      }
      const caption = clean(result.captionResult && result.captionResult.text);
      const lines = (((result.readResult || {}).blocks || []).flatMap((block) => block.lines || []).map((line) => clean(line.text)).filter(Boolean));
      if (capability === 'ocr') return { text: lines.join('\n'), summary: `${lines.length} text lines were detected with Azure Vision.` };
      const description = [caption, lines.length ? `Visible text: ${lines.join(' ')}` : ''].filter(Boolean).join('\n\n');
      if (!description) throw new Error('Azure Vision did not return a description or readable text.');
      return { description, summary: 'An image-description draft was created with Azure Vision.' };
    }
  };

  // A provider recently confirmed broken by a real connection test or a real authentication
  // failure is scored below a known-working alternative during automatic selection.
  function healthOf(key) {
    const entry = configuration[key] || {};
    if (!entry.apiKey) return { status: 'unknown', testedAt: '' };
    return { status: entry.lastTestStatus === 'Connected' ? 'connected' : entry.lastTestStatus ? 'failed' : 'unknown', testedAt: entry.lastTestedAt || '' };
  }
  async function recordHealth(key, status) {
    if (!configuration[key]) configuration[key] = {};
    configuration[key].lastTestStatus = status;
    configuration[key].lastTestedAt = new Date().toISOString();
    await window.SecureCredentialStore.save(STORE_ID, configuration);
  }

  function isLikelyAzureEndpoint(endpoint) {
    return /^https:\/\/[a-z0-9-]+\.cognitiveservices\.azure\.com$/i.test(endpoint) || /^https:\/\/[a-z0-9-]+\.[a-z0-9.-]*azure\.com$/i.test(endpoint);
  }

  async function testAzureSpeech(signal) {
    if (!speechProvider.isAvailable()) throw new Error('Azure Speech is not configured.');
    const region = encodeURIComponent(configuration.azureSpeech.region);
    let response;
    try {
      response = await fetch(`https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`, { method: 'POST', signal, headers: { 'Ocp-Apim-Subscription-Key': configuration.azureSpeech.apiKey, 'Content-Length': '0' } });
    } catch (error) {
      if (error && error.name === 'AbortError') throw error;
      await recordHealth('azureSpeech', 'Failed');
      throw new Error('Network request failed while reaching Azure Speech. Check the internet connection and the configured region.');
    }
    if (response.status === 401 || response.status === 403) { await recordHealth('azureSpeech', 'Failed'); throw new Error('Authentication failed. The saved Azure Speech key was rejected.'); }
    if (!response.ok) { await recordHealth('azureSpeech', 'Failed'); throw new Error(`Azure Speech connection test returned HTTP ${response.status}.`); }
    await recordHealth('azureSpeech', 'Connected');
    return { message: 'Connected.' };
  }
  async function testAzureVision(signal) {
    if (!visionProvider.isAvailable()) throw new Error('Azure Vision is not configured.');
    const endpoint = configuration.azureVision.endpoint;
    if (!/^https:\/\//i.test(endpoint)) throw new Error('Malformed endpoint. The Azure Vision endpoint must be a complete https address, for example https://your-resource.cognitiveservices.azure.com.');
    let response;
    try {
      response = await fetch(`${endpoint}/computervision/models?api-version=2024-02-01`, { signal, headers: { 'Ocp-Apim-Subscription-Key': configuration.azureVision.apiKey } });
    } catch (error) {
      if (error && error.name === 'AbortError') throw error;
      await recordHealth('azureVision', 'Failed');
      if (!isLikelyAzureEndpoint(endpoint)) throw new Error('Malformed endpoint. Check the Azure Vision endpoint address and try again.');
      throw new Error('Network request failed. This may be a genuine connectivity problem, or Azure Vision may not allow this request directly from a browser (a cross-origin restriction). Browser-direct Azure Vision access is a known limitation; a local helper or backend would be required to work around it.');
    }
    if (response.status === 401 || response.status === 403) { await recordHealth('azureVision', 'Failed'); throw new Error('Authentication failed. The saved Azure Vision key was rejected.'); }
    if (response.status === 404) { await recordHealth('azureVision', 'Connected'); return { message: 'Connected. The endpoint is reachable and credentials were accepted.' }; }
    if (!response.ok) { await recordHealth('azureVision', 'Failed'); throw new Error(`Azure Vision connection test returned HTTP ${response.status}.`); }
    await recordHealth('azureVision', 'Connected');
    return { message: 'Connected.' };
  }
  async function testAllConnections() {
    const tests = [];
    if (window.OpenAIProvider.getConfiguration().hasApiKey) tests.push(['OpenAI', () => window.OpenAIProvider.testConnection()]);
    if (window.GeminiProvider.getConfiguration().hasApiKey) tests.push(['Gemini', () => window.GeminiProvider.testConnection()]);
    if (speechProvider.isAvailable()) tests.push(['Azure Speech', () => testAzureSpeech()]);
    if (visionProvider.isAvailable()) tests.push(['Azure Vision', () => testAzureVision()]);
    const results = [];
    for (const [name, test] of tests) {
      try { await test(); results.push({ name, ok: true }); }
      catch (error) { results.push({ name, ok: false, message: error.message }); }
    }
    return results;
  }
  function getConfiguration() {
    return { hasAzureSpeech: speechProvider.isAvailable(), hasAzureVision: visionProvider.isAvailable(), region: configuration.azureSpeech && configuration.azureSpeech.region || '', visionEndpoint: configuration.azureVision && configuration.azureVision.endpoint || '', importedAt: configuration.importedAt || '', sourceLabel: configuration.sourceLabel || '' };
  }
  async function initialize() {
    configuration = await window.SecureCredentialStore.load(STORE_ID) || { azureSpeech: {}, azureVision: {} };
    directoryRemembered = Boolean(await loadDirectoryHandle());
    ready = true;
    document.dispatchEvent(new CustomEvent('shared-services-updated'));
  }
  async function clear() { configuration = { azureSpeech: {}, azureVision: {}, importedAt: '', sourceLabel: '' }; directoryRemembered = false; await window.SecureCredentialStore.remove(STORE_ID); await clearDirectoryHandle(); document.dispatchEvent(new CustomEvent('shared-services-updated')); }
  function transcribe(context, options) { return window.AIProviderLayer.run('transcription-draft', context, options); }
  function describeImage(context, options) { return window.AIProviderLayer.run('visual-analysis', context, options); }
  function performOCR(context, options) { return window.AIProviderLayer.run('ocr', context, options); }

  window.AIProviderLayer.register(speechProvider); window.AIProviderLayer.register(visionProvider);
  window.ODDSharedServices = { chooseAppsDirectory, reconnectSavedDirectory, getDirectoryStatus, importFiles, getConfiguration, testAzureSpeech, testAzureVision, testAllConnections, clear, transcribe, describeImage, performOCR, knownFiles: KNOWN_FILES.slice() };
  initialize();
})();
