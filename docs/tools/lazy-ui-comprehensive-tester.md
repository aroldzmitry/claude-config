# lazy:ui-comprehensive-tester

Launch isolated Claude instance to run comprehensive UI testing on any project.

## Purpose

Orchestrates the `~/.claude/lazy/ui-comprehensive-tester` environment which has MCP servers (Playwright, Puppeteer, Mobile) for thorough UI testing.

## Usage

Invoke via Task tool with `subagent_type="lazy:ui-comprehensive-tester"` or mention the agent in conversation.

## What It Tests

- Unit tests (yarn/npm)
- E2E tests (Playwright/Cypress)
- Storybook validation
- Accessibility audit (axe-core)
- Performance (Lighthouse/bundle)

## Output

Returns structured report with:
- Test summary (total/passed/failed/duration)
- Component coverage
- Issues (critical/warnings with file:line)
- Accessibility violations
- Performance metrics
- Screenshot paths
- Recommendations

## Example

```
User: Run comprehensive UI tests on this project
Claude: [Invokes lazy:ui-comprehensive-tester agent]

Status: Done

## Test Execution Summary
- Total: 127, Passed: 125, Failed: 2
- Duration: 3m 42s
...
```

## Configuration

- **Timeout**: 10 minutes
- **Max turns**: 50
- **Model**: Sonnet
