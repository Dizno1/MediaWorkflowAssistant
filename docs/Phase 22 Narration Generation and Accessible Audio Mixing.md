# Phase 22 - Narration Generation and Accessible Audio Mixing

## Status

Completed.

## Purpose

Phase 22 turns a reviewed audio-description script into playable narration and a described-audio mix without exposing provider selection during normal use.

## Completed work

- Added optional narration production to the existing audio-description review checkpoint.
- Added voice and speed controls for synthesized narration.
- Added narration-volume and source-ducking controls for the local mix.
- Added explicit privacy and possible-cost confirmation before narration text is sent to a connected provider.
- Added a clearly stated no-cost alternative that saves the reviewed script for manual recording.
- Added the `narration-audio` capability to the AI Provider Layer.
- Added direct reviewed-script speech synthesis through the built-in OpenAI adapter.
- Added local decoding and offline mixing of the original soundtrack and narration clips.
- Added WAV encoding and Output Manager registration for the described-audio mix.
- Preserved the reviewed script and review record whether or not narration production is selected.
- Preserved keyboard access, native labels, live status announcements, cancellation, and existing human-review requirements.

## New architecture

`js/narration-mixer.js` decodes the selected source audio and generated narration clips, schedules narration at reviewed cue timestamps, lowers the original soundtrack during narration, renders the result through `OfflineAudioContext`, and exports a WAV blob.

`js/openai-provider.js` now supports `narration-audio`. Each reviewed narration cue is synthesized separately so timing can be controlled during local mixing.

`js/ai-provider-layer.js` now passes only the reviewed narration text, voice, speed, and cue timing required for synthesis.

The existing Audio Description workflow remains the controlling review checkpoint. Narration synthesis and mixing are optional outputs of that approved workflow rather than a separate provider-facing workflow.

## Accessibility and safety

All production controls are native labeled form controls. The user can save only the script without using a paid provider. External synthesis cannot start without confirmation. The source media is not uploaded for narration synthesis. Mixing occurs locally in the browser.

## Known constraints

- Browser codec support determines whether the original video's audio can be decoded.
- The described-audio output is WAV rather than a final video container.
- Narration clips are synthesized one cue at a time and may require later per-cue refinement.
- Large media files may require a browser-compatible copy.

## Next phase

Phase 23 - Accessible Video Rendering and Publication Export.
