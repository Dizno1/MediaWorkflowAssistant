(function () {
  const browserProvider = window.BrowserProvider ? new window.BrowserProvider() : null;

  const providers = [
    {
      id: 'browser',
      name: 'Browser Provider',
      kind: 'local browser',
      available: Boolean(browserProvider),
      workflows: ['prepare-for-ai', 'compress-video', 'extract-audio'],
      description: 'Runs file information, smaller video, and audio-only tasks directly in the browser.',
      unavailableReason: browserProvider ? '' : 'Browser provider failed to load.',
      instance: browserProvider
    },
    {
      id: 'ffmpeg',
      name: 'FFmpeg Provider',
      kind: 'desktop provider',
      available: false,
      workflows: ['compress-audio', 'normalize-audio'],
      description: 'Will run local FFmpeg processing when the desktop runtime is connected.',
      unavailableReason: 'Desktop processing is not connected in this browser prototype yet.',
      instance: null
    },
    {
      id: 'speech',
      name: 'Speech Provider',
      kind: 'speech provider',
      available: false,
      workflows: ['create-transcript', 'create-captions'],
      description: 'Will create transcripts and caption timing when speech processing is connected.',
      unavailableReason: 'Speech processing is not connected in this browser prototype yet.',
      instance: null
    },
    {
      id: 'description',
      name: 'Description Workspace Provider',
      kind: 'guided browser workflow',
      available: true,
      workflows: ['audio-description'],
      description: 'Creates a guided planning workspace for audio description review.',
      unavailableReason: '',
      instance: null
    },
    {
      id: 'image',
      name: 'Image Provider',
      kind: 'browser provider',
      available: false,
      workflows: ['generate-alt-text', 'ocr-image', 'compress-image', 'resize-image'],
      description: 'Will process images when image analysis and editing providers are connected.',
      unavailableReason: 'Image processing is not connected in this browser prototype yet.',
      instance: null
    },
    {
      id: 'document',
      name: 'Document Provider',
      kind: 'browser provider',
      available: false,
      workflows: ['ocr-document', 'extract-document-text'],
      description: 'Will process documents when document extraction providers are connected.',
      unavailableReason: 'Document processing is not connected in this browser prototype yet.',
      instance: null
    },
    {
      id: 'archive',
      name: 'Archive Provider',
      kind: 'browser provider',
      available: false,
      workflows: ['inspect-archive'],
      description: 'Will inspect archive contents when archive support is connected.',
      unavailableReason: 'Archive inspection is not connected in this browser prototype yet.',
      instance: null
    }
  ];

  function getProvider(workflowId) {
    return providers.find((provider) => provider.workflows.includes(workflowId)) || null;
  }

  function getCapability(workflow) {
    const provider = getProvider(workflow.id);

    if (!provider) {
      return {
        workflowId: workflow.id,
        canRun: false,
        provider: null,
        status: 'No provider registered',
        message: 'No provider has been registered for this workflow yet.'
      };
    }

    return {
      workflowId: workflow.id,
      canRun: Boolean(provider.available && provider.instance && typeof provider.instance.execute === 'function'),
      provider,
      status: provider.available && provider.instance && typeof provider.instance.execute === 'function' ? 'Ready' : 'Not available yet',
      message: provider.available && provider.instance && typeof provider.instance.execute === 'function'
        ? 'This goal is ready.'
        : 'This goal is not available in the browser version yet.'
    };
  }

  async function execute(job) {
    const provider = job.provider;

    if (!provider || !provider.available || !provider.instance || typeof provider.instance.execute !== 'function') {
      return null;
    }

    return provider.instance.execute(job);
  }

  function downloadArtifact(artifact) {
    if (!artifact || !artifact.providerId) {
      throw new Error('No provider is associated with this artifact.');
    }

    const provider = providers.find((item) => item.id === artifact.providerId);
    if (!provider || !provider.instance || typeof provider.instance.downloadArtifact !== 'function') {
      throw new Error('This artifact is not downloadable yet.');
    }

    provider.instance.downloadArtifact(artifact);
  }

  function getProviderSummary() {
    const ready = providers.filter((provider) => provider.available).length;
    return `${ready} of ${providers.length} providers available in this build.`;
  }

  window.ProviderManager = {
    providers,
    getProvider,
    getCapability,
    execute,
    downloadArtifact,
    getProviderSummary
  };
})();
