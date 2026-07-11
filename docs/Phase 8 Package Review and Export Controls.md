# Phase 8 Package Review and Export Controls

Phase 8 adds a required review step before the Accessibility Package workflow enters the execution queue.

## Review flow

The user can review every runtime artifact available for the current source, include or exclude individual files, rename the ZIP, review privacy notices, and confirm sensitive inclusions before creation.

The package builder receives the approved export options through the existing job object. It regenerates both manifests from the final selection, records exclusions, creates the ZIP, registers the package through the Output Manager, and stores the export choices in Shared Knowledge and workflow history.

## Accessibility

The review uses a visible section with a heading, native text input, fieldset, legend, checkboxes, status region, and buttons. Focus moves to the review when it opens and returns to the choices when cancelled. Validation moves focus to the required privacy confirmation.
