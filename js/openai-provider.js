(function () {
  const STORAGE_KEY = 'media-workflow-assistant-openai-provider';
  let configuration = load();

  const provider = {
    id: 'openai-direct',
    name: 'OpenAI service',
    kind: 'built-in connected service adapter',
    description: 'Directly transcribes audio and video and creates image-description drafts through the OpenAI API.',
    privacy: 'The selected source is sent to OpenAI only after confirmation.',
    external: true,
    costCategory: 'may-charge',
    costMessage: 'May charge for usage',
    requiresConfirmation: true,
    quality: { 'transcription-draft': 96, 'visual-analysis': 96 },
    preferredCapabilities: ['transcription-draft', 'visual-analysis'],
    isAvailable: () => Boolean(configuration.apiKey),
    getCapabilities: () => ['transcription-draft', 'visual-analysis'],
    async run(capability, context, options) {
      if (!configuration.apiKey) throw new Error('Add an OpenAI API key in Advanced assistance settings first.');
      if (!context.sourceData || !context.sourceData.base64) throw new Error('The selected source could not be prepared for processing.');
      if (capability === 'transcription-draft') return transcribe(context, options.signal);
      if (capability === 'visual-analysis') return describeImage(context, options.signal);
      throw new Error('This OpenAI adapter does not support that task.');
    }
  };

  async function transcribe(context, signal) {
    const source = context.sourceData;
    const blob = base64Blob(source.base64, source.mimeType || 'application/octet-stream');
    const form = new FormData();
    form.append('file', blob, source.name || context.sourceName || 'media');
    form.append('model', configuration.transcriptionModel || 'gpt-4o-mini-transcribe');
    form.append('response_format', 'json');
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST', headers: { Authorization: `Bearer ${configuration.apiKey}` }, body: form, signal
    });
    const result = await readJson(response);
    if (typeof result.text !== 'string' || !result.text.trim()) throw new Error('OpenAI did not return transcript text.');
    return { text: result.text.trim(), summary: 'A transcript draft was created from the selected media.' };
  }

  async function describeImage(context, signal) {
    const source = context.sourceData;
    const dataUrl = `data:${source.mimeType || 'image/jpeg'};base64,${source.base64}`;
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${configuration.apiKey}`, 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({
        model: configuration.visionModel || 'gpt-4.1-mini',
        input: [{ role: 'user', content: [
          { type: 'input_text', text: 'Describe this image for a blind or low-vision reader. Be accurate, concise, objective, and include visible text that matters. Do not invent details.' },
          { type: 'input_image', image_url: dataUrl }
        ] }]
      })
    });
    const result = await readJson(response);
    const text = extractResponseText(result);
    if (!text) throw new Error('OpenAI did not return an image description.');
    return { description: text, summary: 'An image-description draft was created from the selected picture.' };
  }

  async function readJson(response) {
    let result = {};
    try { result = await response.json(); } catch (error) {}
    if (!response.ok) throw new Error(result && result.error && result.error.message ? result.error.message : `OpenAI returned HTTP ${response.status}.`);
    return result;
  }

  function extractResponseText(result) {
    if (typeof result.output_text === 'string') return result.output_text.trim();
    const output = Array.isArray(result.output) ? result.output : [];
    return output.flatMap((item) => Array.isArray(item.content) ? item.content : [])
      .map((item) => item.text || item.output_text || '').filter(Boolean).join('\n').trim();
  }

  function base64Blob(base64, mimeType) {
    const binary = atob(base64); const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return new Blob([bytes], { type: mimeType });
  }

  function configure(next) {
    configuration = {
      apiKey: String(next.apiKey || '').trim() || configuration.apiKey || '',
      transcriptionModel: String(next.transcriptionModel || '').trim() || 'gpt-4o-mini-transcribe',
      visionModel: String(next.visionModel || '').trim() || 'gpt-4.1-mini'
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(configuration));
    return getConfiguration();
  }
  function getConfiguration() { return { hasApiKey: Boolean(configuration.apiKey), transcriptionModel: configuration.transcriptionModel || 'gpt-4o-mini-transcribe', visionModel: configuration.visionModel || 'gpt-4.1-mini' }; }
  function clear() { configuration = {}; sessionStorage.removeItem(STORAGE_KEY); }
  function load() { try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}'); } catch (error) { return {}; } }

  window.OpenAIProvider = { configure, getConfiguration, clear };
  window.AIProviderLayer.register(provider);
})();
