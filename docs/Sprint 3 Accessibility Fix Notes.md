# Sprint 3 Accessibility Fix Notes

This pass addresses field testing feedback from screen reader review.

## Fixed

- Recommendation buttons no longer repeat the card description.
- Button text is now shorter: "Review workflow".
- Each button still has a precise accessible name, such as "Review Prepare for AI workflow".
- The selected file name is now shown in the drop zone after selection.
- The helper text now says the file stays on this device instead of using "uploaded" language.
- Media detection includes more common video and audio extensions.
- Generic or missing MIME values fall back to file extension detection.

## What to test

1. Open the app.
2. Choose an audio file.
3. Confirm each recommendation card reads once.
4. Choose a video file.
5. Confirm the Current media section reports Media type Video and Contains video Yes.
6. Review a workflow.
7. Run it and confirm the Progress and Results sections announce cleanly.
