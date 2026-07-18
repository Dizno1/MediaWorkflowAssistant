(function () {
  // Human-friendly narration styles, each mapped internally to a specific provider and voice.
  // Provider/voice identifiers are implementation detail and are only ever shown inside the
  // collapsed "Voice details" disclosure — never during normal use.
  //
  // Honesty note: only OpenAI's narration-audio capability actually exists in this application
  // today. The mapping is written so each style resolves to a {providerId, voice} pair rather
  // than a bare voice name, so that adding Azure Speech, Gemini, or a local TTS engine later only
  // means changing what a style resolves to, not how styles are presented or selected.
  const STYLES = [
    { id: 'automatic', label: 'Automatic (recommended)', voice: 'alloy', description: 'The assistant chooses the best available narration voice for this content.' },
    { id: 'professional-documentary', label: 'Professional documentary', voice: 'onyx', description: 'A measured, authoritative voice suited to factual and documentary content.' },
    { id: 'educational', label: 'Educational', voice: 'nova', description: 'A clear, engaging voice suited to instructional and training content.' },
    { id: 'friendly-guide', label: 'Friendly guide', voice: 'shimmer', description: 'An approachable, welcoming voice suited to tours and walkthroughs.' },
    { id: 'warm-conversational', label: 'Warm conversational', voice: 'coral', description: 'A relaxed, natural voice suited to informal or personal content.' },
    { id: 'corporate-training', label: 'Corporate training', voice: 'echo', description: 'A neutral, professional voice suited to workplace and training material.' },
    { id: 'expressive-storytelling', label: 'Expressive storytelling', voice: 'fable', description: 'An animated, expressive voice suited to narrative and creative content.' },
    { id: 'childrens-educational', label: 'Children\u2019s educational', voice: 'sage', description: 'A warm, gentle voice suited to young audiences.' },
    { id: 'calm-neutral', label: 'Calm neutral', voice: 'ash', description: 'A plain, unobtrusive voice suited to general-purpose use.' }
  ];
  const STORAGE_KEY = 'odd-preferred-narration-style';

  function list() { return STYLES.slice(); }
  function getStyle(id) { return STYLES.find((item) => item.id === id) || STYLES[0]; }

  // Best-effort, filename-only content hint used only to choose a starting suggestion — never
  // presented as certain, and always freely overridable. This application does not perform real
  // content classification; pretending otherwise would overstate what "content-aware" means here.
  function suggestStyleId(sourceName) {
    const name = String(sourceName || '').toLowerCase();
    if (/kids|child/.test(name)) return 'childrens-educational';
    if (/museum|tour|walkthrough/.test(name)) return 'friendly-guide';
    if (/training|onboarding|corporate/.test(name)) return 'corporate-training';
    if (/documentary|history|historical/.test(name)) return 'professional-documentary';
    return 'automatic';
  }

  // Resolves a style (including "automatic") to the specific provider and voice that will
  // actually be used. Only OpenAI exists today, so every style currently resolves there.
  function resolveVoice(styleId, sourceName) {
    const effectiveId = styleId === 'automatic' ? suggestStyleId(sourceName) : styleId;
    const style = getStyle(effectiveId);
    return { providerId: 'openai', providerName: 'OpenAI', region: '', voice: style.voice, style };
  }

  function getSavedPreference() {
    try { return localStorage.getItem(STORAGE_KEY) || ''; } catch (error) { return ''; }
  }
  function savePreference(styleId) {
    try { localStorage.setItem(STORAGE_KEY, styleId); } catch (error) { /* best effort only */ }
  }

  window.NarrationStyle = { list, getStyle, suggestStyleId, resolveVoice, getSavedPreference, savePreference };
})();
