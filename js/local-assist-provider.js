(function () {
  const capabilities = ['caption-draft', 'audio-description-draft', 'visual-analysis'];

  const provider = {
    id: 'local-assist',
    name: 'Local Assist Provider',
    kind: 'on-device drafting',
    description: 'Creates editable starter material from information already in Shared Knowledge. It does not send media or text over the network.',
    privacy: 'All drafting stays in this browser.',
    external: false,
    costCategory: 'no-additional-cost',
    costMessage: 'No additional usage charge',
    requiresConfirmation: false,
    quality: { 'caption-draft': 55, 'audio-description-draft': 40, 'visual-analysis': 25 },
    preferredCapabilities: ['caption-draft', 'audio-description-draft'],
    isAvailable: () => true,
    getCapabilities: () => capabilities.slice(),
    async run(capability, context) {
      if (capability === 'caption-draft') return createCaptionDraft(context);
      if (capability === 'audio-description-draft') return createDescriptionDraft(context);
      if (capability === 'visual-analysis') return createVisualPlan(context);
      throw new Error('Local Assist does not support that capability.');
    }
  };

  function createCaptionDraft(context) {
    const text = String(context.transcriptText || '').trim();
    if (!text) throw new Error('A completed transcript is required before Local Assist can draft captions.');
    const parts = text.split(/(?<=[.!?])\s+|\n+/).map((part) => part.trim()).filter(Boolean);
    const duration = Math.max(Number(context.durationSeconds) || parts.length * 4, parts.length * 2);
    const cues = parts.map((part, index) => {
      const startSeconds = (duration / parts.length) * index;
      const endSeconds = (duration / parts.length) * (index + 1);
      return { start: timestamp(startSeconds), end: timestamp(Math.max(startSeconds + 1, endSeconds)), text: part };
    });
    return { cues, summary: `${cues.length} starter caption cues were drafted from the completed transcript. Review every cue and timing.` };
  }

  function createDescriptionDraft(context) {
    const duration = Math.max(Number(context.durationSeconds) || 0, 4);
    const count = Math.min(6, Math.max(1, Math.ceil(duration / 60)));
    const spacing = duration / count;
    const cues = Array.from({ length: count }, (_, index) => {
      const start = spacing * index;
      return {
        start: timestamp(start),
        end: timestamp(Math.min(duration, start + Math.min(4, Math.max(2, spacing / 3)))),
        placement: 'natural-pause',
        text: `[Review the visual action near ${clockLabel(start)} and replace this prompt with concise narration.]`
      };
    });
    return { cues, summary: `${cues.length} review checkpoints were drafted across the video. These are prompts, not completed descriptions.` };
  }

  function createVisualPlan(context) {
    const duration = Math.max(Number(context.durationSeconds) || 0, 1);
    return {
      intervals: [{ start: '00:00:00.000', end: timestamp(duration), purpose: 'Review essential visual information not conveyed by audio.' }],
      summary: 'A local visual review interval was created. Automated image understanding requires a connected provider.'
    };
  }

  function timestamp(seconds) {
    const value = Math.max(0, Number(seconds) || 0);
    const hours = Math.floor(value / 3600);
    const minutes = Math.floor((value % 3600) / 60);
    const wholeSeconds = Math.floor(value % 60);
    const milliseconds = Math.round((value - Math.floor(value)) * 1000);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(wholeSeconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
  }

  function clockLabel(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainder = Math.floor(seconds % 60);
    return `${minutes}:${String(remainder).padStart(2, '0')}`;
  }

  window.AIProviderLayer.register(provider);
})();
