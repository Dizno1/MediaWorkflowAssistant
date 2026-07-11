# Phase 30 Provider Manager

Phase 30 completes the provider configuration workspace that Phase 29 introduced.

## Completed work

- Added direct configuration shortcuts for OpenAI, Azure OpenAI, Google Gemini, Anthropic, and local services.
- Added protected copy-and-paste key fields with explicit Show key controls.
- Added persistent configured, not configured, and last-tested status reporting.
- Added connection tests that do not start a media workflow.
- Added multiple named Azure OpenAI resource profiles with active-profile selection and removal.
- Added an Anthropic adapter for visual analysis, audio-description drafting, and advanced accessibility analysis.
- Added optional local Ollama and local Whisper endpoint configuration and detection.
- Kept automatic capability-based selection as the default. Normal workflow users do not choose providers.
- Continued encrypted credential storage in browser-profile IndexedDB. Credentials are excluded from project data, exports, ZIP packages, and Git.

## Provider behavior

The AI Provider Layer asks which available provider supports the required capability. Automatic selection scores capability quality, privacy, cost, and provider preference. Connected paid providers still require the existing privacy and possible-cost confirmation before source information leaves the browser.

Local Ollama and Whisper integrations require separately installed local services that permit requests from the application's browser origin. The application does not claim those services are installed until a connection test succeeds.

## Azure profile migration

Existing single-resource Phase 29 Azure settings are migrated automatically into a named Azure resource profile. No key, endpoint, or deployment value is intentionally discarded.

## Accessibility

- Provider groups use fieldsets and legends.
- Configuration shortcuts are keyboard-operable links.
- Every credential field has a programmatic label.
- Key visibility controls are labeled checkboxes.
- Configuration and test results use polite live status output.
- Focus is not moved unexpectedly after save or test operations.
- Provider status does not rely on icons or color.

## Known limitations

- Browser credential encryption protects keys from casual exposure and repository export, but it is not equivalent to an operating-system credential vault.
- Browser security, cross-origin restrictions, and provider policy may prevent direct API calls from some deployments.
- Local Ollama and Whisper services must be installed, started, and configured separately.
- Anthropic direct browser access depends on the account and browser-access policy supported by Anthropic.
