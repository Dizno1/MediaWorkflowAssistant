(function () {
  const intents = [
    {
      id: 'create-captions',
      workflowId: 'create-captions',
      title: 'Create captions',
      description: 'Create, review, validate, and save timed WebVTT captions.',
      actionLabel: 'Create captions'
    },
    {
      id: 'create-transcript',
      workflowId: 'create-transcript',
      title: 'Create a transcript',
      description: 'Create and save a reviewed plain-text transcript from the spoken content.',
      actionLabel: 'Create a transcript'
    },
    {
      id: 'audio-description',
      workflowId: 'audio-description',
      title: 'Create audio description',
      description: 'Create, time, review, and save narration for important visual information.',
      actionLabel: 'Create audio description'
    },
    {
      id: 'compress-video',
      workflowId: 'compress-video',
      title: 'Make the video smaller',
      description: 'Reduce the file size so the video is easier to share or upload.',
      actionLabel: 'Make the video smaller'
    },
    {
      id: 'compress-audio',
      workflowId: 'compress-audio',
      title: 'Make the audio smaller',
      description: 'Reduce the file size while keeping speech clear.',
      actionLabel: 'Make the audio smaller'
    },
    {
      id: 'normalize-audio',
      workflowId: 'normalize-audio',
      title: 'Make the volume more consistent',
      description: 'Even out the volume so speech is easier to hear.',
      actionLabel: 'Make the volume more consistent'
    },
    {
      id: 'extract-audio',
      workflowId: 'extract-audio',
      title: 'Extract the audio',
      description: 'Create an audio-only copy by removing the video picture.',
      actionLabel: 'Extract the audio'
    },
    {
      id: 'generate-alt-text',
      workflowId: 'generate-alt-text',
      title: 'Describe this picture',
      description: 'Create a short description that can be used as alt text.',
      actionLabel: 'Describe this picture'
    },
    {
      id: 'ocr-image',
      workflowId: 'ocr-image',
      title: 'Read text in this picture',
      description: 'Find visible words in the picture and turn them into readable text.',
      actionLabel: 'Read text in this picture'
    },
    {
      id: 'compress-image',
      workflowId: 'compress-image',
      title: 'Make the picture smaller',
      description: 'Reduce the file size so the picture is easier to share.',
      actionLabel: 'Make the picture smaller'
    },
    {
      id: 'resize-image',
      workflowId: 'resize-image',
      title: 'Change the picture size',
      description: 'Create a copy with different dimensions.',
      actionLabel: 'Change the picture size'
    },
    {
      id: 'ocr-document',
      workflowId: 'ocr-document',
      title: 'Make this document readable',
      description: 'Find text in a scanned document and create a readable copy.',
      actionLabel: 'Make this document readable'
    },
    {
      id: 'extract-document-text',
      workflowId: 'extract-document-text',
      title: 'Save the document text',
      description: 'Create a plain-text copy that is easier to read, search, or reuse.',
      actionLabel: 'Save the document text'
    },
    {
      id: 'inspect-archive',
      workflowId: 'inspect-archive',
      title: 'Show what is inside',
      description: 'List the files inside this archive.',
      actionLabel: 'Show what is inside'
    },
    {
      id: 'accessibility-package',
      workflowId: 'accessibility-package',
      title: 'Create an accessibility package',
      description: 'Bundle the available results, completed work, remaining gaps, history, and next actions into one ZIP file.',
      actionLabel: 'Create an accessibility package'
    },
    {
      id: 'save-file-information',
      workflowId: 'prepare-for-ai',
      title: 'Save information about this file',
      description: 'Create a readable file containing the media details and available next steps.',
      actionLabel: 'Save information about this file'
    }
  ];


  const plainSteps = {
    'create-captions': ['Listen to the speech', 'Create timed text', 'Prepare the caption file'],
    'create-transcript': ['Listen to the speech', 'Turn the speech into text', 'Prepare the transcript'],
    'audio-description': ['Review the video and existing audio', 'Write timed description cues', 'Validate narration placement', 'Export the reviewed script'],
    'compress-video': ['Check the video', 'Reduce the file size', 'Prepare the smaller copy'],
    'compress-audio': ['Check the audio', 'Reduce the file size', 'Prepare the smaller copy'],
    'normalize-audio': ['Check the volume', 'Even out the sound', 'Prepare the improved copy'],
    'extract-audio': ['Read the video', 'Copy the audio', 'Prepare the audio file'],
    'generate-alt-text': ['Review the picture', 'Create a short description', 'Prepare the text'],
    'ocr-image': ['Review the picture', 'Find visible words', 'Prepare readable text'],
    'compress-image': ['Check the picture', 'Reduce the file size', 'Prepare the smaller copy'],
    'resize-image': ['Check the picture size', 'Create the requested size', 'Prepare the new copy'],
    'ocr-document': ['Check the document', 'Find the text', 'Prepare a readable copy'],
    'extract-document-text': ['Read the document', 'Collect the text', 'Prepare the text file'],
    'inspect-archive': ['Open the archive', 'List its contents', 'Prepare the file list'],
    'prepare-for-ai': ['Read the file details', 'Collect the useful information', 'Create the information file'],
    'accessibility-package': ['Collect project knowledge', 'Collect available files', 'Create the manifest', 'Build the package']
  };

  function getIntents(inspection) {
    const workflows = window.WorkflowRegistry.getRecommendations(inspection);

    return workflows.map((workflow) => {
      const intent = intents.find((item) => item.workflowId === workflow.id) || {
        id: workflow.id,
        workflowId: workflow.id,
        title: workflow.name,
        description: workflow.description,
        actionLabel: workflow.name
      };

      const capability = window.ProviderManager.getCapability(workflow);

      return {
        ...intent,
        workflow,
        capability,
        steps: plainSteps[workflow.id] || ['Check the file', 'Complete the requested action', 'Prepare the result']
      };
    });
  }

  function getById(id) {
    return intents.find((intent) => intent.id === id) || null;
  }

  window.IntentEngine = {
    intents,
    getIntents,
    getById
  };
})();
