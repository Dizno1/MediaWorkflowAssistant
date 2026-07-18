# Phase 33 Notes — Assistant-First Experience (First Increment)

This phase implements the core of the approved "Assistant-First Experience"
direction: automatic/invisible project creation, a unified "Add content"
experience, an editable request combo box, and a primary-path-first reading
order. It does not implement every item in the direction document — see
"Deferred" below and the corresponding README section.

## The most important correction

Sprint 8 added a hard requirement that an active project must exist before
any workflow could start, blocking and asking the user to create or select
one. The project owner explicitly rejected this as contrary to the
approved design: projects are an internal detail, not something the user
should have to think about before getting started.

This is now reversed. `js/app.js`'s `ensureWorkItem()` replaces the old
`ensureActiveProject()`:

- Old behavior: if no project was active, stop, show a message, move focus
  to the project-name field, and refuse to proceed.
- New behavior: if no project is active, silently create one (named from
  the source file/URL) and continue. No dialog, no required name entry, no
  interruption.

`ensureWorkItem()` is called as soon as content is successfully inspected
(in both the file and URL paths), not only when a workflow starts, so
history and artifacts have somewhere to attach from the moment content is
added — matching the acceptance test ("Add a video. Do not create a
project. The assistant should automatically prepare the work.").

## Add content

The previous "Start with a file" panel and a separate URL sub-form are now
one "Add content" section with shared help text ("Choose a file or enter a
web address. Only one is needed."). The URL field's `required` attribute
was removed — it was never actually required, since a file is an equally
valid alternative, and the two were never meant to both be mandatory.
Submitting the URL form with nothing entered now shows "Choose a file or
enter a web address." (the exact wording specified) instead of relying on
native browser validation for a field that isn't genuinely required.

Selecting a file already cleared stale URL validation text, and vice versa
via `handleUrl`'s existing reset logic; both directions were verified by
reading the code, not changed further.

## The editable request combo box

Implemented as `<input type="text" list="direct-goal-suggestions">` plus a
`<datalist id="direct-goal-suggestions">`, populated per content type by a
new `suggestionsFor(mediaType)` function in `js/app.js`.

This is a deliberate implementation choice: native `<datalist>` is an
editable combo box by definition (any text can be typed; the list is
suggestions, not a restriction), and is well-supported by JAWS and NVDA.
A custom ARIA `role="combobox"` widget was considered and rejected for this
increment — those are powerful but are also one of the more failure-prone
ARIA patterns across screen readers, and the native element does everything
the direction document actually asks for (editable, pre-filled, suggests
without restricting) without that risk.

**Suggestions only include requests `matchDirectGoal()` already recognizes.**
The direction document's example suggestion lists include some requests the
application cannot act on yet (for example, "Identify speakers," "Make the
video smaller," any PDF-related request). Offering a suggestion that
silently fails to match when chosen would be a worse experience than a
shorter, honest list. `suggestionsFor()` was written by checking
`matchDirectGoal()`'s actual regular expressions, not by copying the
direction document's example lists verbatim.

## Reading order

The direction document asks that unfinished work, add content, the
request, start, progress, review, and results come before technical and
advanced sections, in actual reading order, not just visual layout.

The 23 top-level `<section>` elements in `index.html` were reordered
programmatically (Python script extracting and splicing whole
`<section>...</section>` blocks by line range, rather than manual
cut-and-paste, to avoid transcription errors in a 600+ line file) into:

1. Project workspace ("Your work" / resume)
2. Add content
3. Current file/source details
4. Viewer
5. What would you like me to do? (the request combo box)
6. Goal cards (secondary, manual selection)
7. Workflow chain (Make This Accessible orchestration)
8. Progress
9. Transcript review
10. Image description review
11. Caption review
12. Audio description review
13. Package review
14. Results
15. Local quality-analysis panels (assessment, recommendations, plan,
    knowledge, advanced analysis)
16. Accessibility Advisor
17. Publication pipeline
18. Assistance/provider settings (including Shared Services import)
19. Jobs, batches, and project history

No section's internal markup, IDs, or JavaScript wiring were changed —
only their position in the document. Verified by: section tag count
unchanged (23 before and after), an order-independent diff between the
original and reordered file showing no content difference beyond blank
lines, and confirming every element ID referenced from `js/app.js` still
exists in the file afterward.

## Deferred to a future increment

In the order given in the direction document:

- **Restoration/reconnection** of pending review state and next
  recommended action when returning to previous work.
- **Long-form/chunked processing** — the 50 MB limit, audio chunking,
  resumable chunk processing, and provider-limit-aware handling of large
  media are all unchanged.
- **Time reporting** — elapsed time, estimated remaining time, and
  learning from historical processing rates. Progress is still
  percentage-only.
- **Walk-away behavior** — wake lock, completion/review notifications,
  grouped review across stages.
- **Remaining required-field cleanup** — `publication-title` and a few
  other fields are still marked `required` in their own forms. Unlike the
  URL field, these aren't mutually-exclusive alternatives to something
  else, so removing `required` without a good automatic default would just
  trade one bad experience for another; this needs its own pass.

Each of these is independently substantial and was left for a dedicated
future phase rather than attempted partially alongside the changes above.

## Testing performed

- `node --check` on every JavaScript file in the repository (all pass).
- Structural verification of the HTML reorder as described above.
- Manual inspection confirming `ensureWorkItem()` cannot throw for a
  missing project (it always creates one), unlike the old blocking gate.
- Live testing was **not** performed — this environment has no network
  access and no real provider credentials or Shared Services files, and no
  browser to exercise the combo box or reordered page directly.
