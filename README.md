# MediaWorkflowAssistant

An accessibility-first media workflow application that automatically analyzes media and helps users accomplish tasks such as captioning, transcription, audio description, compression, and AI preparation through intelligent, goal-oriented workflows.

## Current Milestone

This repository now contains the Sprint 2 Media Inspector shell.

The application can:

- Accept a file through a drop zone or file picker.
- Inspect the file in the browser.
- Identify the general media type from MIME type and extension.
- Read supported audio and video duration metadata.
- Read supported video dimensions.
- Build a reusable media inspection object.
- Announce status changes through a polite live region.
- Recommend possible goal-oriented workflows from registry rules.
- Preview placeholder workflow steps and expected outputs.

## Design Principle

Users choose outcomes. The application builds the workflow.

The interface should not require users to understand FFmpeg, codecs, bitrates, containers, OCR engines, speech recognition services, or AI processing steps. Those are implementation details hidden behind meaningful user goals.

## First App Structure

```text
MediaWorkflowAssistant/
  index.html
  README.md
  css/
    styles.css
  js/
    app.js
    media-inspector.js
    workflow-registry.js
  workflows/
    audio-description.json
    compress-video.json
    create-captions.json
    create-transcript.json
    extract-audio.json
    prepare-for-ai.json
  docs/
    First Sprint Notes.md
    Sprint 2 Notes.md
```

## Local Use

Open `index.html` in a browser.

No build step is required.

## Next Sprint

The next development step is the first real workflow implementation. Extract Audio is the recommended starting point because it can prove workflow execution, progress reporting, output handling, and error states before AI-based transcription, captioning, OCR, or audio description are added.


## Sprint 3

Sprint 3 adds the reusable workflow runner, job model, progress panel, and results panel. Recommended workflows can now be reviewed and run as browser-based workflow jobs with accessible status updates.


## Sprint 4 Part 2

Sprint 4 Part 2 adds status-aware providers, workflow capability checks, provider messages in the workflow review panel, richer job metadata, and structured results that distinguish created artifacts from planned artifacts.


## Sprint 4 Part 5

Sprint 4 Part 5 fixes the provider execution path. Prepare for AI now uses the Browser Provider to create a real downloadable Markdown artifact from the inspected media metadata.


## Sprint 4 Part 6

Sprint 4 Part 6 improves the first real artifact workflow with a clear results explanation, artifact preview, copy-to-clipboard support, and clearer download instructions.


## Sprint 5 Part 1

Sprint 5 Part 1 introduces the intent-first interface. Users choose plain-language goals while workflows, providers, AI, and other implementation details remain internal. URL input is documented as a planned source option.


## Sprint 5 Part 2

Added the Viewer for video, audio, images, text, Markdown, and PDF files while preserving the intent-first experience.
