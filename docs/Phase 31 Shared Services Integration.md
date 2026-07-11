# Phase 31 Shared Services Integration

## Status

Completed.

## Purpose

Phase 31 lets an existing Open Door Design user import provider settings from a SharedServices folder without opening and copying each credential file. New users can continue using the manual Provider Manager or local-only processing.

## Supported imports

The importer recognizes:

- `openai.json`
- `gemini.key`
- `providers.json`
- `azure_speech.key`
- `azure_speech.region`
- `azure_vision.key`
- `azure_vision.region`
- `azure_vision.endpoint`

The original files are read only after the user chooses the folder or files. They are never modified, moved, or included in projects and exports.

## Browser security boundary

A browser application cannot silently search `C:\Users\<name>\Apps\SharedServices` or any other local path. Phase 31 therefore uses the File System Access API when supported. The user activates **Choose SharedServices folder** and selects the folder once. A multiple-file picker is provided as a fallback.

## Credential storage

Imported credentials are copied into the existing encrypted IndexedDB credential store. OpenAI and Gemini settings use their existing provider records. Azure Speech and Azure Vision settings use a dedicated encrypted Shared Services record.

Credentials remain associated with the current browser profile and site origin. Clearing browser site data removes the imported copy but does not change the original SharedServices files.

## Provider capabilities

Phase 31 adds two adapters to the existing AI Provider Layer:

- Azure Speech provides `transcription-draft`.
- Azure Vision provides `visual-analysis` and `ocr` for image sources.

The adapters participate in automatic capability selection. External processing still requires the existing privacy and possible-cost confirmation.

## Shared Services API

`js/shared-services.js` exposes a provider-neutral facade:

- `ODDSharedServices.transcribe()`
- `ODDSharedServices.describeImage()`
- `ODDSharedServices.performOCR()`
- `ODDSharedServices.importFiles()`
- `ODDSharedServices.chooseDirectory()`

This is the initial reusable boundary for future Open Door Design applications.

## Accessibility

- Folder and file import are standard keyboard-operable controls.
- Import and test results use a polite live status region.
- Provider status is expressed in text, not color or icons alone.
- Focus is not moved unexpectedly after import or testing.
- Manual provider configuration remains available.

## Known limitations

- Local folder access always requires an explicit user action.
- Azure Speech short-audio REST processing may reject unsupported formats or long recordings. A future local helper or Azure batch-transcription adapter can expand format and duration support.
- Azure Vision currently accepts image sources. Scanned PDF page extraction and accessible PDF remediation remain future work.
- Provider connection tests require network access and may be affected by provider-side CORS policy.
