# Sprint 5 Part 4 Notes

Sprint 5 Part 4 connects the first two media actions to working browser-based processing.

## Working actions

- Make the video smaller creates a lower-bitrate WebM copy from a local video file.
- Save the audio creates an audio-only WebM or OGG copy from a local video file.
- Save information about this file remains available.

## Behavior

- Processing happens on the user's device.
- The original file is not changed or uploaded.
- The created file is presented in the existing result area with a download button.
- Web addresses can still be inspected, but media conversion requires a local file.
- Browser support is checked before processing begins.

## Accessibility

- Existing keyboard operation is preserved.
- Existing status and completion announcements are preserved.
- Buttons use ordinary task language.
- Errors explain what the user can do next without exposing implementation details.
