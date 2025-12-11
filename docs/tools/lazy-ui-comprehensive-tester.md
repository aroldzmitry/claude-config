# lazy:ui-comprehensive-tester

Launch isolated Claude instance to run comprehensive UI testing on any project.

## Purpose

Orchestrates the `~/.claude/lazy/ui-comprehensive-tester` environment which has MCP servers (Playwright, Puppeteer, Mobile) for thorough UI testing.

## Usage

Invoke via Task tool with `subagent_type="lazy:ui-comprehensive-tester"` or mention the agent in conversation.

**Optional argument:** Specify project path to test (relative or absolute)
- With argument: `prompt="Test client package"` or `prompt="Test /abs/path/to/project"`
- Without argument: Agent infers from conversation context (e.g., package names mentioned)
- Fallback: Tests current working directory

## What It Tests

- Unit tests (yarn/npm)
- E2E tests (Playwright/Cypress)
- Storybook validation
- Accessibility audit (axe-core, WCAG compliance)
- Performance (Lighthouse/bundle)
- Usability and exploratory testing
- Cross-browser and device compatibility

## Testing Methodology

Agent uses professional QA techniques:
- **Equivalence partitioning** - Groups similar inputs, tests one per group
- **Boundary value analysis** - Tests min, max, just below/above limits
- **Decision tables** - Complex business logic with multiple conditions
- **State transitions** - Verifies UI state changes correctly
- **Exploratory testing** - Discovers unexpected behaviors
- **Test planning** - Verifies scope, environment, data, success criteria before execution

## Output

Returns structured report with:
- Test summary (total/passed/failed/duration)
- Component coverage
- Issues classified by severity (critical/major/minor/cosmetic with file:line)
- Accessibility violations (WCAG compliance)
- Performance metrics
- Quality metrics (test coverage %, defect density, pass/fail ratio)
- Screenshot paths
- Recommendations with test design techniques applied

## Examples

**Testing current directory:**
```
User: Run comprehensive UI tests on this project
Claude: [Invokes lazy:ui-comprehensive-tester]

Testing project: /Users/dmitry/WebstormProjects/zephyr-budget-app/client
Source: pwd
Status: Done
...
```

**Testing specific package:**
```
User: Test the server package
Claude: [Invokes lazy:ui-comprehensive-tester with prompt "Test server"]

Testing project: /Users/dmitry/WebstormProjects/zephyr-budget-app/server
Source: prompt
Status: Done
...
```

## Configuration

- **Timeout**: 10 minutes
- **Max turns**: 50
- **Model**: Sonnet
