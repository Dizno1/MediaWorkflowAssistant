# Phase 16 - Provider Guidance, Cost Awareness, and Secure Configuration

Phase 16 keeps technical provider selection behind the application's plain-language workflow.

## Automatic selection

The AI Provider Layer now selects an available method for each capability. The ranking considers capability fit, whether processing stays in the browser, and the configured cost category. Automatic selection is the default. Provider-specific overrides remain available only in Advanced assistance settings.

## Cost and privacy disclosure

Every provider describes whether it is external and whether it may create a usage charge. Before an external or potentially metered service runs, the application presents a plain-language confirmation. Cancelling the confirmation sends no request.

Connected services can be marked as:

- May charge for use.
- Included in an existing account.
- No additional usage charge.
- Cost unknown.

## Secure configuration

Connected service settings are stored only in browser session storage. API keys are never written to repository files, exported packages, or persistent Shared Knowledge. The key input clears after configuration. A connection-test control verifies the configured endpoint without starting a workflow.

## Accessibility

The main interface announces the automatic-selection state in plain language. Technical controls are contained in a native details element. Provider choices use native radio buttons, connected-service fields use explicit labels, status messages use a polite live region, and confirmation uses the browser's keyboard-accessible native confirmation dialog.

## Next phase

Phase 17 will add human review and approval states so completed drafts can be assigned, reviewed, approved, rejected, and tracked without exposing workflow internals.
