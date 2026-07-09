(function () {
  const providers = [
    {
      id: 'browser',
      name: 'Browser Provider',
      kind: 'local browser',
      available: true,
      workflows: ['prepare-for-ai'],
      description: 'Runs lightweight preparation tasks directly in the browser.',
      unavailableReason: ''
    },
    {
      id: 'ffmpeg',
      name: 'FFmpeg Provider',
      kind: 'desktop provider',
      available: false,
      workflows: ['extract-audio', 'compress-video', 'compress-audio', 'normalize-audio'],
      description: 'Will run local FFmpeg processing when the desktop runtime is connected.',
      unavailableReason: 'Desktop processing is not connected in this browser prototype yet.'
    },
    {
      id: 'speech',
      name: 'Speech Provider',
      kind: 'speech provider',
      available: false,
      workflows: ['create-transcript', 'create-captions'],
      description: 'Will create transcripts and caption timing when speech processing is connected.',
      unavailableReason: 'Speech processing is not connected in this browser prototype yet.'
    },
    {
      id: 'description',
      name: 'Description Workspace Provider',
      kind: 'guided browser workflow',
      available: true,
      workflows: ['audio-description'],
      description: 'Creates a guided planning workspace for audio description review.',
      unavailableReason: ''
    },
    {
      id: 'image',
      name: 'Image Provider',
      kind: 'browser provider',
      available: false,
      workflows: ['generate-alt-text', 'ocr-image', 'compress-image', 'resize-image'],
      description: 'Will process images when image analysis and editing providers are connected.',
      unavailableReason: 'Image processing is not connected in this browser prototype yet.'
    },
    {
      id: 'document',
      name: 'Document Provider',
      kind: 'browser provider',
      available: false,
      workflows: ['ocr-document', 'extract-document-text'],
      description: 'Will process documents when document extraction providers are connected.',
      unavailableReason: 'Document processing is not connected in this browser prototype yet.'
    },
    {
      id: 'archive',
      name: 'Archive Provider',
      kind: 'browser provider',
      available: false,
      workflows: ['inspect-archive'],
      description: 'Will inspect archive contents when archive support is connected.',
      unavailableReason: 'Archive inspection is not connected in this browser prototype yet.'
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
      canRun: Boolean(provider.available),
      provider,
      status: provider.available ? 'Ready' : 'Provider not connected',
      message: provider.available
        ? `${provider.name} is ready to run this workflow.`
        : `${provider.name} is planned for this workflow. ${provider.unavailableReason}`
    };
  }

  function getProviderSummary() {
    const ready = providers.filter((provider) => provider.available).length;
    return `${ready} of ${providers.length} providers available in this build.`;
  }

  window.ProviderManager = {
    providers,
    getProvider,
    getCapability,
    getProviderSummary
  };
})();
