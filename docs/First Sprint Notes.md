# First Sprint Notes

## Objective

Create the first working Media Workflow Assistant shell.

## Completed

- Added an accessible application shell.
- Added a keyboard-operable drop zone.
- Added file picker support.
- Added browser-only media inspection by MIME type and file extension.
- Added a polite status region for screen reader announcements.
- Added recommended workflow buttons based on detected media type.
- Added placeholder workflow previews.
- Added initial workflow definition files.

## Not Included Yet

This sprint intentionally does not run FFmpeg, transcription, OCR, captioning, or AI services. The first milestone is a stable interaction model: the user provides media, the app identifies it, and the app recommends outcomes.

## Next Sprint

Add richer media inspection for video and audio, including duration, dimensions, and embedded track detection where browser APIs allow it.
