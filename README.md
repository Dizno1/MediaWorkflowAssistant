# MediaWorkflowAssistant

An accessibility-first media workflow application that automatically analyzes media and helps users accomplish tasks such as captioning, transcription, audio description, compression, and AI preparation through intelligent, goal-oriented workflows.

## Current Milestone

This repository now contains Phase 4 of the Accessibility Intelligence roadmap.

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
- Build one shared media knowledge model from the source inspection.
- Present an initial accessibility assessment with reasons and confidence statements.
- Distinguish technical inspection from deeper analysis that has not yet been performed.
- Pass shared knowledge, assessment data, and the ordered accessibility plan into later workflow jobs.
- Build a dependency-aware accessibility plan from the assessment.
- Show which plan steps are complete, available now, preparation-only, or waiting for deeper processing.
- Save completed workflow history and created-result metadata in one shared knowledge record.
- Restore previous work for the same source in the same browser.
- Rebuild the assessment and accessibility plan after each completed action.

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

## Sprint 5 Part 3

Added web address input and source recognition. The assistant can recognize likely media from a URL, display supported direct media and YouTube videos in the Viewer, provide safe external links for unsupported pages, and use the same goal-driven choices for local and web sources.
## Sprint 5 Part 4

Local video files can now be made smaller and their audio can be saved as a separate file directly in a supported browser. The original file remains unchanged.


## Sprint 5 Part 5

Video choices now include working local workspaces for transcripts, captions, and audio description. The audio-only action is labeled "Extract the audio" to make its purpose clear.


## Accessibility Intelligence Engine Roadmap

This README is the governing architecture document for the project. Review it before implementing future changes.

### Vision

Analyze media once. Build a shared knowledge model. Reuse that knowledge for every accessibility task.

### Phase 1 - Accessibility Intelligence Engine - Completed

Create a single media analysis that records:
- Media summary
- Speech
- Speakers
- Language
- Music and sound
- Silence
- Scene changes
- On-screen text
- Existing accessibility features
- Confidence

All future features should consume this shared model instead of repeating analysis.

### Phase 2 - Accessibility Assessment - Completed

The application now converts the shared knowledge model into plain-language recommendations with reasons and confidence. It clearly identifies where deeper speech or visual analysis is still required.

### Phase 3 - Accessibility Plan - Completed

The application now turns the assessment into an ordered, dependency-aware plan. The plan explains what should happen first, what later work reuses, and which steps are currently available or still waiting for deeper processing.

### Phase 4 - Shared Knowledge - Completed

The application now persists completed analysis and created-result metadata in the shared knowledge model. When the same source is selected again, prior work is restored and later actions can reuse it instead of starting over.

### Planned Phases

5. Recommendation Engine
6. Accessibility Package

Future development should extend the shared model rather than create isolated workflows.


## Development Progress Rule

Every development cycle must begin by reading this README and must update it before the project ZIP is returned. This file is the governing architecture and progress record for the application.

## Next Development Step

Phase 5 will turn the accumulated shared knowledge into smarter, prioritized recommendations based on what is missing, what is already complete, workflow dependencies, and currently available providers.


## Phase 4

Phase 4 adds persistent Shared Knowledge. Completed workflows now update the media knowledge model, created results are restored for the same source, and the assessment and ordered plan refresh after every action.
