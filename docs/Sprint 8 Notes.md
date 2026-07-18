# Sprint 8 Notes — Confirmed Production Bugs from Real Testing

Real testing (a 2 minute 36 second video, "Make this video accessible")
surfaced several confirmed bugs. This sprint fixes the ones that are bounded
and verifiable by inspection. It does **not** attempt the full Phase 33
"Assistant-First Experience" redesign — see **Scope note** at the end.

## What was fixed

- **A Perplexity key was imported and used as an OpenAI key.** The importer
  searched `openai.json` for any property literally named `key`/`apiKey`
  anywhere in the file, with no check that the value actually looked like an
  OpenAI credential. If `openai.json` contains other providers' settings (as
  in the real case — a `pplx-...` key was present), the importer could pick
  up the wrong one. `js/shared-services.js` now classifies a candidate key by
  its own format (`sk-` → OpenAI, `sk-ant-` → Anthropic, `pplx-` →
  Perplexity, `AIza` → Gemini) and refuses to assign a key that is positively
  identified as a different provider's format. Instead of silently importing
  nothing, the import result now says specifically which file had the wrong
  provider's key, for example: "OpenAI (openai.json appears to contain a
  Perplexity key, not an OpenAI key; it was not imported)." The same check
  now also applies to `gemini.key`.
- **Provider error text could still leak part of a credential.** Every
  built-in and Shared Services provider adapter (OpenAI, Gemini, Azure
  Speech, Azure Vision, Azure OpenAI, Anthropic) previously threw the
  provider's own response text directly in some code paths — this is the
  exact mechanism that exposed the masked `pplx-...` fragment, since
  OpenAI's own 401 response body echoes back a masked copy of the rejected
  key. Every one of these paths now throws only a sanitized, categorized
  message ("Authentication failed.", "Network unavailable.", "Configuration
  incomplete.", "Unsupported model.", "Invalid endpoint.", or a generic
  HTTP-status message) built entirely from the response status, never from
  response body text.
- **A failed provider could still be auto-selected.** Automatic provider
  selection previously only deprioritized a provider with recently-failed
  health; it could still be chosen (and fail again) if it scored highest.
  Automatic selection now excludes any provider whose most recent real test
  or real usage attempt failed. If every compatible provider has failed
  health, none are silently retried; the person sees "no available method"
  rather than a repeat failure. A provider is only re-included once it is
  re-tested successfully (or the credential is replaced and saved, which
  clears its recorded health). Manual/explicit provider selection is
  unaffected, so a person can still deliberately retry a specific provider.
- **No accessibility workflow could start without an active project.** Both
  central workflow-start functions (`startWorkflowChain`, `runIntent`) now
  check for an active project first. If none is active, the workflow does
  not start; focus moves to the existing project-name field with a status
  message explaining what to do, using the controls that already exist on
  the page rather than a new dialog.
- **Cancelling one review checkpoint discarded the entire remaining
  accessibility plan.** The transcript, caption, audio-description, and
  package review "Cancel" buttons were all wired to the same full-chain
  cancellation as the dedicated "Cancel this workflow" button. They now back
  out of only that one step and leave the chain in a paused, resumable
  state; choosing the goal again picks up where the person left off, since
  nothing was saved for the step they backed out of. The dedicated "Cancel
  this workflow" button's full-cancel behavior is unchanged.
- **The progress region stayed visible and stale after a job finished,
  failed, or was cancelled.** It reported 100% (or a cancelled/failed job's
  last state) indefinitely while later sections — including whatever review
  step came next — were in focus, which is exactly what the real JAWS
  session showed. The progress region is now hidden as soon as a job
  finishes, fails, or is cancelled; a newly started job shows it again on
  its own.
- **Automatic AI-assisted drafting was not actually reached automatically.**
  This was already fixed in an earlier, undelivered pass and is included
  here: entering transcript review now automatically requests an AI draft
  (with the existing privacy/cost confirmation) when a compatible provider
  is available, instead of requiring a separate manual "Draft with AI"
  click first. This is what makes automatic provider selection and Azure
  Speech fallback actually reachable from "Make this video accessible" and
  "Transcribe this audio," not just from a button buried in the review
  panel.

## What was intentionally not done this sprint (Scope note)

The uploaded Phase 33 direction document describes a full redesign of the
opening experience: a single "Add content" section, an editable
natural-language combo box as the primary control, invisible/automatic
project creation, chunked long-form processing for large media, walk-away
processing with wake-lock and notifications, a restructured reading order,
and a results-first completion screen.

That is a legitimate direction, but it is a different scale of work than a
corrective sprint — it touches nearly every screen in the application. It
was not attempted here for two reasons: doing it well requires decisions
（exact combo-box behavior, exactly what "invisible" project creation looks
like in the existing project-workspace data model, how much of the current
provider/publication/advisor UI moves versus is removed) that deserve their
own scoped pass rather than being rushed alongside bug fixes, and attempting
both at once risked shipping either half-done.

This sprint instead fixed every concretely-reported, verifiable bug from
the real test session: the credential-misassignment bug, the credential-leak
bug, the auto-selection-of-a-known-bad-provider bug, the missing
project-enforcement gate, the cancel-discards-everything bug, and the stale
progress region. These were chosen because each is a specific, confirmed
defect with a bounded fix, not a design decision that needs to be made on
someone else's behalf.

**Recommended next steps, in order:**
1. Confirm these fixes resolve the specific issues from the real test
   session (requires live testing with real credentials, which this
   environment cannot do).
2. Revoke/replace the exposed Perplexity key, as recommended in the test
   review — the masked fragment was shown in a UI a screen reader read
   aloud, so treat it as potentially compromised regardless of how little
   was visible.
3. Scope the Phase 33 redesign as its own dedicated phase, likely broken
   into the sub-parts already implied by the direction document (Add
   content unification; the request combo box; invisible project creation;
   long-form/chunked processing; walk-away behavior; reading-order
   restructuring), since each is independently substantial.

## Files modified

- `js/shared-services.js` — key-format classification and rejection,
  sanitized Azure Speech/Vision errors, provider health tracking used by
  automatic selection.
- `js/openai-provider.js`, `js/gemini-provider.js`,
  `js/azure-openai-provider.js`, `js/anthropic-provider.js` — sanitized
  error paths, network-failure handling, health tracking (OpenAI/Gemini).
- `js/ai-provider-layer.js` — health-aware automatic selection (hard
  exclusion of failed providers), shared `plainLanguageError()` sanitizer,
  `getAlternative()`.
- `js/app.js` — project-enforcement gate, pause-not-cancel for per-step
  review cancellation, progress-region hiding on completion/failure/
  cancellation, automatic transcript-draft request on entering review,
  accessible error messages that name a concrete next step.

## Testing performed

- `node --check` on every JavaScript file in the repository (all pass).
- Manual inspection confirming no provider adapter throws raw response body
  text anywhere in the repository (grepped for the pattern that caused the
  original leak).
- Manual inspection confirming the key-format classifier rejects a
  `pplx-...`-shaped value found while importing `openai.json`.
- Manual inspection of the four review-cancel handlers confirming each now
  preserves `activeWorkflowChain` (pause) instead of nulling it (cancel).
- Live testing was **not** performed — this environment has no network
  access and no real provider credentials or Shared Services files. All of
  the above was verified by reading and syntax-checking the code, not by
  running the application.
