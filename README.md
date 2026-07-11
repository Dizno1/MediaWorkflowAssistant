# MediaWorkflowAssistant

An accessibility-first media workflow application that analyzes media and helps users accomplish captioning, transcription, audio description, compression, conversion, and AI preparation through goal-oriented workflows.

## Current Milestone

Phase 6 of the Accessibility Intelligence roadmap is complete.

The application now includes:

- Goal-first workflow architecture.
- Local file and web address source abstraction.
- Browser-based media inspection and viewing.
- Shared Knowledge persistence for source analysis, completed work, workflow history, and output metadata.
- Accessibility assessment and dependency-aware planning.
- Prioritized recommendations that adapt to workflow state.
- A Workflow Execution Engine with a queue, step execution, progress, errors, cancellation, and completion notifications.
- An Output Manager that registers generated artifacts, associates them with their source and workflow, and exposes runtime outputs to later workflows.
- The first complete production workflow: Extract Audio.

## Design Principle

Users choose outcomes. The application builds and executes the workflow.

Implementation details such as media tracks, codecs, containers, browser recording APIs, and processing providers remain behind plain-language goals.

## Local Use

Open `index.html` in a current browser. No build step is required.

Media processing remains on the user's device. Extract Audio requires a supported local video containing an audio track and a browser that supports `MediaRecorder` and media stream capture.

## Architecture

### Source and inspection

`media-inspector.js` creates the source inspection used throughout the application. `shared-knowledge.js` merges that inspection with saved source knowledge.

### Assessment, planning, and recommendations

The accessibility assessment identifies relevant improvements. The accessibility plan orders dependent work. The Recommendation Engine combines those results with provider availability, completed history, and active jobs.

Recommendations now distinguish between:

- Ready to execute
- In progress
- Completed
- Blocked

Completed workflows are removed from unfinished recommendations automatically.

### Workflow Execution Engine

`execution-engine.js` owns the workflow queue and active job. It:

- Queues jobs.
- Starts queued work in order.
- Routes progress, completion, failure, and cancellation events.
- Cancels queued or active work.
- Starts the next queued job when the current job ends.

`workflow-runner.js` validates jobs, executes workflow steps, invokes the selected provider, reports progress, handles cancellation, and sends successful outputs to the Output Manager.

### Output Manager

`output-manager.js` registers each generated artifact with:

- Artifact and job identifiers.
- Originating workflow.
- Originating source key and source name.
- Provider.
- MIME type, size, duration, and creation time when available.
- Runtime URL or readable content.

Persistent output metadata and workflow history are stored in Shared Knowledge. Runtime file URLs remain available during the current browser session.

### Extract Audio pipeline

The production Extract Audio workflow:

1. Validates that the source is a supported local video with audio.
2. Queues and starts a workflow job.
3. Reads the source media and captures its audio track.
4. Creates an Opus audio-only WebM or Ogg file, depending on browser support.
5. Reports accessible progress and errors.
6. Allows cancellation while processing.
7. Registers the artifact with the Output Manager.
8. Records workflow history and output metadata in Shared Knowledge.
9. Updates recommendations so Extract Audio becomes Completed.

## Accessibility

New execution controls use native buttons, labeled status messages, a programmatic progress bar, keyboard-operable cancellation, focus management, and polite live-region announcements. Existing screen-reader and keyboard behavior is preserved.

## Accessibility Intelligence Engine Roadmap

### Phase 1 - Accessibility Intelligence Engine - Completed

One shared media knowledge model supports every task.

### Phase 2 - Accessibility Assessment - Completed

Shared Knowledge is converted into plain-language accessibility findings and confidence statements.

### Phase 3 - Accessibility Plan - Completed

Assessment results become an ordered, dependency-aware plan.

### Phase 4 - Shared Knowledge - Completed

Completed work and output metadata persist for the same source.

### Phase 5 - Recommendation Engine - Completed

Recommendations use Shared Knowledge, dependencies, completed work, and provider availability.

### Phase 6 - Workflow Execution and Extract Audio - Completed

The execution queue, cancellation, progress pipeline, Output Manager, automatic knowledge updates, state-aware recommendations, and production Extract Audio workflow are implemented.

### Phase 7 - Accessibility Package - Planned

Create an Accessibility Package from Shared Knowledge and completed outputs. The package should include a readable manifest, created files, completed accessibility work, remaining gaps, workflow history, and recommended follow-up actions.

## Development Progress Rule

Every development cycle must begin by reading this README and the full repository. Update this README before returning the project ZIP so it records the completion state and identifies the next phase.

## Next Development Step

Phase 7 will implement the Accessibility Package workflow and package manifest using artifacts already registered by the Output Manager and knowledge already stored in Shared Knowledge.
