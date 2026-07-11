# Phase 26 Publication Pipeline

## Status

Phase 26 is complete.

## Purpose

The Publication Pipeline converts an active project and its approved accessibility work into a structured delivery package. It operates at the project level rather than requiring users to export each source separately.

## User workflow

1. Select an active project.
2. Choose an export profile.
3. Choose a delivery target.
4. Enter the publication title.
5. Validate publication readiness.
6. Resolve any blocking issues.
7. Create and download the publication package.

The application prevents final export when required accessibility work or human approval is incomplete.

## Export profiles

### Accessible web publication

Requires media-appropriate accessibility work and creates a package intended for a website administrator.

### Learning platform delivery

Uses the same accessibility requirements while adding learning-platform-oriented delivery instructions and records.

### Accessible archive master

Creates a preservation-oriented package containing source records, workflow history, approval records, available artifacts, and checksums.

## Delivery targets

- Download to this device
- Web hosting handoff
- Learning platform handoff
- Records archive

All package creation is local. Delivery targets change the manifest and instructions without transmitting the source or credentials.

## Readiness validation

Validation evaluates:

- Whether the project contains sources
- Media-appropriate required workflows
- Transcript completion for audio and video
- Caption and audio-description completion for video
- Image-description completion for images when recorded in project history
- Accessibility package completion
- Pending human reviews
- Rejected human reviews
- Availability of project workflow history

The result includes a score, blocking issues, warnings, and passed checks. Blocking issues prevent package creation.

## Package contents

The ZIP contains:

- `publication-manifest.json`
- `publication-validation.txt`
- `source-inventory.txt`
- `workflow-history.json`
- `human-review-records.json`
- `DELIVERY-INSTRUCTIONS.txt`
- `SHA256SUMS.txt`
- An `artifacts` directory containing files whose browser-session data is still available

The manifest also records the export profile, delivery target, source summaries, project metadata, validation result, workflow history, reviews, and runtime artifact inventory.

## Architecture

`js/publication-pipeline.js` owns profile definitions, delivery target definitions, validation, accessible rendering, ZIP assembly, checksum generation, and publication-history persistence.

The subsystem reuses:

- `ProjectWorkspace` for the active project and publication history
- `OutputManager` for runtime artifacts
- `ZipBuilder` for local ZIP creation
- Existing project history and review records

`OutputManager.listAll()` exposes only artifacts available in the current browser session. Persisted artifact metadata remains represented in project and workflow records even when the temporary binary is no longer available.

## Accessibility

The interface uses native labels, selects, text input, and buttons. Status changes use a polite live region. Validation output is a focusable section with a programmatic heading, plain-language score, and separate lists for blockers, warnings, and passed checks. Download links retain visible keyboard focus.

## Privacy and security

Packaging runs locally. API keys are never read or written by the Publication Pipeline. No source or project information is sent to a provider or delivery service.

## Limitations

Browser-session artifacts can be included only while their object URLs or text content remain available. Closing the tab removes those temporary binaries. The project manifest and history still identify completed work, but users should download important outputs before closing the session.

Direct authenticated publishing to a specific content management system requires a future delivery adapter with explicit credentials, destination confirmation, and platform-specific validation. Phase 26 provides complete validated handoff packages without exposing provider or publishing implementation details to normal users.

## Next phase

Phase 27 will add resumable jobs, batch processing, crash recovery, checkpointing, expanded project history, and background-processing support.
