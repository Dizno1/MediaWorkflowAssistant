# Phase 24 - Make This Accessible Orchestrator

## Status

Completed.

## Objective

Provide one goal-driven accessibility workflow. After a source is inspected, the user can choose "Make This Accessible" and allow the application to determine and coordinate the required work.

## Implemented behavior

The orchestrator now:

- Builds a media-specific workflow plan from current recommendations and Shared Knowledge.
- Skips work already completed for the source.
- Runs non-review work automatically.
- Pauses only at required transcript, caption, image-description, audio-description, and package review checkpoints.
- Resumes automatically after an approved review is saved.
- Rebuilds provider capability and completion state after each workflow so later steps use newly created outputs.
- Includes accessible-video rendering in the video plan before final accessibility packaging.
- Enables narration production by default during an orchestrated audio-description review so the described-audio result can feed accessible-video rendering.
- Stops safely and announces a plain-language reason when a required step is blocked, fails, or is cancelled.
- Preserves every successfully completed artifact and Shared Knowledge update when later work pauses.

## Media-specific plans

Video sources coordinate Extract Audio, Create Transcript, Create Captions, Audio Description, Render Accessible Video, and Accessibility Package.

Audio sources coordinate Create Transcript and Accessibility Package.

Image sources coordinate Describe This Picture and Accessibility Package.

Other supported sources coordinate the available accessibility package work.

## Architecture

`js/workflow-chain.js` is the orchestration state model. It owns media-specific ordering, step refresh, review state, completion state, blocking, failure state, and progress summaries.

`js/app.js` starts the orchestrator directly from the plain-language goal and goal card, opens existing human-review workspaces, attaches orchestration metadata to jobs, refreshes the plan after every successful job, and resumes the next step automatically.

The orchestrator reuses the existing Workflow Execution Engine, Provider Manager, Output Manager, Shared Knowledge, Project Workspace, Human Review, publication renderer, and accessible review interfaces. No parallel execution system was introduced.

## Accessibility

- The Make This Accessible control is a native button.
- Status changes use the existing live status regions.
- Review checkpoints retain their labeled native controls and keyboard behavior.
- Focus moves to the active review, progress, goals, or completion section.
- Blocking and failure messages identify the affected workflow in plain language.

## Files changed

- `js/workflow-chain.js`
- `js/app.js`
- `index.html`
- `README.md`
- `docs/Phase 24 Make This Accessible Orchestrator.md`

## Next phase

Phase 25 - Advanced AI Analysis: scene understanding, speaker recognition, caption quality scoring, audio-description quality analysis, visual accessibility analysis, reading-speed analysis, and narration optimization.
