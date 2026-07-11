# Phase 28 Accessibility Advisor

## Status

Phase 28 is complete.

## Purpose

The Accessibility Advisor performs a project-level, consultant-style review after accessibility workflows and human approvals have been recorded. It converts the application's existing project evidence into a plain-language assessment of remaining risk, recommended improvements, strengths, category scores, and an overall accessibility-readiness score.

The Advisor does not claim formal legal conformance and does not replace testing by people with disabilities. It provides a final decision checkpoint before the Publication Pipeline can create a delivery package.

## Functional behavior

The Advisor reviews every source in the active project and evaluates the work appropriate to its media type:

- Video: transcript, captions, audio description, accessibility package, artifacts, and human review.
- Audio: transcript, accessibility package, artifacts, and human review.
- Images: image-description workflow evidence, accessibility package, artifacts, and human review.
- Other sources: accessibility package, artifacts, workflow traceability, and human review evidence.

It also evaluates project-wide workflow history and publication history.

Findings use four stable severity levels:

- Critical: prevents final acceptance and publication.
- Major: indicates meaningful accessibility risk that should be resolved.
- Minor: identifies incomplete evidence or delivery preparation.
- Advisory: low-risk professional guidance.

The overall score begins at 100 and applies documented deductions based on finding severity. Category scores are provided for content alternatives, captions and transcripts, audio description, human review, publication and delivery, and evidence and traceability.

## Final review and publication integration

A completed Advisor report is stored with the project. A reviewer can accept the report for publication only when no critical findings remain. The reviewer name is required and an optional decision note may be recorded.

The Publication Pipeline now verifies that:

- An Advisor report exists.
- The report still matches the current project evidence.
- No critical Advisor findings remain.
- A reviewer accepted the final Advisor report.

If any condition fails, publication validation presents a blocking reason. The publication package includes both JSON and plain-text Advisor reports.

## Persistence and staleness

Advisor reviews are stored inside the existing Project Workspace object under `accessibilityAdvisor`. No second storage system is introduced.

Each review contains a fingerprint of the source snapshots, workflow history, human reviews, and publication records used during evaluation. Changes to that evidence make the report stale. The interface clearly asks the user to run a new review rather than silently treating an older decision as current.

This is an additive schema change. Existing Phase 27 projects remain readable and receive Advisor data only after the feature is used.

## Accessibility

- The Advisor is fully keyboard operable.
- Results use headings, lists, definition lists, text severity labels, and native form controls.
- Severity is never communicated by color or shape alone.
- The completed report receives focus after review so screen-reader users begin at its heading.
- Status and decision updates use a polite live region.
- Focus is not moved during passive refreshes.
- Reviewer acceptance has explicit labels and instructions.
- The downloadable report is plain text.

## Files

New:

- `js/accessibility-advisor.js`
- `docs/Phase 28 Accessibility Advisor.md`

Modified:

- `index.html`
- `css/styles.css`
- `js/app.js`
- `js/publication-pipeline.js`
- `README.md`

## Testing

1. Start a local web server in the project directory.
2. Open the application and select or create a project.
3. Run the Accessibility Advisor with an incomplete project and confirm that findings and recommendations are announced and displayed.
4. Confirm that critical findings prevent final acceptance.
5. Complete required work and human approvals, rerun the Advisor, enter a reviewer name, and accept the report.
6. Change project evidence and confirm that the previous report becomes stale.
7. Run publication validation and confirm that a missing, stale, critical, or unaccepted Advisor report blocks publication.
8. Accept a current review and confirm that the Advisor report is included in the publication ZIP.
9. Operate all controls using only the keyboard and verify heading, list, status, score, and form announcements with a screen reader.

## Known limitations

The Advisor evaluates the evidence recorded in the browser application. It does not inspect every pixel, waveform, spoken word, or rendered delivery environment. Scores are decision support, not certification. Runtime artifacts that were not registered or that disappeared when the browser session ended cannot be directly examined by this phase.

## Next phase

Phase 29: Automated Playback Quality Assurance.
