# Phase 20 - Built-in Provider Adapters and Direct Goal Execution

## Status

Completed.

## Purpose

Phase 20 moves the application from generic connected-service plumbing to direct, usable execution. A user can select a source, state a plain-language goal, and allow the application to choose the configured method automatically.

## Completed work

- Added a built-in OpenAI adapter for audio and video transcription.
- Added direct OpenAI image analysis for editable image-description drafts.
- Kept API credentials in browser session storage only.
- Added clear privacy and possible-cost confirmation before source data is sent.
- Added a plain-language goal field immediately after source inspection.
- Mapped common requests to existing workflows and workflow chains.
- Preserved the accessible transcript and image-description review workspaces.
- Preserved automatic provider selection and Advanced Settings overrides.

## Direct goals

The direct goal interpreter recognizes requests such as:

- Transcribe this.
- Describe this picture.
- Create captions.
- Create audio description.
- Extract the audio.
- Create an accessibility package.
- Make this video accessible.

## Architecture

`openai-provider.js` registers `transcription-draft` and `visual-analysis` capabilities with the existing AI Provider Layer. The adapter uses the selected source only after confirmation, returns normalized draft results, and never writes credentials into repository files.

The direct goal form uses the existing Intent Engine and Workflow Chain rather than creating a parallel execution system. Goal matching selects an existing intent, opens its required human-review checkpoint, or opens the complete accessibility chain for review.

## Accessibility

The new controls use native labels, inputs, buttons, status regions, keyboard operation, and existing focus management. Drafts cannot be exported as completed artifacts until the user reviews and confirms them.

## Remaining work

- Generate accurately timed caption cues through a built-in provider adapter.
- Analyze video visuals and produce timed audio-description drafts.
- Improve large-file handling and provider-specific size guidance.
- Add service connection testing for the built-in adapter without sending source media.

## Next phase

Phase 21 - Automatic Caption and Audio Description Drafting.
