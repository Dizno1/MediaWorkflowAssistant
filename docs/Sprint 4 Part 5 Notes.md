# Sprint 4 Part 5

This pass fixes the first end-to-end artifact workflow.

## Fixed

- Browser Provider now loads before Provider Manager.
- Provider Manager now stores a real Browser Provider instance.
- Workflow Runner now calls `ProviderManager.execute(job)` for ready providers.
- Prepare for AI now creates a real Markdown Blob artifact.
- Results now show a download button only when an artifact has a real downloadable URL.
- Download buttons are artifact-specific instead of a generic "Download first artifact" button.

## Test path

1. Choose a media file.
2. Select Prepare for AI.
3. Run workflow.
4. In Results, activate Download `<file-name>-ai-package.md`.
5. Confirm the Markdown file downloads.
6. Open the Markdown file and confirm it contains media details and suggested prompts.
