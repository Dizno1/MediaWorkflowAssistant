# MediaWorkflowAssistant

An accessibility-first media workflow application that automatically analyzes media and helps users accomplish tasks such as captioning, transcription, audio description, compression, and AI preparation through intelligent, goal-oriented workflows.

## Current Milestone

This repository now contains the first working application shell.

The application can:

- Accept a file through a drop zone or file picker.
- Inspect the file in the browser.
- Identify the general media type from MIME type and extension.
- Announce status changes through a polite live region.
- Recommend possible goal-oriented workflows.
- Preview placeholder workflow steps.

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
```

## Local Use

Open `index.html` in a browser.

No build step is required.

## Next Sprint

The next development step is the richer Media Inspector:

- Video duration.
- Video dimensions.
- Audio duration.
- Better document and archive recognition.
- More detailed recommendation rules.
- A workflow execution model that can run placeholder steps one at a time before real processing is added.
