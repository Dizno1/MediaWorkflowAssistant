(function () {
  const STORE_ID = 'openai-provider';
  let configuration = {};
  let ready = false;

  const provider = {
    id: 'openai-direct',
    name: 'OpenAI service',
    kind: 'built-in connected service adapter',
    description: 'Directly transcribes media, creates timed caption drafts, analyzes sampled video frames for audio-description drafts, creates image-description drafts, and synthesizes reviewed narration through the OpenAI API.',
    privacy: 'The selected source or locally sampled frames are sent to OpenAI only after confirmation.',
    external: true,
    costCategory: 'may-charge',
    costMessage: 'May charge for usage',
    requiresConfirmation: true,
    quality: { 'transcription-draft': 96, 'caption-draft': 98, 'visual-analysis': 96, 'audio-description-draft': 94, 'narration-audio': 96, 'advanced-accessibility-analysis': 95 },
    preferredCapabilities: ['transcription-draft', 'caption-draft', 'visual-analysis', 'audio-description-draft', 'narration-audio', 'advanced-accessibility-analysis'],
    isAvailable: () => ready && Boolean(configuration.apiKey),
    getCapabilities: () => ['transcription-draft', 'caption-draft', 'visual-analysis', 'audio-description-draft', 'narration-audio', 'advanced-accessibility-analysis'],
    async run(capability, context, options) {
      if (!configuration.apiKey) throw new Error('Add an OpenAI API key in Advanced assistance settings first.');
      if (capability === 'transcription-draft') {
        requireSource(context);
        return transcribe(context, options.signal);
      }
      if (capability === 'caption-draft') {
        requireSource(context);
        return createCaptionDraft(context, options.signal);
      }
      if (capability === 'visual-analysis') {
        requireSource(context);
        return describeImage(context, options.signal);
      }
      if (capability === 'audio-description-draft') {
        requireSource(context);
        return createAudioDescriptionDraft(context, options.signal);
      }
      if (capability === 'narration-audio') return createNarrationAudio(context, options.signal);
      if (capability === 'advanced-accessibility-analysis') return advancedAccessibilityAnalysis(context, options.signal);
      throw new Error('This OpenAI adapter does not support that task.');
    }
  };

  function requireSource(context) {
    if (!context.sourceData || !context.sourceData.base64) throw new Error('The selected source could not be prepared for processing.');
  }

  async function transcribe(context, signal) {
    const result = await requestTranscription(context.sourceData, configuration.transcriptionModel || 'gpt-4o-mini-transcribe', signal, false);
    if (typeof result.text !== 'string' || !result.text.trim()) throw new Error('OpenAI did not return transcript text.');
    return { text: result.text.trim(), summary: 'A transcript draft was created from the selected media.' };
  }

  async function createCaptionDraft(context, signal) {
    let result;
    try {
      result = await requestTranscription(context.sourceData, 'whisper-1', signal, true);
    } catch (error) {
      if (!String(context.transcriptText || '').trim()) throw error;
      const cues = window.CaptionDrafting.distributeText(context.transcriptText, context.durationSeconds);
      return { cues, summary: `${cues.length} caption cues were drafted from the completed transcript. Exact speech timing was unavailable, so every cue must be retimed during review.` };
    }
    const cues = window.CaptionDrafting.normalizeSegments(result.segments, result.text || context.transcriptText, context.durationSeconds);
    if (!cues.length) throw new Error('OpenAI did not return usable caption timing.');
    return { cues, summary: `${cues.length} timed caption cues were created from speech timestamps. Review wording, reading speed, sound cues, speakers, and every start and end time.` };
  }

  async function requestTranscription(source, model, signal, includeSegments) {
    const blob = base64Blob(source.base64, source.mimeType || 'application/octet-stream');
    const form = new FormData();
    form.append('file', blob, source.name || 'media');
    form.append('model', model);
    form.append('response_format', includeSegments ? 'verbose_json' : 'json');
    if (includeSegments) form.append('timestamp_granularities[]', 'segment');
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST', headers: { Authorization: `Bearer ${configuration.apiKey}` }, body: form, signal
    });
    return readJson(response);
  }

  async function describeImage(context, signal) {
    const source = context.sourceData;
    if (!String(source.mimeType || '').startsWith('image/')) throw new Error('Image description requires an image source.');
    const dataUrl = `data:${source.mimeType || 'image/jpeg'};base64,${source.base64}`;
    const result = await requestResponse([
      { type: 'input_text', text: 'Describe this image for a blind or low-vision reader. Be accurate, concise, objective, and include visible text that matters. Do not invent details.' },
      { type: 'input_image', image_url: dataUrl }
    ], signal);
    const text = extractResponseText(result);
    if (!text) throw new Error('OpenAI did not return an image description.');
    return { description: text, summary: 'An image-description draft was created from the selected picture.' };
  }

  async function createAudioDescriptionDraft(context, signal) {
    if (!String(context.sourceData.mimeType || '').startsWith('video/')) throw new Error('Audio-description drafting requires a local video file.');
    const sample = await window.AudioDescriptionDrafting.sampleVideo(context.sourceData, context.durationSeconds, 8);
    const transcript = String(context.transcriptText || '').trim();
    const instructions = [
      'Create a concise draft audio-description cue list from these timestamped video frames.',
      'Describe only essential visual information that is not likely conveyed by dialogue or sound.',
      'Do not identify people or infer emotions, identities, motives, relationships, or events unless clearly visible.',
      'Use the supplied timestamps as anchors. Keep narration short enough to fit in likely pauses.',
      'Return JSON only with this shape: {"cues":[{"startSeconds":0,"endSeconds":4,"placement":"During a pause","text":"Narration"}]}.',
      `Video duration: ${sample.durationSeconds.toFixed(3)} seconds.`,
      transcript ? `Transcript context, which may help avoid describing information already spoken: ${transcript.slice(0, 12000)}` : 'No transcript context is available. Human review must determine whether dialogue conflicts with each cue.'
    ].join('\n');
    const content = [{ type: 'input_text', text: instructions }];
    sample.frames.forEach((frame) => {
      content.push({ type: 'input_text', text: `Frame sampled at ${frame.timeSeconds.toFixed(3)} seconds.` });
      content.push({ type: 'input_image', image_url: frame.imageDataUrl });
    });
    const result = await requestResponse(content, signal);
    const parsed = parseJsonText(extractResponseText(result));
    const cues = window.AudioDescriptionDrafting.normalizeCues(parsed && parsed.cues, sample.durationSeconds);
    if (!cues.length) throw new Error('OpenAI did not return usable audio-description cues.');
    return { cues, summary: `${cues.length} timed audio-description cues were drafted from ${sample.frames.length} sampled video frames. Review the complete video, dialogue, sounds, timing, and every narration line before approval.` };
  }

  async function createNarrationAudio(context, signal) {
    const cues = Array.isArray(context.narrationCues) ? context.narrationCues : [];
    if (!cues.length) throw new Error('Reviewed narration cues are required.');
    const voice = String(context.narrationVoice || 'alloy');
    const speed = Math.min(1.25, Math.max(0.75, Number(context.narrationSpeed) || 1));
    const clips = [];
    for (let index = 0; index < cues.length; index += 1) {
      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: { Authorization: `Bearer ${configuration.apiKey}`, 'Content-Type': 'application/json' },
        signal,
        body: JSON.stringify({ model: 'gpt-4o-mini-tts', voice, input: cues[index].text, speed, response_format: 'mp3' })
      });
      if (!response.ok) {
        let detail = {}; try { detail = await response.json(); } catch (error) {}
        throw new Error(detail && detail.error && detail.error.message ? detail.error.message : `OpenAI returned HTTP ${response.status}.`);
      }
      clips.push({ cueIndex: index, mimeType: 'audio/mpeg', base64: await blobToBase64(await response.blob()) });
    }
    return { clips, summary: `${clips.length} narration clips were synthesized from the reviewed script.` };
  }


  async function advancedAccessibilityAnalysis(context, signal) {
    const knowledge = context.knowledge || {};
    const local = knowledge.analysis && knowledge.analysis.advancedAccessibility ? knowledge.analysis.advancedAccessibility : {};
    const content = [{ type: 'input_text', text: [
      'Act as a media accessibility quality analyst. Evaluate the available source and workflow metadata.',
      'Return JSON only with this shape: {"scores":{"sceneUnderstanding":0,"speakerRecognition":0,"captionQuality":0,"audioDescriptionQuality":0,"visualAccessibility":0,"narrationOptimization":0},"findings":["finding"]}.',
      'Scores must be integers from 0 to 100. Findings must be concise, actionable, and avoid claiming certainty when evidence is incomplete.',
      'Evaluate scene coverage, speaker distinction, caption completeness and likely reading burden, audio-description coverage and conflicts, visual accessibility, and narration pacing.',
      `Workflow knowledge: ${JSON.stringify(knowledge).slice(0, 16000)}`,
      `Existing local analysis: ${JSON.stringify(local).slice(0, 6000)}`
    ].join('\n') }];
    if (context.sourceData && context.sourceData.base64 && String(context.sourceData.mimeType || '').startsWith('image/')) {
      content.push({ type: 'input_image', image_url: `data:${context.sourceData.mimeType};base64,${context.sourceData.base64}` });
    }
    const result = await requestResponse(content, signal);
    const parsed = parseJsonText(extractResponseText(result));
    if (!parsed || !parsed.scores || !Array.isArray(parsed.findings)) throw new Error('OpenAI did not return a usable accessibility analysis.');
    return { report: parsed, summary: 'Advanced accessibility quality analysis completed.' };
  }

  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '');
      reader.onerror = () => reject(new Error('The narration audio could not be prepared.'));
      reader.readAsDataURL(blob);
    });
  }

  async function requestResponse(content, signal) {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${configuration.apiKey}`, 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({
        model: configuration.visionModel || 'gpt-4.1-mini',
        input: [{ role: 'user', content }]
      })
    });
    return readJson(response);
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

  function parseJsonText(text) {
    const cleaned = String(text || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    try { return JSON.parse(cleaned); } catch (error) {
      const start = cleaned.indexOf('{');
      const end = cleaned.lastIndexOf('}');
      if (start >= 0 && end > start) {
        try { return JSON.parse(cleaned.slice(start, end + 1)); } catch (nestedError) {}
      }
      throw new Error('OpenAI returned an audio-description draft that could not be read.');
    }
  }

  function base64Blob(base64, mimeType) {
    const binary = atob(base64); const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return new Blob([bytes], { type: mimeType });
  }

  async function configure(next) {
    configuration = {
      apiKey: String(next.apiKey || '').trim() || configuration.apiKey || '',
      transcriptionModel: String(next.transcriptionModel || '').trim() || 'gpt-4o-mini-transcribe',
      visionModel: String(next.visionModel || '').trim() || 'gpt-4.1-mini'
    };
    await window.SecureCredentialStore.save(STORE_ID, configuration);
    ready = true;
    return getConfiguration();
  }
  function getConfiguration() { return { hasApiKey: Boolean(configuration.apiKey), transcriptionModel: configuration.transcriptionModel || 'gpt-4o-mini-transcribe', visionModel: configuration.visionModel || 'gpt-4.1-mini', ready }; }
  async function clear() { configuration = {}; ready = true; await window.SecureCredentialStore.remove(STORE_ID); }
  async function testConnection(signal) {
    if (!configuration.apiKey) throw new Error('Save an OpenAI API key before testing.');
    const response = await fetch('https://api.openai.com/v1/models', { headers: { Authorization: `Bearer ${configuration.apiKey}` }, signal });
    if (!response.ok) throw new Error(`OpenAI connection test returned HTTP ${response.status}.`);
    return { message: 'OpenAI responded successfully.' };
  }
  async function initialize() {
    configuration = await window.SecureCredentialStore.load(STORE_ID) || {};
    ready = true;
    document.dispatchEvent(new CustomEvent('provider-credentials-ready'));
  }

  window.OpenAIProvider = { configure, getConfiguration, clear, testConnection, initialize };
  window.AIProviderLayer.register(provider);
  initialize();
})();
