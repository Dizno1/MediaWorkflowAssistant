(function () {
  const STORE_ID = 'odd-shared-services';
  const KNOWN_FILES = [
    'providers.json', 'openai.json', 'gemini.key',
    'azure_speech.key', 'azure_speech.region',
    'azure_vision.key', 'azure_vision.region', 'azure_vision.endpoint'
  ];
  let configuration = { azureSpeech: {}, azureVision: {}, importedAt: '', sourceLabel: '' };
  let ready = false;

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
  function parseJsonOrText(text) { try { return JSON.parse(text); } catch (error) { return clean(text); } }
  async function readFileMap(files) {
    const map = new Map();
    for (const file of Array.from(files || [])) map.set(file.name.toLowerCase(), await file.text());
    return map;
  }
  function parseOpenAI(text) {
    const value = parseJsonOrText(text);
    if (typeof value === 'string') return { apiKey: clean(value) };
    return {
      apiKey: findDeep(value, ['apikey', 'api_key', 'key', 'openai_api_key']),
      transcriptionModel: findDeep(value, ['transcriptionmodel', 'transcription_model']) || 'gpt-4o-mini-transcribe',
      visionModel: findDeep(value, ['visionmodel', 'vision_model', 'imagemodel', 'image_model']) || 'gpt-4.1-mini'
    };
  }
  function parseProviders(text) { const value = parseJsonOrText(text); return value && typeof value === 'object' ? value : {}; }
  function normalizeEndpoint(value) { return clean(value).replace(/\/+$/, ''); }

  async function importFiles(files, sourceLabel) {
    const map = await readFileMap(files);
    const found = KNOWN_FILES.filter((name) => map.has(name));
    if (!found.length) throw new Error('No recognized Open Door Design provider files were found in that selection.');
    const providers = map.has('providers.json') ? parseProviders(map.get('providers.json')) : {};
    const results = [];

    if (map.has('openai.json')) {
      const openai = parseOpenAI(map.get('openai.json'));
      if (openai.apiKey) { await window.OpenAIProvider.configure(openai); results.push('OpenAI'); }
    }
    if (map.has('gemini.key')) {
      const apiKey = clean(map.get('gemini.key'));
      const model = findDeep(providers, ['geminimodel', 'gemini_model', 'model']) || 'gemini-2.5-flash';
      if (apiKey) { await window.GeminiProvider.configure({ apiKey, model }); results.push('Gemini'); }
    }

    const speech = {
      apiKey: clean(map.get('azure_speech.key') || ''),
      region: clean(map.get('azure_speech.region') || '')
    };
    const vision = {
      apiKey: clean(map.get('azure_vision.key') || ''),
      region: clean(map.get('azure_vision.region') || ''),
      endpoint: normalizeEndpoint(map.get('azure_vision.endpoint') || '')
    };
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
    return { found, imported: results, missing: found.filter((name) => !map.get(name).trim()) };
  }

  async function chooseDirectory() {
    if (!window.showDirectoryPicker) throw new Error('This browser does not support folder selection. Use the file import control instead.');
    const handle = await window.showDirectoryPicker({ mode: 'read' });
    const files = [];
    for await (const entry of handle.values()) {
      if (entry.kind === 'file' && KNOWN_FILES.includes(entry.name.toLowerCase())) files.push(await entry.getFile());
    }
    return importFiles(files, handle.name || 'SharedServices');
  }

  const speechProvider = {
    id: 'azure-speech-shared', name: 'Azure Speech from Shared Services', kind: 'shared connected service adapter', external: true,
    description: 'Creates transcript drafts with the Azure Speech resource imported from Open Door Design SharedServices.',
    privacy: 'The selected audio is sent to the configured Azure Speech resource only after confirmation.', costCategory: 'may-charge', requiresConfirmation: true,
    quality: { 'transcription-draft': 95 }, preferredCapabilities: ['transcription-draft'],
    isAvailable: () => ready && Boolean(configuration.azureSpeech && configuration.azureSpeech.apiKey && configuration.azureSpeech.region),
    getCapabilities: () => ['transcription-draft'],
    async run(capability, context, options) {
      if (capability !== 'transcription-draft') throw new Error('Azure Speech does not support that task.');
      const source = context.sourceData; if (!source || !source.base64) throw new Error('No audio source is available.');
      const region = encodeURIComponent(configuration.azureSpeech.region);
      const url = `https://${region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=en-US&format=detailed`;
      const response = await fetch(url, { method: 'POST', signal: options.signal, headers: { 'Ocp-Apim-Subscription-Key': configuration.azureSpeech.apiKey, 'Content-Type': source.mimeType || 'audio/wav', Accept: 'application/json' }, body: base64Blob(source.base64, source.mimeType) });
      let result = {}; try { result = await response.json(); } catch (error) {}
      if (!response.ok) throw new Error(result.DisplayText || result.Message || `Azure Speech returned HTTP ${response.status}.`);
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
    isAvailable: () => ready && Boolean(configuration.azureVision && configuration.azureVision.apiKey && configuration.azureVision.endpoint),
    getCapabilities: () => ['visual-analysis', 'ocr'],
    async run(capability, context, options) {
      const source = context.sourceData; if (!source || !source.base64 || !String(source.mimeType || '').startsWith('image/')) throw new Error('Azure Vision requires an image source.');
      const features = capability === 'ocr' ? 'read' : 'caption,read';
      const url = `${configuration.azureVision.endpoint}/computervision/imageanalysis:analyze?api-version=2024-02-01&features=${encodeURIComponent(features)}`;
      const response = await fetch(url, { method: 'POST', signal: options.signal, headers: { 'Ocp-Apim-Subscription-Key': configuration.azureVision.apiKey, 'Content-Type': 'application/octet-stream' }, body: base64Blob(source.base64, source.mimeType) });
      let result = {}; try { result = await response.json(); } catch (error) {}
      if (!response.ok) throw new Error(result.error && result.error.message ? result.error.message : `Azure Vision returned HTTP ${response.status}.`);
      const caption = clean(result.captionResult && result.captionResult.text);
      const lines = (((result.readResult || {}).blocks || []).flatMap((block) => block.lines || []).map((line) => clean(line.text)).filter(Boolean));
      if (capability === 'ocr') return { text: lines.join('\n'), summary: `${lines.length} text lines were detected with Azure Vision.` };
      const description = [caption, lines.length ? `Visible text: ${lines.join(' ')}` : ''].filter(Boolean).join('\n\n');
      if (!description) throw new Error('Azure Vision did not return a description or readable text.');
      return { description, summary: 'An image-description draft was created with Azure Vision.' };
    }
  };

  async function testAzureSpeech(signal) {
    if (!speechProvider.isAvailable()) throw new Error('Azure Speech is not configured.');
    const region = encodeURIComponent(configuration.azureSpeech.region);
    const response = await fetch(`https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`, { method: 'POST', signal, headers: { 'Ocp-Apim-Subscription-Key': configuration.azureSpeech.apiKey, 'Content-Length': '0' } });
    if (!response.ok) throw new Error(`Azure Speech connection test returned HTTP ${response.status}.`);
    return { message: 'Azure Speech credentials responded successfully.' };
  }
  async function testAzureVision(signal) {
    if (!visionProvider.isAvailable()) throw new Error('Azure Vision is not configured.');
    const response = await fetch(`${configuration.azureVision.endpoint}/computervision/models?api-version=2024-02-01`, { signal, headers: { 'Ocp-Apim-Subscription-Key': configuration.azureVision.apiKey } });
    if (!response.ok && response.status !== 404) throw new Error(`Azure Vision connection test returned HTTP ${response.status}.`);
    return { message: 'Azure Vision endpoint is reachable and credentials were accepted or the endpoint requires an image request.' };
  }
  function getConfiguration() {
    return { hasAzureSpeech: speechProvider.isAvailable(), hasAzureVision: visionProvider.isAvailable(), region: configuration.azureSpeech && configuration.azureSpeech.region || '', visionEndpoint: configuration.azureVision && configuration.azureVision.endpoint || '', importedAt: configuration.importedAt || '', sourceLabel: configuration.sourceLabel || '' };
  }
  async function initialize() { configuration = await window.SecureCredentialStore.load(STORE_ID) || { azureSpeech: {}, azureVision: {} }; ready = true; document.dispatchEvent(new CustomEvent('shared-services-updated')); }
  async function clear() { configuration = { azureSpeech: {}, azureVision: {}, importedAt: '', sourceLabel: '' }; await window.SecureCredentialStore.remove(STORE_ID); document.dispatchEvent(new CustomEvent('shared-services-updated')); }
  function transcribe(context, options) { return window.AIProviderLayer.run('transcription-draft', context, options); }
  function describeImage(context, options) { return window.AIProviderLayer.run('visual-analysis', context, options); }
  function performOCR(context, options) { return window.AIProviderLayer.run('ocr', context, options); }

  window.AIProviderLayer.register(speechProvider); window.AIProviderLayer.register(visionProvider);
  window.ODDSharedServices = { chooseDirectory, importFiles, getConfiguration, testAzureSpeech, testAzureVision, clear, transcribe, describeImage, performOCR, knownFiles: KNOWN_FILES.slice() };
  initialize();
})();
