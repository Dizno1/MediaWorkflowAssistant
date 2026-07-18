# Phase 32 First-Time Experience and Shared Services Discovery

## Status

Completed.

## Purpose

Phase 32 removes the need to browse directly to the SharedServices folder or manually understand provider files. The user selects the parent Open Door Design Apps folder once. The application discovers SharedServices, imports recognized provider settings, remembers the granted folder handle in the current browser profile, and verifies configured connections.

## Setup flow

The primary setup action is **Find my Open Door Design applications**. The folder picker explains that the user should select the Apps folder, such as `C:\Users\dino6\Apps`. The application then:

1. Looks for a direct `SharedServices` child folder.
2. If SharedServices is unavailable, looks for known application data folders in `ODD-AD-Author` and `ODD-SR-Doc-Remediator`.
3. Reads only recognized provider configuration files.
4. Imports OpenAI, Gemini, Azure Speech, and Azure Vision configuration into the existing encrypted browser credential store.
5. Stores the approved directory handle in IndexedDB so the user can reconnect without navigating through the folder tree again.
6. Runs connection checks and announces plain-language results.

The browser still requires an explicit user gesture before a folder can be selected or permission can be restored. No web application can silently search the Windows file system.

## Accessibility

- The setup is contained under a clear level-three heading.
- Status changes use an atomic polite live region.
- The primary action is a standard keyboard-accessible button.
- Technical controls are placed in a collapsed disclosure.
- Focus is not moved after import or connection testing.
- The status summary states the number and names of configured services.
- No icon is the sole source of meaning.

## Security and privacy

- Original provider files are never modified.
- Keys are not written to project files, exports, or Git.
- Imported credentials remain encrypted in the browser profile through the existing secure credential store.
- The saved directory handle grants access only to the folder explicitly selected by the user.
- Provider requests still require the existing privacy and possible-cost confirmation before workflow execution.

## Files changed

- `js/shared-services.js`
- `js/shared-services-ui.js`
- `index.html`
- `css/styles.css`
- `README.md`

## Known limitations

- Directory-handle persistence depends on Chromium File System Access and IndexedDB support.
- Chrome may require permission again after browser data is cleared or site permissions are revoked.
- The folder picker cannot be forced to begin at a specific Windows path.
- Local Ollama and Local Whisper remain optional external services and are not installed by the application.

## Next phase

Phase 33: Automated Playback Quality Assurance.
