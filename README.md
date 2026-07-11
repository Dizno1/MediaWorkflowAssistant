# MediaWorkflowAssistant

An accessibility-first media workflow application that analyzes media and helps users accomplish captioning, transcription, audio description, compression, conversion, and AI preparation through goal-oriented workflows.

## Current Milestone

Phase 21 of the executable accessibility workflow roadmap is complete.

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
- A production Accessibility Package workflow that creates a portable ZIP from Shared Knowledge, workflow history, and approved outputs.
- An accessible pre-export review with artifact selection, package naming, privacy confirmation, and final manifest regeneration.
- A complete Create Transcript workflow with an accessible editing and review workspace, validation, plain-text export, Output Manager registration, and Shared Knowledge updates.
- A complete Create Captions workflow with transcript reuse, an accessible timed-cue editor, timing validation, reviewed WebVTT export, a caption review record, Output Manager registration, and Shared Knowledge updates.
- A complete Audio Description workflow with an accessible timed narration editor, placement and timing validation, reviewed script and review-record exports, Output Manager registration, Shared Knowledge updates, and recommendation completion tracking.
- An outcome-based Workflow Chain coordinator that orders dependent accessibility work, skips completed actions, preserves human review checkpoints, continues automatically after successful steps, and pauses safely on failure or cancellation.
- An AI Provider Layer with capability discovery, preferred-provider selection, a private on-device assistance provider, and an optional connected JSON provider for transcription, caption, visual-analysis, and audio-description drafting.
- An accessible Project Workspace that organizes multiple related sources, source-level Shared Knowledge summaries, generated artifact counts, workflow history, and project readiness status under one persistent project.
- Project-aware Accessibility Intelligence that evaluates every source, calculates completion, detects missing or blocked work, identifies stale accessibility packages, and prioritizes the best next actions across the active project.
- Automatic provider guidance that keeps provider selection under the hood, favors private and no-additional-cost methods, warns before external processing or possible charges, securely stores connected-service credentials for the browser session only, and preserves provider overrides inside Advanced assistance settings.
- Project-aware Human Review and Approval that automatically creates review records for completed transcript, caption, audio-description, and package work; supports assignments, comments, approval, rejection, and revision history; and prevents publication readiness until required reviews are approved.
- Publication Readiness validation that combines workflow completion, accessibility intelligence, human approvals, and package freshness into a single project readiness score with clear blocking reasons and plain-language next steps.
- Executable connected transcription that sends the selected local audio or video content only after privacy and cost confirmation, then places the returned text into the existing accessible review workspace.
- A complete Describe This Picture workflow that sends the selected image only after confirmation, receives an editable description, requires human review, and exports a registered plain-text artifact.
- A built-in OpenAI service adapter, configured only in Advanced assistance settings, that performs direct audio and video transcription and image analysis without requiring a custom intermediary endpoint.
- Plain-language direct goal execution after source inspection, including Transcribe This, Describe This Picture, Create Captions, Create Audio Description, Extract Audio, Create an Accessibility Package, and Make This Accessible.
- Automatic provider selection that can choose the built-in adapter while preserving privacy and possible-cost confirmation before any source leaves the browser.
- Automatic timed caption drafting from provider speech timestamps, with readable cue segmentation and a transcript-based fallback when exact timing is unavailable.
- Automatic timed audio-description drafting from locally sampled video frames and available transcript context, with all narration returned to the existing mandatory review workspace.


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


### Project Workspace

`project-workspace.js` provides a persistent project layer above individual source records. It:

- Creates, selects, renames, archives, restores, and deletes projects stored in the browser.
- Adds the current source to the active project automatically after inspection.
- Keeps separate Shared Knowledge for each source while exposing project-level summaries.
- Records completed workflows and their artifact names in project history.
- Reports project state as Incomplete, In Progress, Review Required, Ready to Publish, or Archived.
- Preserves project membership and history across browser visits without storing the original media file.

The workspace uses native form controls, headings, lists, status regions, and keyboard-operable actions. Selecting a project never changes or deletes the source currently open in the application.

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

### Accessibility Package pipeline

The production Accessibility Package workflow:

1. Collects Shared Knowledge and workflow history for the current source.
2. Identifies completed accessibility work, remaining gaps, and recommended follow-up actions.
3. Collects generated files whose runtime data is still available in the browser session.
4. Creates a readable `manifest.md` and machine-readable `manifest.json`.
5. Builds a portable ZIP locally without a network request or third-party dependency.
6. Registers the ZIP with the Output Manager and records completion in Shared Knowledge.
7. Becomes available again automatically when later workflow work makes the existing package stale.

The original source is not included automatically. Persisted output records whose temporary browser file data is unavailable are listed clearly in the manifest.

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

### Phase 7 - Accessibility Package - Completed

The application creates a portable ZIP containing readable and machine-readable manifests, available generated files, completed accessibility work, remaining gaps, workflow history, and recommended follow-up actions.

## Development Progress Rule

Every development cycle must begin by reading this README and the full repository. Update this README before returning the project ZIP so it records the completion state and identifies the next phase.

### Phase 8 - Package Review and Export Controls - Completed

The Accessibility Package workflow now opens an accessible review before execution. Users can inspect available artifacts, include or exclude files, rename the ZIP, review privacy notices, and confirm sensitive inclusions. The final selection is passed through the existing execution pipeline, both manifests are regenerated from the approved contents, exclusions are recorded, and Shared Knowledge stores the export choices.

### Phase 9 - Create Transcript Production Workflow - Completed

Create Transcript is now a complete production workflow. It opens a keyboard-accessible transcript editor beside the existing media viewer, requires transcript content and an explicit accuracy review, executes through the Workflow Execution Engine, creates a reviewed plain-text transcript, registers the artifact with the Output Manager, and records completion, word count, and review time in Shared Knowledge. Recommendations stop offering transcription once the completed transcript is recorded.

### Phase 10 - Create Captions Production Workflow - Completed

Create Captions is now a complete production workflow. It reuses a completed transcript when one is available, creates starter timed cues, and opens a keyboard-accessible cue editor with individually labeled start time, end time, and caption text controls. Users can add and remove cues, review the source in the existing Viewer, and confirm the completed caption set. Validation blocks empty cues, invalid timestamps, end times before start times, overlaps, and cues that extend beyond the source duration. The Workflow Execution Engine exports a reviewed WebVTT file and a readable caption review record, registers both outputs with the Output Manager, and records caption completion, cue count, review time, and high-confidence status in Shared Knowledge. Recommendations automatically stop offering Create Captions after completion.

### Phase 11 - Audio Description Production Workflow - Completed

Audio Description is now a complete production workflow. It provides a keyboard-accessible timed narration editor with labeled start and end times, narration placement choices, production notes, add and remove controls, review confirmation, and live validation feedback. The workflow validates timestamp format, chronology, source duration, narration content, and review confirmation. The Workflow Execution Engine exports a reviewed Markdown audio description script and a separate review record, registers both artifacts with the Output Manager, records cue count and review time in Shared Knowledge, and automatically marks the recommendation complete.

### Phase 12 - Workflow Chaining - Completed

Users can now choose the complete "Prepare media for accessibility" outcome instead of starting every workflow separately. The application builds an ordered chain from current recommendations, skips work already recorded in Shared Knowledge, and coordinates Extract Audio, Create Transcript, Create Captions, Audio Description, and Accessibility Package. Transcript, caption, audio description, and package creation remain human review checkpoints. The chain continues automatically after successful execution, announces each transition, and pauses safely when a step fails or the user cancels.

### Phase 13 - AI Provider Layer - Completed

Interchangeable assistance providers now register standard capabilities without changing workflow definitions. The application selects an appropriate provider automatically, while advanced users can review provider details, configure an optional HTTPS JSON endpoint, or deliberately override the automatic choice. A local on-device provider creates caption drafts and audio-description review checkpoints from existing Shared Knowledge. Connected credentials remain in session storage only. All generated material remains a draft and must pass the existing accessible human-review controls before the Workflow Execution Engine records completion.


### Phase 14 - Intelligent Project Workspace - Completed

The application now supports persistent projects containing multiple related media sources. Users can create and select projects, rename or archive them, and review project-level source counts, recorded artifact counts, completed workflow counts, and readiness status. Every inspected source is added automatically to the active project, while its detailed Shared Knowledge remains source-specific. Completed jobs are recorded in project workflow history with their source and created artifact names. The workspace recognizes Incomplete, In Progress, Review Required, Ready to Publish, and Archived states and restores the active project on later visits.

### Phase 15 - Project Accessibility Intelligence - Completed

The active workspace now receives project-wide accessibility guidance. Every source is evaluated against media-appropriate deliverables, with completion percentages calculated at source and project level. The intelligence layer distinguishes missing, blocked, in-progress, complete, and stale work; prioritizes dependencies such as transcript before captions; and detects when an accessibility package must be regenerated because newer transcript, caption, or audio-description work was completed. The Project Workspace presents an accessible summary, progress facts, and an ordered list of next actions that recalculates automatically as work changes.

### Phase 16 - Provider Guidance, Cost Awareness, and Secure Configuration - Completed

Automatic provider guidance, privacy and cost confirmation, session-only credentials, and advanced overrides are complete.

### Phase 17 - Human Review and Approval - Completed

Project-aware review records, assignments, comments, approval, rejection, and revision history are complete.

### Phase 18 - Publication Readiness - Completed

Workflow completion, approvals, package freshness, blocking reasons, and project readiness scoring are combined into one plain-language evaluation.

### Phase 19 - Executable Transcription and Image Description - Completed

Connected transcription now receives the actual selected audio or video source, and Describe This Picture is a complete accessible workflow with source transfer, editable AI draft, human review, export, Output Manager registration, and Shared Knowledge updates. Provider choice remains hidden during normal use. External processing and possible charges are disclosed before source content leaves the browser.

## Remaining Roadmap

- Add built-in adapters for supported transcription and vision services so users do not need to provide a custom endpoint contract.
- Generate or record narration and combine it with the source media.
- Render and export a final accessible video package.

### Phase 20 - Built-in Provider Adapters and Direct Goal Execution - Completed

The application now includes a built-in OpenAI adapter for direct transcription and image description. Credentials remain in session storage, provider choice remains inside Advanced assistance settings, and every external request requires a privacy and possible-cost confirmation. After a source is inspected, users can type a plain-language goal and begin the matched workflow without selecting providers or understanding workflow order. Existing accessible transcript and image-description review checkpoints remain mandatory before final artifacts are saved.

New files and subsystems:

- `js/openai-provider.js` provides direct OpenAI transcription and visual-analysis capabilities.
- The direct goal form in `index.html` maps plain-language outcomes to existing intents and workflow chains.
- `js/app.js` coordinates goal matching, provider configuration, disclosure, and accessible focus/status behavior.

### Phase 21 - Automatic Caption and Audio Description Drafting - Completed

The built-in provider adapter can now create timed caption drafts from speech segment timestamps and useful timed audio-description drafts from locally sampled video frames. Caption text is divided into readable cues without overlapping timing. When exact speech timing is unavailable, the application can create an explicitly identified transcript-based fallback draft. Audio-description drafting combines timestamped frame samples with available transcript context to reduce duplication of spoken information. Both workflows continue through the existing accessible human-review, validation, approval, export, Output Manager, Shared Knowledge, workflow-chain, and project-review systems.

New files and subsystems:

- `js/caption-drafting.js` normalizes provider speech segments, creates readable timed cues, and supplies the transcript-based fallback.
- `js/ad-drafting.js` samples local video frames in the browser and normalizes timed narration drafts.
- `js/openai-provider.js` now provides built-in `caption-draft` and `audio-description-draft` capabilities in addition to transcription and image analysis.
- `js/app.js` now supplies the selected local source to timed caption drafting after the required privacy and cost confirmation.

## Next Development Phase

Phase 22 - Narration Generation and Accessible Audio Mixing. Generate or record narration from an approved audio-description script, provide accessible voice and pronunciation review, mix narration with the original audio while preserving dialogue and important sounds, and prepare the result for final accessible video rendering.
