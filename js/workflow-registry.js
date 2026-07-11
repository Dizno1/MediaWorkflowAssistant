(function () {
  const workflows = [
    {
      id: 'create-captions',
      name: 'Create captions',
      category: 'Accessibility',
      priority: 10,
      description: 'Create a caption file from spoken audio in a video.',
      mediaTypes: ['video'],
      requirements: ['hasAudio'],
      outputs: ['reviewed WebVTT caption file', 'caption review record'],
      steps: ['Review transcript and source', 'Edit timed caption cues', 'Validate timing and reading order', 'Export reviewed WebVTT captions']
    },
    {
      id: 'create-transcript',
      name: 'Create transcript',
      category: 'Accessibility',
      priority: 9,
      description: 'Create readable text from speech in audio or video.',
      mediaTypes: ['video', 'audio'],
      requirements: ['hasAudio'],
      outputs: ['plain text transcript'],
      steps: ['Review source media', 'Enter spoken content', 'Review transcript accuracy', 'Save completed transcript']
    },
    {
      id: 'audio-description',
      name: 'Add audio description',
      category: 'Accessibility',
      priority: 8,
      description: 'Create and review a timed narration script for important visual content in a video.',
      mediaTypes: ['video'],
      requirements: ['hasVideo'],
      outputs: ['reviewed audio description script', 'audio description review record'],
      steps: ['Review video and existing audio', 'Edit timed description cues', 'Validate narration placement', 'Export reviewed audio description script']
    },
    {
      id: 'render-accessible-video',
      name: 'Render accessible video',
      category: 'Accessibility',
      priority: 7,
      description: 'Create a publication-ready video with the original picture, approved described audio, and selectable captions.',
      mediaTypes: ['video'],
      requirements: ['hasVideo'],
      outputs: ['accessible WebM video', 'publication-ready ZIP package', 'validation checklist'],
      steps: ['Validate reviewed accessibility assets', 'Render accessible video', 'Add selectable captions', 'Build publication package', 'Register outputs']
    },
    {
      id: 'compress-video',
      name: 'Compress video',
      category: 'Sharing',
      priority: 7,
      description: 'Make a video smaller for sharing, uploading, or AI review.',
      mediaTypes: ['video'],
      requirements: ['hasVideo'],
      outputs: ['compressed video copy'],
      steps: ['Analyze current size', 'Recommend target settings', 'Compress copy', 'Compare original and compressed files']
    },
    {
      id: 'compress-audio',
      name: 'Compress audio',
      category: 'Sharing',
      priority: 7,
      description: 'Make an audio file smaller while preserving useful speech quality.',
      mediaTypes: ['audio'],
      requirements: ['hasAudio'],
      outputs: ['compressed audio copy'],
      steps: ['Analyze current size', 'Recommend target settings', 'Compress copy', 'Compare original and compressed files']
    },
    {
      id: 'normalize-audio',
      name: 'Normalize audio',
      category: 'Audio',
      priority: 6,
      description: 'Prepare an audio file so speech volume is more consistent.',
      mediaTypes: ['audio'],
      requirements: ['hasAudio'],
      outputs: ['normalized audio copy'],
      steps: ['Analyze audio level', 'Recommend loudness target', 'Create normalized copy']
    },
    {
      id: 'extract-audio',
      name: 'Extract audio',
      category: 'Conversion',
      priority: 6,
      description: 'Create an audio-only file from a video.',
      mediaTypes: ['video'],
      requirements: ['hasAudio'],
      outputs: ['MP3 or WAV audio file'],
      steps: ['Read source media', 'Select audio track', 'Export MP3 or WAV copy']
    },
    {
      id: 'generate-alt-text',
      name: 'Generate alt text',
      category: 'Accessibility',
      priority: 10,
      description: 'Create a plain-language description for an image.',
      mediaTypes: ['image'],
      requirements: ['hasImages'],
      outputs: ['alt text draft'],
      steps: ['Inspect image', 'Create description draft', 'Offer editing and copy options']
    },
    {
      id: 'ocr-image',
      name: 'OCR image text',
      category: 'Accessibility',
      priority: 8,
      description: 'Extract visible text from an image.',
      mediaTypes: ['image'],
      requirements: ['hasImages'],
      outputs: ['editable text file'],
      steps: ['Inspect image', 'Detect visible text', 'Export editable text']
    },
    {
      id: 'compress-image',
      name: 'Compress image',
      category: 'Sharing',
      priority: 6,
      description: 'Make an image smaller for sharing or publishing.',
      mediaTypes: ['image'],
      requirements: ['hasImages'],
      outputs: ['compressed image copy'],
      steps: ['Analyze image size', 'Recommend target settings', 'Create compressed copy']
    },
    {
      id: 'resize-image',
      name: 'Resize image',
      category: 'Conversion',
      priority: 5,
      description: 'Create a smaller or larger copy of an image for a specific use.',
      mediaTypes: ['image'],
      requirements: ['hasImages'],
      outputs: ['resized image copy'],
      steps: ['Inspect image dimensions', 'Choose target size', 'Create resized copy']
    },
    {
      id: 'ocr-document',
      name: 'OCR document',
      category: 'Accessibility',
      priority: 8,
      description: 'Extract text from scanned or image-based documents.',
      mediaTypes: ['document'],
      requirements: [],
      outputs: ['accessible text draft'],
      steps: ['Inspect document', 'Detect text layer', 'Run OCR when needed', 'Export accessible text draft']
    },
    {
      id: 'extract-document-text',
      name: 'Extract document text',
      category: 'Conversion',
      priority: 7,
      description: 'Pull text content from a document for review or AI preparation.',
      mediaTypes: ['document'],
      requirements: [],
      outputs: ['plain text file'],
      steps: ['Inspect document', 'Extract text', 'Clean reading order', 'Export text file']
    },
    {
      id: 'inspect-archive',
      name: 'Inspect archive',
      category: 'Inspection',
      priority: 7,
      description: 'Review the likely contents of a compressed file before processing.',
      mediaTypes: ['archive'],
      requirements: [],
      outputs: ['archive contents summary'],
      steps: ['Read archive metadata', 'List file types', 'Recommend next actions']
    },
    {
      id: 'accessibility-package',
      name: 'Create accessibility package',
      category: 'Accessibility',
      priority: 5,
      description: 'Bundle completed outputs, project knowledge, remaining gaps, workflow history, and follow-up actions into one portable ZIP file.',
      mediaTypes: ['video', 'audio', 'image', 'document', 'archive', 'unknown'],
      requirements: [],
      outputs: ['accessibility package ZIP', 'readable manifest'],
      steps: ['Collect Shared Knowledge', 'Collect available outputs', 'Write the package manifest', 'Create the ZIP package', 'Register the package']
    },
    {
      id: 'prepare-for-ai',
      name: 'Prepare for AI',
      category: 'AI preparation',
      priority: 4,
      description: 'Prepare media or extracted content for analysis by an AI assistant.',
      mediaTypes: ['video', 'audio', 'image', 'document', 'archive', 'unknown'],
      requirements: [],
      outputs: ['AI-ready package', 'prompt starter'],
      steps: ['Inspect file', 'Choose useful extracts', 'Create AI-ready package', 'Suggest prompt starter']
    }
  ];

  function requirementIsMet(inspection, requirement) {
    return Boolean(inspection[requirement]);
  }

  function supportsInspection(workflow, inspection) {
    const supportsType = workflow.mediaTypes.includes(inspection.mediaType);
    const requirementsMet = workflow.requirements.every((requirement) => requirementIsMet(inspection, requirement));
    return supportsType && requirementsMet && inspection.capabilities.includes(workflow.id);
  }

  function getRecommendations(inspection) {
    return workflows
      .filter((workflow) => supportsInspection(workflow, inspection))
      .sort((a, b) => b.priority - a.priority || a.name.localeCompare(b.name));
  }

  function getById(id) {
    return workflows.find((workflow) => workflow.id === id);
  }

  window.WorkflowRegistry = { getRecommendations, getById, workflows };
})();
