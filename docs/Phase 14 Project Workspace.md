# Phase 14 Project Workspace

## Purpose

Phase 14 adds a persistent project layer above source-specific Shared Knowledge. A project can organize multiple related media sources without merging or weakening the separate knowledge record for each source.

## Project operations

Users can:

- Create a named project.
- Select the active project.
- Rename a project.
- Archive and restore a project.
- Delete the project record from the browser.

Deleting a project record does not delete source files or files already downloaded by the user.

## Automatic source membership

After a local file or web address is inspected, the source is added to the active project automatically. The workspace stores a source summary rather than the original media. The summary includes source type, media type, duration, completion state, artifact count, workflow count, and the date the source knowledge was last updated.

## Project history

When the Workflow Execution Engine completes work, the workspace records:

- Workflow and job identifiers.
- Workflow title and status.
- Originating source.
- Completion time.
- Created artifact names.

The source's Shared Knowledge remains the authoritative detailed record. Project history provides a project-wide view.

## Project status

The workspace calculates one of five states:

- Incomplete: the project has no sources or no completed accessibility work.
- In Progress: at least one source has an active workflow job.
- Review Required: accessibility work exists, but the complete deliverable set is not finished.
- Ready to Publish: every source has a reviewed transcript, captions, audio description, and an accessibility package.
- Archived: the user has intentionally removed the project from active production.

## Persistence and privacy

Project records are stored in browser local storage. Original local files, connected-provider credentials, object URLs, and media content are not persisted in the project record.

## Accessibility

The workspace uses native labels, text fields, select controls, buttons, headings, lists, a polite status region, visible keyboard focus, and responsive layouts. All core project operations are keyboard operable and exposed to assistive technology.
