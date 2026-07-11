(function () {
  function item(id, title, rating, status, reason, confidence, intentId) {
    return { id, title, rating, status, reason, confidence, intentId };
  }

  function assess(model) {
    const type = model.source.mediaType;
    const hasAudio = model.audio.present;
    const hasVisuals = model.visual.present;
    const results = [];

    if (hasAudio) {
      results.push(item(
        'transcript',
        'Transcript',
        5,
        model.accessibility.transcript.present ? 'Already present' : 'Strongly recommended',
        model.accessibility.transcript.present
          ? 'A transcript is already recorded for this source.'
          : 'This source contains audio. A transcript makes spoken information readable, searchable, and easier to review.',
        'High confidence based on the detected audio track.',
        'create-transcript'
      ));
    }

    if (type === 'video' && hasAudio) {
      results.push(item(
        'captions',
        'Captions',
        5,
        model.accessibility.captions.present ? 'Already present' : 'Strongly recommended',
        model.accessibility.captions.present
          ? 'Captions are recorded as present for this source.'
          : 'This video contains audio. Captions are recommended so spoken information and meaningful sounds can be read.',
        'High confidence that captions are relevant. Caption presence still needs deeper inspection.',
        'create-captions'
      ));
    }

    if (hasVisuals) {
      results.push(item(
        'audio-description',
        'Audio description',
        type === 'video' ? 4 : 3,
        'Review recommended',
        type === 'video'
          ? 'The video contains visual information. Deeper scene and dialogue-gap analysis is needed before recommending Standard, Extended, Continuous, or Mixed Audio Description.'
          : 'The image may need a text alternative. Visual analysis is needed before a description can be drafted.',
        'Moderate confidence that visual review is relevant. The best description approach cannot be chosen yet.',
        type === 'video' ? 'audio-description' : 'generate-alt-text'
      ));
    }

    if (hasAudio) {
      results.push(item(
        'speaker-identification',
        'Speaker identification',
        3,
        'Recommended when multiple voices are present',
        'Identifying speakers can improve transcripts and captions. Speech analysis is needed to determine how many speakers are present.',
        'Low confidence until speech is analyzed.',
        null
      ));
    }

    if (type === 'video' && Number.isFinite(model.source.size) && model.source.size > 20 * 1024 * 1024) {
      results.push(item(
        'compression',
        'Smaller video',
        2,
        'Optional',
        'The file is large enough that a smaller copy may be easier to share or upload.',
        'High confidence based on file size.',
        'compress-video'
      ));
    }

    return {
      items: results,
      summary: buildSummary(results),
      completedAnalysis: model.analysis.completed.length,
      pendingAnalysis: model.analysis.pending.length
    };
  }

  function buildSummary(items) {
    const strong = items.filter((entry) => entry.rating >= 5 && entry.status !== 'Already present').length;
    const review = items.filter((entry) => entry.rating >= 3 && entry.rating < 5).length;
    if (strong) return `${strong} strongly recommended improvement${strong === 1 ? '' : 's'} found.`;
    if (review) return `${review} area${review === 1 ? '' : 's'} should be reviewed.`;
    return 'No immediate accessibility improvements were identified from the available information.';
  }

  window.AccessibilityAssessment = { assess };
})();
