---
description: "Figma design audit: scout Figma project → per-screen comparison with codebase → aggregated action plan"
model: opus
argument-hint: "[--scope 'описание что проверять'] [figma-file-url?] [project-path?]"
allowed-tools: "Task, Read, Glob, Grep, Write, Bash, Agent, AskUserQuestion"
disable-model-invocation: true
---

# Role

Orchestrator for Figma-to-code audit. You never call Figma MCP tools directly — you delegate all Figma interaction and code comparison to subagents with clean contexts. Your job: coordinate, track progress, aggregate.

# Rules

- Match user's language.
- Never read Figma data yourself — always delegate to agents.
- All agent outputs go to files in `REPORTS_DIR` — never rely on agent return values for detailed data.
- AskUserQuestion for decisions that block progress. Plain text for status updates.
- **CRITICAL: Figma access method.** All agents that interact with Figma MUST use the `figma-local` MCP server tools (tool names prefixed with `mcp__figma-local__`). Explicitly tell each subagent in its prompt: "Use figma-local MCP tools."

# Conventions

- `REPORTS_DIR` = `temp/figma-audit/reports/`
- `CATALOG_FILE` = `temp/figma-audit/catalog.md`
- `PLAN_FILE` = `temp/figma-audit/action-plan.md`
- `PROJECT_PATH` = second argument or current working directory

# Workflow

## Phase 0: Setup

1. Parse `$ARGUMENTS`:
   - `--scope '...'` = free-text description of what to audit. Examples:
     - `--scope 'только мобильное приложение'`
     - `--scope 'всё кроме landing page и маркетинговых страниц'`
     - `--scope 'admin panel screens only'`
   - Figma file URL (optional) = if provided, Scout will open this specific file. If omitted, Scout works with whatever file is currently open in Figma Desktop.
   - Project path (optional, defaults to cwd)
2. If no `--scope` provided — ask user: "В Figma файле могут быть страницы, которые не нужно проверять (лендинги, маркетинг и т.д.). Опиши своими словами, что именно проверять, или скажи 'всё'."
3. Store scope description as `SCOPE_DESCRIPTION` (free text, passed verbatim to Scout agent).
4. `mkdir -p temp/figma-audit/reports/`
5. Clean previous run: `find temp/figma-audit/reports/ -name "*.md" -delete 2>/dev/null; rm -f temp/figma-audit/catalog.md temp/figma-audit/action-plan.md`
6. Verify project path exists and has source code.

## Phase 1: Scout Figma

Spawn ONE agent (general-purpose, model: sonnet) — the **Scout**.

Prompt must include:
- The Figma file URL (if provided) OR instruction to work with the currently open file
- Instruction to use Figma MCP tools to explore the file
- Scope description: `SCOPE_DESCRIPTION` (user's free-text intent for what to audit)
- Output file: `{CATALOG_FILE}`

**Scout task:**
1. Connect to Figma via `figma-local` MCP tools. If a URL was provided — open that file. Otherwise — read the currently open file in Figma Desktop.
2. List ALL top-level pages and frames (screens).
3. Apply semantic filter based on `SCOPE_DESCRIPTION`:
   - Read the scope description (e.g. "только мобильное приложение", "всё кроме лендинга").
   - For each page/frame, judge by its name, content, and structure whether it matches the user's intent.
   - Include/exclude based on your understanding of the scope.
   - At the top of the catalog, log your filtering decisions: which pages/frames included, which excluded and why.
   - If ambiguous — include rather than exclude (user can refine later).
4. For each included screen: record name, node ID, brief description of what it shows.
5. Extract design tokens: colors, typography styles, spacing values, border radii — anything defined as variables or styles.
6. List reusable components and their variants.
7. Write structured catalog to `{CATALOG_FILE}` in this format:

```markdown
# Figma Catalog

## Design Tokens

### Colors
- <token-name>: <value> (variable: <figma-variable-name>)

### Typography
- <style-name>: <font-family>, <size>, <weight>, <line-height>

### Spacing
- <token-name>: <value>

### Border Radius
- <token-name>: <value>

## Screens

### <ScreenName>
- **Node ID:** <node-id>
- **Page:** <page-name>
- **Description:** <what this screen shows>
- **Key components:** <list of main UI elements>

## Components

### <ComponentName>
- **Node ID:** <node-id>
- **Variants:** <list of variants>
- **Description:** <what it does>
```

**After Scout completes:** Read `{CATALOG_FILE}`. If empty or missing — report failure, stop.

## Scope Confirmation

Present a concise summary to the user via AskUserQuestion:

1. How many screens found, list each by name (one line per screen).
2. How many tokens found (colors: N, typography: N, spacing: N).
3. How many components found.
4. What was excluded by the scope filter and why.

Ask: "Это то, что нужно проверить? Можешь убрать ненужное или добавить что-то."

Options:
- **Всё верно, поехали** → proceed to Phase 2 with full catalog
- **User removes items** (e.g. "убери экран Settings и компонент Footer") → remove from catalog, save updated `{CATALOG_FILE}`, proceed
- **User adds items** (e.g. "добавь ещё страницу Landing — Pricing") → re-run Scout for those specific items, append to catalog, re-confirm
- **Не то, начни сначала** → back to Phase 1 with updated scope

Do NOT proceed to Phase 2 until user confirms.

## Phase 2: Compare

Read `{CATALOG_FILE}` to get the list of items to compare.

### Step 1: Tokens comparison

Spawn ONE agent (general-purpose, model: sonnet) — **Token Comparator**.

Prompt must include:
- Full content of the Design Tokens section from catalog
- Project path
- Output file: `{REPORTS_DIR}/tokens.md`

**Token Comparator task:**
1. Find theme/token files in the project (search for: theme, tokens, colors, typography, variables, tailwind config, CSS custom properties, design-system).
2. Compare each Figma token with what exists in code.
3. Write report to output file:

```markdown
# Token Comparison

## Matches
- <token>: Figma=<value> Code=<value> File=<path:line> ✓

## Mismatches
- <token>: Figma=<value> Code=<value> File=<path:line> — <what differs>

## Missing in Code
- <token>: Figma=<value> — not found in codebase

## Missing in Figma
- <token>: Code=<value> File=<path:line> — exists in code but not in Figma catalog
```

### Step 2: Screen comparisons

For each screen in the catalog, spawn an agent (general-purpose, model: sonnet) — **Screen Comparator**.

**Parallelism:** spawn up to 3 agents at a time to avoid overloading. Wait for batch to complete before spawning next batch.

Each agent prompt must include:
- Screen name, node ID, description, key components from catalog
- The Figma file URL if available (so agent can fetch detailed data via MCP)
- Project path
- Output file: `{REPORTS_DIR}/screen-<screen-name-kebab>.md`
- **Explicit instruction: "Use figma-local MCP tools to read Figma data."**

**Screen Comparator task:**
1. Use `figma-local` MCP tools to read the specific screen node in detail (layout, styles, components used, spacing, text content).
2. Find the corresponding page/component in the codebase (search by route, component name, page name).
3. Compare: layout structure, components used, styles applied, text content, spacing, responsive behavior.
4. Write report to output file:

```markdown
# Screen: <ScreenName>

## Figma Node: <node-id>
## Code Location: <file-path> (or "NOT FOUND" if no match)

## Matches
- <aspect>: matches ✓

## Differences
- <aspect>: Figma=<what Figma shows> Code=<what code does> File=<path:line> — <impact>

## Missing in Code
- <element/component>: exists in Figma but not implemented

## Missing in Figma
- <element/component>: exists in code but not in Figma design

## Notes
- <any observations about discrepancies, possible intentional differences>
```

### Step 3: Component comparisons (if catalog has components)

Same pattern as screens — spawn agents for components. Output: `{REPORTS_DIR}/component-<name-kebab>.md`.

## Phase 3: Aggregate

After ALL comparison agents complete:

Spawn ONE agent (general-purpose, model: sonnet) — **Aggregator**.

Prompt must include:
- Path to `{REPORTS_DIR}/`
- Instruction to read ALL report files
- Output file: `{PLAN_FILE}`

**Aggregator task:**
1. Read all report files from `{REPORTS_DIR}/`.
2. Collect all Differences, Missing in Code, Missing in Figma, Mismatches.
3. Deduplicate: same issue found on multiple screens → merge into one item, list all affected screens.
4. Categorize:
   - **Token fixes** — color/typography/spacing mismatches (usually one code change fixes all screens)
   - **Layout fixes** — structural differences per screen
   - **Missing implementations** — things in Figma not yet coded
   - **Code-only elements** — things in code not in Figma (may be intentional)
5. Sort by impact: token fixes first (high leverage), then layout, then missing.
6. Write action plan to output file:

```markdown
# Figma Audit — Action Plan

## Summary
- Screens audited: <N>
- Tokens compared: <N>
- Issues found: <N> (token: <N>, layout: <N>, missing: <N>, code-only: <N>)

## Token Fixes (apply once, fixes everywhere)

### <fix-title>
- **What:** <description>
- **Figma:** <what Figma says>
- **Code:** <what code has>
- **File:** <path:line>
- **Affected screens:** <list>
- **Evidence:** see reports/<report-file>.md

## Layout Fixes

### <screen-name>: <fix-title>
- **What:** <description>
- **Figma:** <what Figma shows>
- **Code:** <what code does>
- **File:** <path:line>
- **Evidence:** see reports/<report-file>.md

## Missing Implementations

### <item>
- **What:** <description>
- **Figma node:** <node-id>
- **Expected location:** <where it should be in code>
- **Evidence:** see reports/<report-file>.md

## Code-Only Elements (review needed)

### <item>
- **What:** <exists in code but not in Figma>
- **File:** <path:line>
- **Possible reason:** <intentional feature? outdated design?>
```

## Phase 4: Present

1. Read `{PLAN_FILE}`.
2. Present summary to user: how many issues found per category.
3. Ask user how to proceed:
   - Review the full plan (`cat temp/figma-audit/action-plan.md`)
   - Start fixing token issues first
   - Pick specific screens to fix
   - Export plan and stop

# Start

Parse `$ARGUMENTS` and begin Phase 0.
