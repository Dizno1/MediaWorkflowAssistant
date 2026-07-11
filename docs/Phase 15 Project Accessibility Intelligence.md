# Phase 15 - Project Accessibility Intelligence

## Completion state

Phase 15 is complete.

## Implemented

- Project-wide evaluation of every source in the active workspace.
- Media-aware required deliverables for audio and video sources.
- Completion percentages at both source and project level.
- Missing, blocked, in-progress, complete, and stale workflow states.
- Dependency-aware prioritization, including transcript-before-caption guidance.
- Detection of accessibility packages that became stale after later transcript, caption, or audio-description work.
- Accessible project intelligence summary, facts, and ordered next-action list using native headings, lists, and text status.
- Automatic recalculation whenever the workspace is rendered after inspection, workflow completion, project selection, or project management changes.

## Architecture

`project-accessibility-intelligence.js` reads only persisted Project Workspace snapshots and history. It does not replace source-level assessment or recommendations. It adds a project-aware reasoning layer above them and keeps source-specific Shared Knowledge intact.

## Next phase

Phase 16 will add human review and collaboration records, including review assignments, approval states, comments, and project-wide review readiness.
