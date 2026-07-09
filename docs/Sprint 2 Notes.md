# Sprint 2 Notes

Sprint 2 turns the original app shell into a stronger Media Inspector and recommendation engine.

## Added

- Asynchronous media inspection.
- Video and audio metadata reading through browser media elements.
- Duration detection for supported audio and video files.
- Video dimension detection for supported video files.
- A reusable inspection object with media flags such as hasAudio, hasVideo, hasImages, hasReadableText, hasCaptions, hasTranscript, and hasAudioDescription.
- Workflow registry requirements so recommendations are based on media capabilities, not only file type.
- Recommendation cards with category, description, and accessible preview buttons.
- Progressive disclosure so recommendations and workflow preview sections appear only when useful.
- Focus movement to the workflow preview after a recommendation is selected.

## Still Placeholder

The workflows still preview steps only. No real FFmpeg, speech recognition, OCR, caption generation, or audio description processing has been connected yet.

## Recommended Next Sprint

Sprint 3 should implement the first real workflow. Extract Audio is the recommended first workflow because it proves the workflow runner, progress messages, output handling, and error states without requiring AI services.
