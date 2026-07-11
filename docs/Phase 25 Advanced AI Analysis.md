# Phase 25 - Advanced AI Analysis

## Status

Completed.

## Purpose

Phase 25 adds a unified accessibility quality-analysis layer after source inspection and throughout workflow execution. It evaluates completed work without forcing users to understand providers, scoring formulas, or processing order.

## Analysis areas

The subsystem reports six plainly labeled scores:

- Scene understanding
- Speaker recognition
- Caption quality
- Audio-description quality
- Visual accessibility
- Narration optimization

It also reports measurable indicators such as source duration, transcript word count, caption and audio-description cue counts, estimated words per minute, and cue density.

## Local analysis

`js/advanced-analysis.js` performs a private, no-additional-cost analysis from the current inspection and Shared Knowledge. It identifies missing outputs, unusually dense narration, likely caption segmentation problems, and elevated reading-rate risk. The local analysis runs automatically when a source is inspected and refreshes whenever a workflow completes.

## Deeper provider analysis

The Advanced accessibility analysis panel includes a Run deeper AI analysis button. When a configured provider supports the capability, the application presents the existing privacy and possible-cost confirmation before execution. The built-in OpenAI adapter supports this capability and returns structured scores and actionable findings. Image content may be included when the current source is an image. Other media analysis uses source and completed-work metadata in this browser implementation.

Provider output is normalized, displayed accessibly, and saved in Shared Knowledge as `analysis.advancedAccessibility`.

## Accessibility

- The analysis is exposed under a labeled heading.
- Scores use text, not color alone.
- Findings are an ordinary list.
- Metrics use a description list.
- Status changes use an atomic polite live region.
- The deeper-analysis control is a native button and is fully keyboard accessible.
- Scores explicitly state that human judgment is still required.

## Files added

- `js/advanced-analysis.js`
- `docs/Phase 25 Advanced AI Analysis.md`

## Files updated

- `index.html`
- `css/styles.css`
- `js/app.js`
- `js/openai-provider.js`
- `README.md`
