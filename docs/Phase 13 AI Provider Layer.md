# Phase 13 - AI Provider Layer

Phase 13 introduces a provider-neutral assistance boundary. Workflows and human review controls do not depend on a named AI service.

## Components

- `ai-provider-layer.js` registers providers, selects a preferred provider, reports capabilities, sanitizes request context, and normalizes provider results.
- `local-assist-provider.js` supplies on-device caption drafting and audio-description review checkpoints from existing Shared Knowledge.
- `connected-ai-provider.js` supports an optional user-configured JSON endpoint for transcription drafts, caption drafts, visual analysis, and audio-description drafts.
- The provider configuration interface is keyboard accessible, uses native form controls, announces status changes, and presents privacy information before use.

## Standard capabilities

- `transcription-draft`
- `caption-draft`
- `visual-analysis`
- `audio-description-draft`

All provider results remain drafts. Existing transcript, caption, and audio-description review confirmation is still required before the Workflow Execution Engine can save completed outputs.

## Connected provider contract

The application sends JSON containing `schemaVersion`, `capability`, optional `model`, and a sanitized `context`. The endpoint returns transcript `text`, timed `cues`, or analysis data appropriate to the requested capability. Credentials are stored only in session storage and are never written to Shared Knowledge.
