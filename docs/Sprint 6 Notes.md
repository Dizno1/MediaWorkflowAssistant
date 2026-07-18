# Sprint 6 Notes — Provider Integration Correction

This sprint corrects issues found during real testing of the Phase 31/32 Shared
Services import against live Open Door Design provider files, rather than
adding a new phase. Phase 33 (Automated Playback Quality Assurance) remains
the next planned phase.

## What real testing found

- OpenAI reported HTTP 401.
- Gemini reported that `models/gemini-1.5-flash` was not found for
  `generateContent`.
- Azure Vision reported `Failed to fetch` for every attempt.
- The Shared Services panel reported 4 imported services while the Provider
  Manager summary reported only 2 provider groups configured.
- The first-time setup announcement and the setup panel text hardcoded one
  person's Windows username and folder path.

## What was corrected

- **Provider count.** `js/provider-manager-ui.js` only counted OpenAI, Azure
  OpenAI, Gemini, Anthropic, and local services. It did not count Azure
  Speech or Azure Vision imported through Shared Services, which is why the
  two status areas disagreed. The summary now includes both, and refreshes
  on the `shared-services-updated` event.
- **OpenAI connection test.** `js/openai-provider.js` now reports
  "Authentication failed" for HTTP 401 specifically (including a note that a
  ChatGPT subscription is not API access), a rate-limit/quota message for
  429, and "Network request failed" when the request itself cannot reach
  OpenAI, instead of a bare HTTP status. A missing key is reported as
  "Configuration file did not contain a recognized API key."
- **Gemini model handling.** `js/gemini-provider.js` no longer assumes a
  single hardcoded model is valid forever. `resolveModel()` calls Gemini's
  `models` list endpoint, checks whether the configured model still supports
  `generateContent`, and falls back to a currently supported model
  (preferring `gemini-2.5-flash`) when it does not. This runs when a Gemini
  key is imported/saved, and again automatically if a live request reports
  "model not found," with the corrected model persisted afterward. Model
  discovery is best-effort: if it fails (for example, no network), the
  originally configured model is kept rather than blocking configuration.
- **Azure Vision connection test.** `js/shared-services.js` now distinguishes
  a malformed endpoint (not a well-formed `https://` address) from an
  authentication failure (401/403) from a network-level failure. Because
  Azure Vision's `Computer Vision`/`Image Analysis` REST endpoints do not
  reliably allow direct browser-to-Azure requests (no CORS headers on most
  resources), a network-level failure against what looks like a real Azure
  endpoint is now reported as a likely cross-origin restriction rather than
  a generic "Failed to fetch," with a note that a local helper or backend
  would be needed to work around it. See **Known limitation** below — this
  sprint does not add a backend, per the phase scope.
- **Azure Speech connection test.** Given the same network-failure vs.
  HTTP-status handling as Azure Vision, plus an explicit "Authentication
  failed" message for 401/403.
- **Removed hardcoded personal path.** `js/shared-services-ui.js` and
  `index.html` no longer hardcode a specific Windows username or folder
  path in user-facing text; the folder picker instructions are generic.

## Already correct, left unchanged

- Shared Services already parsed `openai.json` defensively (`findDeep`
  matches several reasonable property names rather than one exact shape),
  trimmed plain-text key/region/endpoint files, and never persisted the
  original files.
- Azure Speech was already registered with the AI Provider Layer as a
  `transcription-draft` capability provider and already participates in
  automatic provider selection and the real `Transcribe this audio`
  workflow path (via `js/app.js` → `js/workflow-runner.js` →
  `js/ai-provider-layer.js` → `js/shared-services.js`). No new orchestration
  layer was added.
- No credential is logged, exported, or included in project files or
  publication packages (verified by inspection — `secure-credential-store.js`
  and every provider adapter only pass keys in `Authorization` /
  `Ocp-Apim-Subscription-Key` headers of outgoing requests).

## Known limitation

`isAvailable()` on every provider adapter checks only whether a credential
is present, not whether it is valid. Automatic provider selection scores
OpenAI slightly above Azure Speech for `transcription-draft`, so if an
OpenAI key is present but invalid, automatic selection still tries OpenAI
first and fails, rather than falling back to Azure Speech within the same
run. Cross-provider retry-on-failure was judged out of scope for this
corrective sprint and is a candidate for a future phase.

Azure Vision's browser-direct reachability depends on the specific Azure
resource's CORS configuration, which this application cannot change. Where
a resource does not allow direct browser requests, Azure Vision will
continue to report a network-level failure until a local helper process or
backend is introduced — which is explicitly out of scope for this sprint.

## Testing performed

- `node --check` syntax validation on every modified JavaScript file.
- Manual code inspection to confirm every modified control still has an
  event handler and every modified script is still loaded from
  `index.html`.
- Manual inspection to confirm no API key appears in `console.*` calls,
  status text, project data, or publication packages.
- Live provider connection tests were **not** run as part of this sprint —
  this environment has no network access and no real provider credentials.
  The corrections above address the specific failure modes reported from
  real testing, but they have not been re-verified against live OpenAI,
  Gemini, or Azure endpoints. Re-run the existing in-app "Retest providers"
  action against real credentials to confirm.
