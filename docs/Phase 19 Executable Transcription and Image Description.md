# Phase 19 - Executable Transcription and Image Description

Phase 19 redirects development to real user-requested outcomes.

## Completed

- Connected transcription requests now include the selected local audio or video bytes, file name, MIME type, size, duration, and existing project knowledge.
- Connected visual-analysis requests now include the selected local image bytes.
- Added a complete Describe This Picture workflow with an accessible draft, edit, review, validation, export, Output Manager, and Shared Knowledge path.
- Added a 50 MB browser transfer safeguard with a plain-language error.
- Preserved automatic provider selection, session-only credentials, privacy confirmation, and cost confirmation.

## Connected service request contract

The existing JSON endpoint receives `schemaVersion`, `capability`, `model`, and `context`. For source-dependent tasks, `context.sourceData` includes `name`, `mimeType`, `size`, and Base64-encoded file content. Transcription responses include `text`. Visual-analysis responses include `description` or `text`.

## Remaining work

- Add first-party provider adapters so ordinary users do not need to supply a custom compatible endpoint.
- Add timed transcription results that can flow directly into captions.
- Add automatic visual sampling for video audio-description drafting.
- Add narration generation, media composition, and final accessible-video rendering.

## Next phase

Phase 20 will add provider adapters and automatic goal execution so Transcribe This and Describe This Picture can begin directly after a file is selected, while keeping provider details in Advanced Settings.
