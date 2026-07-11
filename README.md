# MediaWorkflowAssistant

An accessibility-first media workflow application that analyzes media and helps users accomplish captioning, transcription, audio description, compression, conversion, and AI preparation through goal-oriented workflows.

## Current Milestone

Phase 30 of the executable accessibility workflow roadmap is complete.

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
- Reviewed narration synthesis through the built-in OpenAI adapter, with voice and speed controls, explicit cost and privacy confirmation, and a no-cost manual-recording alternative.
- Local browser-based audio mixing that ducks the original soundtrack during narration cues and exports a described-audio WAV file while preserving the reviewed script and review record.
- Local accessible-video rendering that combines the original picture with the approved described-audio soundtrack, then creates a publication ZIP containing the rendered WebM, selectable WebVTT captions, an accessible HTML player, a manifest, and a final validation checklist.
- A complete Make This Accessible orchestrator that builds a media-specific plan, skips completed work, runs automatic steps, pauses only for required human review, resumes after approval, refreshes dependencies after every result, renders the accessible video when possible, and creates the final accessibility package.
- Advanced accessibility analysis that scores scene understanding, speaker recognition, caption quality, audio-description quality, visual accessibility, and narration optimization; reports measurable reading-speed and cue-density indicators; refreshes after completed work; and optionally performs deeper provider analysis after privacy and cost confirmation.
- A complete Publication Pipeline with selectable export profiles, project-wide readiness validation, delivery targets, accessible blocking reports, portable ZIP packaging, source and workflow inventories, review records, deployment instructions, available runtime artifacts, and SHA-256 checksums.
- Persistent resumable jobs with centralized state transitions, checkpoints, recoverable errors, retry limits, startup crash recovery, accessible resume controls, batch records and controls, chronological project event history, and duplicate-worker protection for browser-background execution.
- A project-level Accessibility Advisor that reviews completed work like an accessibility consultant, identifies critical, major, and minor risks, recommends improvements, scores six readiness categories, assigns an overall accessibility-readiness score, detects stale reviews, records final reviewer acceptance, and blocks publication until the current review is accepted.
- A secure Provider Manager with copy-and-paste configuration for OpenAI, Azure OpenAI, and Google Gemini; encrypted browser-profile storage; connection testing; clear controls; automatic capability-based selection; and no credential storage in repositories or project exports.
- A complete Provider Manager workspace with show-or-hide key controls, configured and last-tested status, multiple named Azure resources, Anthropic support, optional local Ollama and Whisper detection, and automatic migration of existing Phase 29 Azure settings.


## Phase 30 Provider Manager

Phase 30 makes provider setup directly discoverable inside Advanced assistance settings. Users can paste credentials into protected fields, reveal a key only while editing, save it to encrypted browser-profile storage, test the connection, and clear it without touching repository files. Azure OpenAI supports multiple named resource profiles. Anthropic, local Ollama, and local Whisper are now registered with the capability-selection layer.

The normal workflow remains provider-neutral. Automatic selection asks which configured method can perform the required task and continues to require privacy and possible-cost confirmation before external processing. See `docs/Phase 30 Provider Manager.md` for implementation details, migration behavior, accessibility notes, and local-service limitations.


## Design Principle

Users choose outcomes. The application builds and executes the workflow.

Implementation details such as media tracks, codecs, containers, browser recording APIs, and processing providers remain behind plain-language goals.

## Getting the Application Running

1. Copy the project source into a local folder. The `.git` directory is not required to run the application.
2. Open the folder in a current version of Chrome, Edge, or Firefox.
3. Start a simple local web server from the project folder. Python users can run `python -m http.server 8000`. Node users can run `npx serve .`. A local server is recommended because browser security restrictions can block media, module, and file features when `index.html` is opened directly.
4. Open the address reported by the server, commonly `http://localhost:8000`.
5. Choose a local media file. The original file remains on the device unless a connected assistance feature is explicitly confirmed.
6. To use connected AI assistance, open Advanced assistance settings and paste an OpenAI, Azure OpenAI, or Google Gemini credential. Credentials are encrypted in this browser profile on this computer and are never written into project source or exported packages. Use each provider's Test connection button before starting paid work.
7. Leave provider selection on Automatic, recommended. The application chooses the available provider and displays privacy and possible-cost confirmation before external processing.
8. Enter a plain-language goal such as `Make this video accessible`, then review each required human checkpoint.
9. Keep the browser tab open while long media jobs run. Generated runtime files remain available only for the current browser session, so download important outputs before closing the tab.
10. For narration mixing, use a browser that can decode the source video's audio track through the Web Audio API. MP4 and WebM support depends on the browser and operating system codecs. If decoding fails, create a browser-compatible copy of the source and run the workflow again.

No build step or package installation is required for the application itself.

## Local Processing Requirements

Extract Audio requires a supported local video containing an audio track and a browser that supports `MediaRecorder` and media stream capture. Described-audio mixing requires `AudioContext`, `OfflineAudioContext`, and browser support for decoding the selected source audio. The described-audio result is exported as WAV. Accessible-video rendering requires `MediaRecorder`, video `captureStream`, Web Audio routing, and WebM encoding support. Rendering runs in real time. Selectable captions are delivered through the included accessible HTML player and external WebVTT track because browser MediaRecorder does not reliably embed selectable captions or create MP4 files.

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

### Phase 22 - Narration Generation and Accessible Audio Mixing - Completed

Phase 22 converts a reviewed audio-description script into synthesized narration clips and a locally mixed described-audio WAV file. It adds voice, speed, narration-volume, and source-ducking controls; requires explicit privacy and possible-cost confirmation before synthesis; preserves a no-cost manual-recording path; and uses browser-native audio decoding and offline rendering so the original source audio is mixed locally.

New architecture includes `js/narration-mixer.js`, the `narration-audio` provider capability, synthesized cue handling in the built-in OpenAI adapter, and optional narration production within the existing audio-description review checkpoint.

See `docs/Phase 22 Narration Generation and Accessible Audio Mixing.md`.

## Remaining Roadmap

- Add resilient large-file processing, resumable rendering, and provider-specific size-limit guidance.
- Add narration preview, per-cue regeneration, pronunciation overrides, and cue-specific gain controls.
- Add additional publication presets and optional server-side MP4/HLS export adapters.
- Add automated playback inspection and caption synchronization diagnostics.

### Phase 23 - Accessible Video Rendering and Publication Export - Completed

Phase 23 adds a production Render Accessible Video workflow for local video sources. The workflow validates that reviewed WebVTT captions and a described-audio WAV are available in the current browser session, combines the original picture with the approved described soundtrack, and records a new WebM locally. It then creates a publication ZIP containing the rendered video, selectable WebVTT captions, an accessible native HTML video player, a machine-readable publication manifest, and a readable final validation checklist.

The workflow reports real-time progress, supports cancellation, registers outputs through the Output Manager, records completion in Shared Knowledge and project history, and keeps all rendering local to the browser.

New files and subsystems:

- `js/publication-renderer.js` performs synchronized local picture and described-audio rendering and builds the publication package.
- `workflows/render-accessible-video.json` defines the production workflow contract.
- `docs/Phase 23 Accessible Video Rendering and Publication Export.md` documents behavior, accessibility, browser requirements, and limitations.
- `js/media-inspector.js`, `js/workflow-registry.js`, `js/intent-engine.js`, `js/browser-provider.js`, `js/workflow-runner.js`, and `js/app.js` expose, validate, execute, and track the new goal.

See `docs/Phase 23 Accessible Video Rendering and Publication Export.md`.

## Phase 24 - Make This Accessible Orchestrator - Completed

Phase 24 completes the unified goal-driven orchestration workflow. Choosing Make This Accessible now starts the required media-specific plan directly. The application skips completed work, executes non-review steps automatically, opens existing accessible human-review checkpoints only when judgment is required, and resumes after approved work is saved.

The video plan now coordinates Extract Audio, Create Transcript, Create Captions, Audio Description, Render Accessible Video, and Accessibility Package. Audio and image sources receive smaller media-appropriate plans. Provider availability and Shared Knowledge are refreshed after every completed step so downstream work can use newly created artifacts. Blocked, failed, and cancelled work pauses safely without discarding completed outputs.

New architecture and workflow changes:

- `js/workflow-chain.js` now owns media-specific orchestration order, dynamic step refresh, review pauses, blocked states, failure states, and completion summaries.
- `js/app.js` starts Make This Accessible directly, resumes it after each completed job, and defaults orchestrated audio-description review to narration production so accessible-video rendering can use the described soundtrack.
- Existing execution, provider, review, Shared Knowledge, Output Manager, project, rendering, and packaging systems are reused.
- `docs/Phase 24 Make This Accessible Orchestrator.md` documents the completed behavior and architecture.

## Phase 25 - Advanced AI Analysis - Completed

Phase 25 adds an accessible quality-analysis panel that runs automatically after source inspection and refreshes after workflow completion. The local analysis uses inspection data and Shared Knowledge to score scene understanding, speaker recognition, caption quality, audio-description quality, visual accessibility, and narration optimization. It reports measurable indicators including estimated reading speed and cue density, plus actionable findings.

A Run deeper AI analysis action uses the existing provider layer. The application keeps provider choice under the hood, requires the existing privacy and possible-cost confirmation, normalizes structured provider findings, and stores the completed report in Shared Knowledge. The built-in OpenAI adapter now supports the `advanced-accessibility-analysis` capability.

New files and subsystems:

- `js/advanced-analysis.js` provides local scoring, quality findings, metrics, accessible rendering, deeper provider execution, normalization, and persistence.
- `docs/Phase 25 Advanced AI Analysis.md` documents behavior, architecture, accessibility, and limitations.
- `index.html`, `css/styles.css`, `js/app.js`, and `js/openai-provider.js` integrate the new panel and provider capability.

See `docs/Phase 25 Advanced AI Analysis.md`.

## Phase 26 - Publication Pipeline - Completed

Phase 26 adds a project-level Publication Pipeline that turns approved accessibility work into a delivery-ready package. The active project can be validated against one of three export profiles: Accessible Web Publication, Learning Platform Delivery, or Accessible Archive Master. Validation checks every source for media-appropriate required work, rejected or pending reviews, workflow history, and package completion. Blocking issues prevent final export and are presented in an accessible, focusable report with a readiness score, warnings, and passed checks.

The completed pipeline supports four delivery targets: local download, web-hosting handoff, learning-platform handoff, and records archive. The package is built locally in the browser and includes a machine-readable publication manifest, plain-text readiness report, source inventory, workflow history, human-review records, delivery instructions, all currently available runtime artifacts, and SHA-256 checksums when browser support is available. No source or credential is transmitted during packaging.

New files and subsystems:

- `js/publication-pipeline.js` provides export profiles, delivery targets, project validation, accessible results, packaging, checksums, and publication history records.
- `index.html` adds the project-level Publication Pipeline interface.
- `css/styles.css` adds responsive, keyboard-visible publication controls and validation presentation.
- `js/output-manager.js` now exposes available runtime artifacts to the publication packager.
- `docs/Phase 26 Publication Pipeline.md` documents architecture, behavior, accessibility, package contents, and limitations.

See `docs/Phase 26 Publication Pipeline.md`.

## Phase 27 - Production Features - Completed

Phase 27 extends the existing execution engine and Project Workspace with durable browser-based production state. Jobs now use a centralized state model, persistent checkpoints, completed and pending step tracking, recoverable errors, retry limits, resume controls, startup interruption detection, batch records, aggregate progress, accessible batch actions, and chronological project event history. Duplicate execution is prevented by the existing single queue plus job-ID checks. Processing may continue while users navigate elsewhere in the open application, but the browser must remain open. Paid, destructive, and publication operations never restart silently.

Storage changes are additive and versioned. Existing Phase 26 projects and settings remain intact. Because browsers cannot safely persist local `File` objects, a fully restarted browser may require the original source to be chosen again before resume.

New and modified files:

- `js/production-features.js` adds job persistence, state transitions, checkpoints, recovery, batches, history, retries, and accessible rendering.
- `js/job.js` creates production-ready job records and initial checkpoints.
- `js/execution-engine.js` adds duplicate protection, pause, resume-safe queue behavior, and batch updates.
- `js/workflow-runner.js` skips completed steps and writes execution-boundary checkpoints.
- `js/project-workspace.js` adds persistent project event history.
- `index.html`, `css/styles.css`, and `js/app.js` integrate accessible controls, announcements, resume context, and lifecycle persistence.
- `docs/Phase 27 Production Features.md` documents architecture, migration, testing, accessibility, and limitations.

See `docs/Phase 27 Production Features.md`.

## Phase 28 - Accessibility Advisor - Completed

Phase 28 adds a persistent, project-level Accessibility Advisor that evaluates the evidence produced by the existing orchestration, analysis, review, production, and publication systems. The Advisor identifies accessibility issues by severity, explains remaining risks, recommends specific improvements, records completed strengths, calculates category scores, and assigns an overall accessibility-readiness score.

A final reviewer can accept a current Advisor report for publication when no critical issues remain. Reports are fingerprinted against source snapshots, workflow history, human-review records, and publication records so later project changes make an earlier report visibly stale. The Publication Pipeline now blocks export until a current Advisor review has been accepted and includes the Advisor report in both JSON and plain-text formats inside the final package.

New and modified files:

- `js/accessibility-advisor.js` provides project evaluation, severity-based findings, recommendations, category scoring, overall readiness scoring, report persistence, staleness detection, final reviewer acceptance, accessible rendering, and plain-text report export.
- `index.html` adds the Accessibility Advisor review and decision interface.
- `css/styles.css` adds accessible report, severity, stale-state, and decision presentation.
- `js/app.js` refreshes Advisor and publication state when project evidence changes.
- `js/publication-pipeline.js` requires a current accepted Advisor review and includes Advisor records in publication packages.
- `docs/Phase 28 Accessibility Advisor.md` documents architecture, behavior, accessibility, testing, storage, and limitations.

See `docs/Phase 28 Accessibility Advisor.md`.

## Phase 29 - Secure Provider Manager - Completed

Phase 29 adds an accessible Advanced assistance settings interface for copying and pasting OpenAI, Azure OpenAI, and Google Gemini credentials. Provider settings are encrypted with a non-exportable AES-GCM key and saved in IndexedDB for the current browser profile. Password fields clear after saving, existing credentials are preserved when non-secret settings change, and each provider includes Save, Test connection, and Clear controls.

Provider selection remains automatic during normal workflows. The AI Provider Layer can use configured capabilities while preserving the existing privacy and possible-cost confirmation. Credentials never enter project files, Shared Knowledge, workflow history, publication packages, or returned ZIP archives.

New and modified files:

- `js/secure-credential-store.js` provides encrypted IndexedDB credential storage using the Web Crypto API.
- `js/azure-openai-provider.js` adds a built-in Azure OpenAI adapter and connection test.
- `js/gemini-provider.js` adds a built-in Gemini adapter and connection test.
- `js/openai-provider.js` now persists its credential through the secure store and includes connection testing.
- `index.html` adds labeled OpenAI, Azure OpenAI, and Gemini provider controls.
- `js/app.js` coordinates save, test, clear, status announcements, and restored provider availability.
- `docs/Phase 29 Secure Provider Manager.md` documents security, behavior, accessibility, testing, and limitations.

See `docs/Phase 29 Secure Provider Manager.md`.

## Phase 30 - Complete Provider Manager - Completed

Phase 30 turns provider configuration into a complete, discoverable workspace. It adds protected copy-and-paste fields, show-or-hide controls, configured and last-tested status, multiple named Azure OpenAI resources, an Anthropic adapter, and optional local Ollama and Whisper detection. Existing Phase 29 Azure settings migrate automatically into the new profile structure.

New and modified files:

- `js/provider-manager-ui.js` coordinates provider configuration status, key visibility, Azure resource profiles, and local-service detection.
- `js/azure-openai-provider.js` now supports multiple encrypted Azure resource profiles and migration from the Phase 29 single-resource format.
- `js/anthropic-provider.js` adds Anthropic visual-analysis, audio-description, and accessibility-analysis capabilities.
- `js/local-service-provider.js` adds optional local Ollama and Whisper capability registration and connection detection.
- `js/openai-provider.js` and `js/gemini-provider.js` persist last-tested status.
- `index.html` adds provider shortcuts, status text, profile controls, Anthropic configuration, and local-service configuration.
- `css/styles.css` adds Provider Manager navigation and status presentation.
- `docs/Phase 30 Provider Manager.md` documents behavior, migration, accessibility, security, and limitations.

See `docs/Phase 30 Provider Manager.md`.

## Remaining Roadmap

### Phase 31 - Automated Playback Quality Assurance

Inspect completed media playback, caption timing, track availability, audio-description placement, packaging integrity, and delivery behavior with repeatable diagnostics before release.

## Next Development Phase

Phase 31 - Automated Playback Quality Assurance.
