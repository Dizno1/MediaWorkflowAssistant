# Phase 23 Accessible Video Rendering and Publication Export

## Status

Completed.

## Purpose

Phase 23 turns reviewed accessibility assets into a publication-ready video package. The browser combines the original video picture with the approved described-audio WAV, records a new WebM locally, and packages it with reviewed WebVTT captions and an accessible HTML player where captions remain selectable.

## Functional implementation

- Adds the Render accessible video goal for local video sources.
- Requires a completed WebVTT caption artifact and described-audio WAV artifact from the current browser session.
- Renders the original picture and approved described soundtrack locally with browser media APIs.
- Exports a WebM accessible video.
- Creates a ZIP containing the WebM, selectable captions, an accessible HTML player, a machine-readable manifest, and a final validation checklist.
- Registers all outputs through the existing Output Manager and Shared Knowledge workflow history.
- Supports cancellation and progress announcements during real-time rendering.

## Accessibility

The export player uses native HTML video controls and a caption track. The workflow retains keyboard access, live progress announcements, explicit file labels, and a readable human validation checklist.

## Limitations

Rendering runs in real time and the browser tab must remain open. WebM is used because browser MediaRecorder support does not provide dependable MP4 rendering or embedded selectable caption tracks. Selectable captions are supplied through the standards-based HTML player and external WebVTT file in the publication package.

## Next phase

Phase 24 should add resilient large-file processing, resumable rendering, provider and browser size guidance, and per-cue narration preview and regeneration.
