# Sprint 7 Notes — Health-Aware Provider Selection

This sprint addresses the known limitation recorded at the end of Sprint 6:
automatic provider selection only checked whether a credential was *present*,
not whether it was actually working, so a saved-but-invalid OpenAI key could
keep winning automatic selection for `transcription-draft` ahead of a
genuinely working Azure Speech configuration.

This directly serves long-term-vision priority 2, "Transcribe this audio,"
which specifically calls for the application to "automatically select the
healthiest compatible provider."

## What changed

- **Every built-in and Shared Services provider now reports health.** OpenAI,
  Gemini, Azure Speech, and Azure Vision adapters expose an optional
  `health()` accessor returning `connected`, `failed`, or `unknown`, based on
  the most recent real connection test or real usage attempt — not just
  whether a key is saved.
- **Failures are now persisted, not just successes.** Previously, a failed
  "Test connection" attempt was reported to the user but never saved; only a
  success updated `lastTestStatus`. Both directions are now recorded, and a
  real (non-test) request that fails with an authentication error also
  updates health, so the system learns from actual workflow usage, not only
  from the explicit Test connection button.
- **Automatic selection scoring now penalizes a provider with `failed`
  health.** `js/ai-provider-layer.js` subtracts from a provider's score when
  its own most recent real test failed. A provider with `unknown` health
  (never tested, or credential missing) is unaffected — this only demotes a
  provider that has been *demonstrated* broken, so it does not penalize a
  provider nobody has tested yet.
- **Failed requests now name a concrete next step.** When a confirmed
  request to a specific provider fails, the status message now also names
  the next-best available alternative provider for that task (for example,
  "OpenAI service" failing on `transcription-draft` while Azure Speech is
  configured and healthy). The application does **not** silently switch
  providers mid-request and retry — the user already gave consent naming a
  specific provider in the confirmation dialog, and switching providers
  after that consent without a new confirmation would misrepresent what
  was agreed to. Instead, the user sees a clear message and can retry using
  the suggested alternative.

## What was intentionally not done

- No automatic cross-provider retry-after-failure inside a single request.
  This was considered and rejected: the existing confirmation dialog names
  the specific provider ("Continue with OpenAI service?") before any
  external request happens, and Azure Speech's own required disclosure
  ("state that the audio will be sent to Azure Speech... request
  confirmation") is provider-specific. Silently substituting a different
  external provider after that consent was given would not honor either
  disclosure. This is left as a genuine limitation rather than solved with
  a shortcut.
- No new orchestration or planning layer was added — the change lives
  entirely inside the existing AI Provider Layer's scoring function and the
  existing provider adapters.

## Files modified

- `js/ai-provider-layer.js` — health-aware scoring, `getAlternative()`,
  and error tagging with the attempted provider and capability.
- `js/openai-provider.js`, `js/gemini-provider.js` — `health()` accessors;
  persist failed test results in addition to successes; persist a failed
  status when a real (non-test) request is rejected for authentication.
- `js/shared-services.js` — `health()` accessors for Azure Speech and Azure
  Vision with the same persistence behavior.
- `js/app.js` — `describeAssistanceError()` names a concrete next step
  (the next available alternative provider) in the transcript, caption,
  audio-description, and image-description status messages on failure.

## Testing performed

- `node --check` on every JavaScript file in the repository (all pass).
- Manual inspection confirming `health()` is read defensively (wrapped in
  try/catch) everywhere it is called, so a provider that does not implement
  it, or throws, cannot break scoring for every other provider.
- Manual inspection confirming no credential appears in any new status
  message, error message, or persisted health record — only a status word
  (`connected`/`failed`/`unknown`) and a timestamp are stored.
- Live provider testing was **not** performed — this environment has no
  network access and no real provider credentials. The scoring and
  persistence logic has not been exercised against real OpenAI, Gemini, or
  Azure failures; only inspected and syntax-checked.

## Status against long-term-vision priorities

- **Priority 1, "Make this video accessible":** already wired end to end
  through the existing Phase 24 orchestration (`workflow-chain.js`); this
  sprint did not need to change it. Not re-verified live in this
  environment.
- **Priority 2, "Transcribe this audio":** automatic provider selection is
  now health-aware, addressing the specific gap named in Sprint 6. Not yet
  verified against real, live provider failures.
- **Priority 3, intelligent document accessibility:** not started. No PDF
  remediation code exists in this repository yet.

## Next planned phase

Phase 33 — Automated Playback Quality Assurance — remains the next roadmap
item, unless document-accessibility work (long-term-vision priority 3) is
prioritized ahead of it.
