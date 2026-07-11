# Phase 7 Accessibility Package

Phase 7 adds the production Accessibility Package workflow.

The workflow collects Shared Knowledge, workflow history, completed accessibility work, remaining gaps, recommended follow-up actions, and all generated files whose browser-session data remains available. It creates a portable ZIP containing `manifest.md`, `manifest.json`, and an optional `files` directory.

The package is registered by the Output Manager and recorded in Shared Knowledge. A package remains complete until another workflow creates newer work. At that point the Recommendation Engine makes the package available again so the user can build an updated bundle.

The package builder runs locally without a third-party library or network connection. The original source file is not included automatically.
