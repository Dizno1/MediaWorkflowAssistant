(function () {
  const workflows = [
    {
      id: 'create-captions',
      name: 'Create captions',
      description: 'Create a caption file from spoken audio in a video.',
      mediaTypes: ['video'],
      steps: ['Extract audio', 'Detect speech', 'Create transcript', 'Synchronize timestamps', 'Export VTT caption file']
    },
    {
      id: 'create-transcript',
      name: 'Create transcript',
      description: 'Create readable text from speech.',
      mediaTypes: ['video', 'audio'],
      steps: ['Extract or read audio', 'Detect speech', 'Create draft transcript', 'Prepare transcript for review']
    },
    {
      id: 'audio-description',
      name: 'Add audio description',
      description: 'Prepare a workflow for describing important visual content.',
      mediaTypes: ['video'],
      steps: ['Inspect video structure', 'Identify likely description points', 'Create description script workspace', 'Prepare export options']
    },
    {
      id: 'compress-video',
      name: 'Compress video',
      description: 'Make a video smaller for sharing, uploading, or AI review.',
      mediaTypes: ['video'],
      steps: ['Analyze current size', 'Recommend target settings', 'Compress copy', 'Compare original and compressed files']
    },
    {
      id: 'compress-audio',
      name: 'Compress audio',
      description: 'Make an audio file smaller while preserving useful speech quality.',
      mediaTypes: ['audio'],
      steps: ['Analyze current size', 'Recommend target settings', 'Compress copy', 'Compare original and compressed files']
    },
    {
      id: 'extract-audio',
      name: 'Extract audio',
      description: 'Create an audio-only file from a video or normalize an existing audio file.',
      mediaTypes: ['video', 'audio'],
      steps: ['Read source media', 'Select audio track', 'Export MP3 or WAV copy']
    },
    {
      id: 'generate-alt-text',
      name: 'Generate alt text',
      description: 'Create a plain-language description for an image.',
      mediaTypes: ['image'],
      steps: ['Inspect image', 'Create description draft', 'Offer editing and copy options']
    },
    {
      id: 'ocr-image',
      name: 'OCR image text',
      description: 'Extract visible text from an image.',
      mediaTypes: ['image'],
      steps: ['Inspect image', 'Detect visible text', 'Export editable text']
    },
    {
      id: 'compress-image',
      name: 'Compress image',
      description: 'Make an image smaller for sharing or publishing.',
      mediaTypes: ['image'],
      steps: ['Analyze image size', 'Recommend target settings', 'Create compressed copy']
    },
    {
      id: 'ocr-document',
      name: 'OCR document',
      description: 'Extract text from scanned or image-based documents.',
      mediaTypes: ['document'],
      steps: ['Inspect document', 'Detect text layer', 'Run OCR when needed', 'Export accessible text draft']
    },
    {
      id: 'extract-document-text',
      name: 'Extract document text',
      description: 'Pull text content from a document for review or AI preparation.',
      mediaTypes: ['document'],
      steps: ['Inspect document', 'Extract text', 'Clean reading order', 'Export text file']
    },
    {
      id: 'inspect-archive',
      name: 'Inspect archive',
      description: 'Review the likely contents of a compressed file before processing.',
      mediaTypes: ['archive'],
      steps: ['Read archive metadata', 'List file types', 'Recommend next actions']
    },
    {
      id: 'prepare-for-ai',
      name: 'Prepare for AI',
      description: 'Prepare media or extracted content for analysis by an AI assistant.',
      mediaTypes: ['video', 'audio', 'image', 'document', 'archive', 'unknown'],
      steps: ['Inspect file', 'Choose useful extracts', 'Create AI-ready package', 'Suggest prompt starter']
    }
  ];

  function getRecommendations(inspection) {
    return workflows.filter((workflow) => inspection.capabilities.includes(workflow.id));
  }

  function getById(id) {
    return workflows.find((workflow) => workflow.id === id);
  }

  window.WorkflowRegistry = { getRecommendations, getById, workflows };
})();
