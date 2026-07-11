# Phase 27 Production Features

Phase 27 adds persistent job records, checkpoint-based resume support, crash recovery, batch management, project event history, and browser-background execution safeguards.

## Architecture

`js/production-features.js` is the central production-state subsystem. It owns the versioned browser-storage schema, stable job states and transition validation, checkpoints, interrupted-job recovery, batch records, worker duplicate protection, retry limits, and the accessible jobs, batches, and history interface.

The existing `WorkflowExecutionEngine` remains the single execution queue. Phase 27 extends it rather than creating a competing orchestrator. A job ID cannot be active and queued at the same time. Processing continues while the user navigates within the open application tab, but the interface clearly states that the browser must remain open.

## Persistent jobs and checkpoints

Each saved job records project and workflow identity, source references, progress, current and completed steps, pending and failed steps, review state, artifact references, errors, retries, timestamps, and checkpoints. Checkpoints are written when a job is created, queued, started, before and after workflow steps, paused, interrupted, failed recoverably, resumed, cancelled, and completed.

Browser `File` objects and runtime Blob URLs cannot be persisted safely in local storage. After a full browser restart, recovery therefore requires the user to choose the matching original source again. Completed step state and artifact metadata remain preserved. Paid provider calls, destructive actions, and publication are never restarted silently.

## Crash recovery

At startup, jobs left in running, preparing, retrying, or recovering states are changed to paused and recoverable. Their latest completed steps and checkpoint data are retained. The Saved jobs interface exposes Resume. If the original source is not available in the current browser session, the application asks the user to choose it again rather than restarting blindly.

## Batch processing

The subsystem supports named batches with controlled concurrency values from one through three, aggregate progress, individual job status, pause, resume, cancellation of pending work, and retry of failed work. One failed item does not cancel unaffected items. The current UI manages persisted batches created through the production subsystem; future source-selection enhancements can expose bulk file creation without changing the batch model.

## Project history

Projects now include `eventHistory`, separate from the Phase 14 workflow summary history. Events are chronological, human-readable, associated with the correct project and job, and persisted with the existing Project Workspace local-storage architecture. The interface uses headings, native buttons, lists, time elements, and polite announcements.

## Storage migration

Phase 27 adds:

- `media-workflow-assistant-production-schema` version 2
- `media-workflow-assistant-jobs:v2`
- `media-workflow-assistant-batches:v1`
- `eventHistory` on Project Workspace records

Migration is additive. Existing Phase 26 projects, source knowledge, settings, reviews, publication records, and workflow history are preserved.

## Testing

Run the application from a local web server. Start a local workflow, verify the Saved jobs status and checkpoints, pause and resume it, then reload during a running operation and confirm it returns as paused and recoverable. Verify keyboard access to every job and batch action and confirm meaningful announcements with a screen reader.

## Known limitations

Work cannot continue after the browser environment fully closes. Local source files must be selected again after a full restart because browsers do not permit durable serialization of `File` objects. Runtime Blob artifacts still need to be downloaded before closing the browser.
