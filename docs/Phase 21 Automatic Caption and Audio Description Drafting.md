# Phase 21 - Automatic Caption and Audio Description Drafting

## Status

Completed.

## Purpose

Phase 21 turns completed transcripts and local video sources into useful, editable timed drafts while preserving the application's goal-first workflow and mandatory human review.

## Completed work

- Added built-in timed caption drafting through the OpenAI adapter.
- Requests speech segment timestamps from the selected local audio or video source.
- Converts returned speech segments into WebVTT-ready caption cues.
- Splits long speech segments into readable cue-sized text while preserving chronology.
- Falls back to transcript-based cue distribution when exact provider timing is unavailable.
- Added local video frame sampling for audio-description drafting.
- Samples representative frames in the browser without uploading the original video as a video object.
- Sends timestamped frame samples and available transcript context only after privacy and possible-cost confirmation.
- Converts the provider response into editable timed narration cues.
- Normalizes narration placement choices to the existing accessible review controls.
- Preserved the existing caption and audio-description validation, editing, approval, export, Output Manager, Shared Knowledge, workflow-chain, and project-review architecture.
- Kept provider selection inside Advanced assistance settings.
- Kept credentials in browser session storage only.

## New architecture

`js/caption-drafting.js` normalizes speech segments, splits long text, formats timestamps, removes timing overlaps, and creates a transcript-based fallback draft.

`js/ad-drafting.js` opens the selected local video in the browser, samples a limited set of timestamped frames with a canvas, normalizes returned narration cues, and maps provider placement values to the existing review form.

`js/openai-provider.js` now registers four capabilities:

- `transcription-draft`
- `caption-draft`
- `visual-analysis`
- `audio-description-draft`

Caption drafting uses timed transcription data. Audio-description drafting uses sampled frames, source duration, and available transcript context. Both return drafts to the existing human-review checkpoints rather than bypassing them.

## Accessibility

All generated cues open in the existing keyboard-accessible review workspaces. Every time, caption, narration, and placement remains editable through labeled native controls. Status changes are announced through existing live regions. Drafts cannot be exported or marked complete until the user confirms review.

## Privacy and cost behavior

The application continues to disclose external processing and possible charges before execution. Caption drafting sends the selected local source after confirmation. Audio-description drafting samples frames locally and sends those timestamped samples after confirmation. API keys remain in session storage and are never committed to project files.

## Remaining work

- Generate or record narration audio from an approved audio-description script.
- Provide voice, pronunciation, pacing, and loudness review controls.
- Mix approved narration with the source audio while preserving dialogue and important sounds.
- Render and export a final accessible video package.
- Improve large-file handling and provider-specific service limits.

## Next phase

Phase 22 - Narration Generation and Accessible Audio Mixing.
