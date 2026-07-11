(function () {
  const taskDefinitions = {
    'analyze-speech': {
      title: 'Analyze the speech',
      purpose: 'Identify spoken content, language, timing, and possible speaker changes.',
      dependencies: [],
      supports: ['create-transcript', 'create-captions', 'speaker-identification', 'audio-description']
    },
    'create-transcript': {
      title: 'Create a transcript',
      purpose: 'Turn the spoken content into readable, searchable text.',
      dependencies: ['analyze-speech'],
      supports: ['create-captions', 'speaker-identification', 'audio-description']
    },
    'identify-speakers': {
      title: 'Identify speakers',
      purpose: 'Separate recurring voices so transcripts and captions can use consistent speaker labels.',
      dependencies: ['analyze-speech'],
      supports: ['create-transcript', 'create-captions']
    },
    'create-captions': {
      title: 'Create captions',
      purpose: 'Create timed text from the transcript, speech timing, and meaningful sounds.',
      dependencies: ['create-transcript'],
      supports: ['accessibility-package']
    },
    'analyze-visuals': {
      title: 'Analyze the visual content',
      purpose: 'Find scene changes, on-screen text, important actions, and information not conveyed by audio.',
      dependencies: [],
      supports: ['recommend-audio-description']
    },
    'recommend-audio-description': {
      title: 'Recommend an audio description approach',
      purpose: 'Use dialogue gaps, music, pacing, and visual activity to recommend Standard, Extended, Continuous, Mixed, Educational, or Technical Demonstration Audio Description.',
      dependencies: ['analyze-visuals'],
      supports: ['create-audio-description']
    },
    'create-audio-description': {
      title: 'Create audio description',
      purpose: 'Draft, review, narrate, and mix descriptions using the recommended approach.',
      dependencies: ['recommend-audio-description'],
      supports: ['accessibility-package']
    },
    'accessibility-package': {
      title: 'Prepare the accessibility package',
      purpose: 'Organize completed accessible media, captions, transcripts, scripts, reports, and supporting files into one package.',
      dependencies: [],
      supports: []
    }
  };

  function build(model, assessment, intents) {
    const availableIntents = new Map((intents || []).map((intent) => [intent.id, intent]));
    const selected = [];

    if (model.audio.present) {
      selected.push('analyze-speech', 'create-transcript', 'identify-speakers');
      if (model.source.mediaType === 'video') selected.push('create-captions');
    }

    if (model.visual.present) {
      selected.push('analyze-visuals');
      if (model.source.mediaType === 'video') {
        selected.push('recommend-audio-description', 'create-audio-description');
      }
    }

    if (selected.length) selected.push('accessibility-package');

    const unique = selected.filter((id, index) => selected.indexOf(id) === index);
    const steps = unique.map((id, index) => createStep(id, index, model, availableIntents));

    return {
      version: 1,
      sourceName: model.source.name,
      status: steps.every((step) => step.status === 'ready') ? 'ready' : 'preparing',
      summary: buildSummary(steps),
      steps,
      dependencies: buildDependencyMap(steps),
      recommendedAction: 'Make this media accessible',
      assessmentSummary: assessment ? assessment.summary : '',
      createdAt: new Date().toISOString()
    };
  }

  function createStep(id, index, model, availableIntents) {
    const definition = taskDefinitions[id];
    const intentId = mapIntent(id);
    const intent = intentId ? availableIntents.get(intentId) : null;
    const analysisComplete = isAnalysisComplete(id, model);
    const alreadyPresent = isAlreadyPresent(id, model);
    let status = 'planned';
    let availability = 'Future processing connection required';

    if (alreadyPresent) {
      status = 'complete';
      availability = 'Already present';
    } else if (analysisComplete) {
      status = 'complete';
      availability = 'Analysis already available';
    } else if (intent && intent.capability && intent.capability.canRun) {
      status = isPlaceholderIntent(intentId) ? 'template-only' : 'ready';
      availability = isPlaceholderIntent(intentId)
        ? 'A preparation worksheet is available, but automated processing is not connected yet.'
        : 'Available now';
    }

    return {
      id,
      order: index + 1,
      title: definition.title,
      purpose: definition.purpose,
      dependencies: definition.dependencies.slice(),
      supports: definition.supports.slice(),
      intentId,
      status,
      availability
    };
  }

  function mapIntent(id) {
    return ({
      'create-transcript': 'create-transcript',
      'create-captions': 'create-captions',
      'create-audio-description': 'audio-description',
      'accessibility-package': 'accessibility-package'
    })[id] || null;
  }

  function isPlaceholderIntent(intentId) {
    return ['create-transcript', 'create-captions', 'audio-description'].includes(intentId);
  }

  function isAnalysisComplete(id, model) {
    if (id === 'analyze-speech') return model.audio.speech.status === 'complete';
    if (id === 'identify-speakers') return model.audio.speakers.status === 'complete';
    if (id === 'analyze-visuals') return model.visual.importantVisuals.status === 'complete';
    if (id === 'recommend-audio-description') return Boolean(model.accessibility.audioDescription.recommendation);
    return false;
  }

  function isAlreadyPresent(id, model) {
    if (id === 'create-transcript') return model.accessibility.transcript.present;
    if (id === 'create-captions') return model.accessibility.captions.present;
    if (id === 'create-audio-description') return model.accessibility.audioDescription.present;
    if (id === 'accessibility-package') return Boolean(model.analysis.accessibilityPackage && model.analysis.accessibilityPackage.status === 'complete');
    return false;
  }

  function buildSummary(steps) {
    const ready = steps.filter((step) => step.status === 'ready').length;
    const template = steps.filter((step) => step.status === 'template-only').length;
    const future = steps.filter((step) => step.status === 'planned').length;
    const parts = [`${steps.length} ordered step${steps.length === 1 ? '' : 's'}`];
    if (ready) parts.push(`${ready} available now`);
    if (template) parts.push(`${template} available as preparation only`);
    if (future) parts.push(`${future} waiting for deeper processing`);
    return `${parts.join(', ')}.`;
  }

  function buildDependencyMap(steps) {
    return steps.reduce((map, step) => {
      map[step.id] = step.dependencies.slice();
      return map;
    }, {});
  }

  window.AccessibilityPlan = { build, taskDefinitions };
})();
