Sprint 5 Part 1

Intent-First Interface

This sprint changes the visible application from a workflow and provider interface into a goal-driven assistant.

User-facing changes

- Removed Prepare for AI as a visible choice.
- Removed provider names and provider status from the interface.
- Removed workflow review language.
- Replaced Review workflow buttons with direct goal buttons.
- Changed Current media to Current file.
- Changed Progress to Working.
- Changed Artifacts to Files created.
- Changed technical result language to Your file is ready.
- Goals that cannot actually run are marked Not available yet and cannot create pretend results.
- The working browser action is now Save information about this file.
- The downloaded file is now named file-information.md instead of ai-package.md.

Internal changes

- Added intent-engine.js.
- The Intent Engine maps plain-language user goals to the existing internal workflows.
- The Job model now carries the selected intent.
- The Workflow Runner uses plain-language steps and status messages.
- Providers and internal workflow identifiers remain available to the engine but are hidden from users.

KISS rule

Users choose what they want to accomplish. The application chooses the technology.
