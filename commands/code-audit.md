---
description: "Code consistency & Figma audit: scan codebase → cross-page consistency check → per-screen Figma comparison → aggregated action plan"
model: opus
argument-hint: "[--scope 'описание что проверять'] [figma-file-url?] [project-path?]"
allowed-tools: "Task, Read, Glob, Grep, Write, Bash, Agent, AskUserQuestion"
disable-model-invocation: true
---

# Role

Orchestrator for code consistency and code-to-Figma audit. You never call Figma MCP tools directly — you delegate all Figma interaction and code comparison to subagents with clean contexts. Your job: coordinate, track progress, aggregate.

**Primary goal: consistency.** Every page in the project — whether it has a Figma design or not — must use the same components, tokens, and patterns as every other page. This audit detects:
- Copy-pasted UI instead of shared components
- Same component used with different styles/spacing on different pages
- Inline overrides that break visual consistency
- Hardcoded values instead of design tokens
- Pages without Figma designs that still need to be consistent with the rest

**Secondary goal: Figma fidelity.** For pages that DO have Figma designs, verify they match.

# Rules

- Match user's language.
- Never read Figma data yourself — always delegate to agents.
- All agent outputs go to files in `REPORTS_DIR` — never rely on agent return values for detailed data.
- AskUserQuestion for decisions that block progress. Plain text for status updates.
- **CRITICAL: Figma access method.** All agents that interact with Figma MUST use the `figma-local` MCP server tools (tool names prefixed with `mcp__figma-local__`). Explicitly tell each subagent in its prompt: "Use figma-local MCP tools."

# Conventions

- `REPORTS_DIR` = `temp/code-audit/reports/`
- `CATALOG_FILE` = `temp/code-audit/catalog.md`
- `PLAN_FILE` = `temp/code-audit/action-plan.md`
- `PROJECT_PATH` = second argument or current working directory

# Workflow

## Phase 0: Setup

1. Parse `$ARGUMENTS`:
   - `--scope '...'` = free-text description of what to audit. Examples:
     - `--scope 'только мобильное приложение'`
     - `--scope 'всё кроме admin panel'`
     - `--scope 'only public-facing pages'`
   - Figma file URL (optional) = if provided, agents will open this specific file. If omitted, agents work with whatever file is currently open in Figma Desktop.
   - Project path (optional, defaults to cwd)
2. If no `--scope` provided — ask user: "В кодовой базе могут быть страницы, которые не нужно проверять (admin, dev-tools, storybook и т.д.). Опиши своими словами, что именно проверять, или скажи 'всё'."
3. Store scope description as `SCOPE_DESCRIPTION` (free text, passed verbatim to Scout agent).
4. `mkdir -p temp/code-audit/reports/`
5. Clean previous run: `find temp/code-audit/reports/ -name "*.md" -delete 2>/dev/null; rm -f temp/code-audit/catalog.md temp/code-audit/action-plan.md`
6. Verify project path exists and has source code.

## Phase 1: Scout Codebase

Spawn ONE agent (general-purpose, model: sonnet) — the **Code Scout**.

Prompt must include:
- Project path
- Scope description: `SCOPE_DESCRIPTION`
- Output file: `{CATALOG_FILE}`

**Code Scout task:**
1. Explore the project to discover ALL pages, routes, and screens. Search strategies:
   - **Router files:** look for route definitions (React Router, Next.js pages/app directory, Vue Router, etc.)
   - **Page components:** search for files in `pages/`, `app/`, `views/`, `screens/` directories
   - **Navigation config:** find navigation menus, sidebars, tab bars to discover reachable screens
   - **Layout files:** find layout wrappers that indicate page boundaries
2. For each discovered page/screen, gather:
   - Route path (URL pattern)
   - Component file path(s)
   - Page title / display name (from meta, breadcrumbs, or heading)
   - **Detailed component usage:** for every UI component used on the page, record:
     - Component name and import path (shared component? local? third-party?)
     - Props passed to it
     - Any wrapper styles, className overrides, or inline styles applied
     - Container spacing/margins around it
   - Brief description of what the page does (from code context)
3. Also discover:
   - **Design tokens in code:** theme files, CSS variables, Tailwind config, design-system files — extract colors, typography, spacing, border-radius values.
   - **Shared UI components:** component library, reusable components (buttons, cards, modals, inputs, etc.) — names, file paths, and their props interface.
4. **Detect copy-paste patterns:**
   - Look for UI code that looks like a component but is inlined/duplicated instead of extracted (e.g., similar JSX blocks appearing in multiple page files).
   - Look for local components that duplicate the functionality of an existing shared component.
   - Record these as `Potential duplicates` in the catalog.
5. Apply semantic filter based on `SCOPE_DESCRIPTION`:
   - Read the scope description.
   - For each page/component, judge by its route, name, and content whether it matches the user's intent.
   - Include/exclude based on your understanding of the scope.
   - At the top of the catalog, log your filtering decisions: which pages included, which excluded and why.
   - If ambiguous — include rather than exclude.
6. Write structured catalog to `{CATALOG_FILE}` in this format:

```markdown
# Code Catalog

## Scope Filtering
- Included: <list of included items with reasons>
- Excluded: <list of excluded items with reasons>

## Design Tokens (from code)

### Colors
- <token-name>: <value> File=<path:line>

### Typography
- <style-name>: <font-family>, <size>, <weight>, <line-height> File=<path:line>

### Spacing
- <token-name>: <value> File=<path:line>

### Border Radius
- <token-name>: <value> File=<path:line>

## Pages / Screens

### <PageName>
- **Route:** <url-pattern>
- **Component:** <file-path>
- **Description:** <what this page does>
- **UI components used:**
  - `<ComponentName>` from `<import-path>` — props: `{...}`, wrapper styles: `<styles>` File=<path:line>
  - ...

## Shared Components

### <ComponentName>
- **File:** <file-path>
- **Props interface:** <list of props with types>
- **Used on:** <list of pages with usage details>
- **Description:** <what it does>

## Potential Duplicates

### <description of duplicated pattern>
- **Locations:** <file:line>, <file:line>, ...
- **What's duplicated:** <description>
- **Suggestion:** <extract to shared component / use existing component X>
```

**After Code Scout completes:** Read `{CATALOG_FILE}`. If empty or missing — report failure, stop.

## Scope Confirmation

Present a concise summary to the user via AskUserQuestion:

1. How many pages/screens found, list each by name and route (one line per page).
2. How many tokens found (colors: N, typography: N, spacing: N).
3. How many shared components found.
4. What was excluded by the scope filter and why.

Ask: "Это то, что нужно проверить? Можешь убрать ненужное или добавить что-то."

Options:
- **Всё верно, поехали** → proceed to Phase 2 with full catalog
- **User removes items** → remove from catalog, save updated `{CATALOG_FILE}`, proceed
- **User adds items** → re-run Code Scout for those specific items, append to catalog, re-confirm
- **Не то, начни сначала** → back to Phase 1 with updated scope

Do NOT proceed to Phase 2 until user confirms.

## Phase 2: Compare

Read `{CATALOG_FILE}` to get the list of items to compare.

### Step 1: Tokens comparison

Spawn ONE agent (general-purpose, model: sonnet) — **Token Comparator**.

Prompt must include:
- Full content of the Design Tokens section from catalog
- The Figma file URL (if provided) OR instruction to work with the currently open file
- Output file: `{REPORTS_DIR}/tokens.md`
- **Explicit instruction: "Use figma-local MCP tools to read Figma data."**

**Token Comparator task:**
1. If a Figma file URL was provided OR a file is currently open in Figma Desktop: use `figma-local` MCP tools to extract design tokens (colors, typography styles, spacing, border-radius — anything defined as variables or styles). If MCP returns error or no file is open: write a report with only the "No Figma Data" section and stop.
2. Compare each code token with what exists in Figma.
3. Write report to output file:

```markdown
# Token Comparison (Code → Figma)

## Matches
- <token>: Code=<value> Figma=<value> File=<path:line> ✓

## Mismatches
- <token>: Code=<value> Figma=<value> File=<path:line> — <what differs>

## Missing in Figma
- <token>: Code=<value> File=<path:line> — not found in Figma

## Missing in Code
- <token>: Figma=<value> — exists in Figma but not in codebase
```

### Step 2: Page/screen comparisons

For each page in the catalog, spawn an agent (general-purpose, model: sonnet) — **Page Comparator**.

**Parallelism:** spawn up to 3 agents at a time to avoid overloading. Wait for batch to complete before spawning next batch.

Each agent prompt must include:
- Page name, route, component file path, description, key UI elements from catalog
- The Figma file URL if available (so agent can search for matching designs via MCP)
- Project path
- Output file: `{REPORTS_DIR}/page-<page-name-kebab>.md`
- **Explicit instruction: "Use figma-local MCP tools to read Figma data."**

**Page Comparator task:**
1. Read the code for this page thoroughly — understand layout, components, styles, text content, responsive behavior.
2. Use `figma-local` MCP tools to search for a matching screen in Figma:
   - Search by page name, route keywords, screen title
   - Browse Figma pages/frames to find the best match
   - If NO matching Figma screen found — report as "No Figma design" and still document what the code page contains (so the aggregator can flag it)
3. If a match is found — compare: layout structure, components used, styles applied, text content, spacing, responsive behavior.
4. Write report to output file:

```markdown
# Page: <PageName>

## Code Location: <file-path>
## Route: <url-pattern>
## Figma Match: <node-id and screen name> (or "NO FIGMA DESIGN FOUND")

## Matches
- <aspect>: matches ✓

## Differences
- <aspect>: Code=<what code does> Figma=<what Figma shows> File=<path:line> — <impact>

## Missing in Figma
- <element/component>: exists in code but not in Figma design

## Missing in Code
- <element/component>: exists in Figma but not implemented

## No Figma Design
(Only if no matching Figma screen was found)
- **Page description:** <what this page does based on code>
- **Key elements:** <list of UI elements on the page>
- **Recommendation:** <should this page have a Figma design? why?>

## Notes
- <any observations about discrepancies, possible intentional differences>
```

### Step 3: Component comparisons (if catalog has shared components)

Same pattern as pages — spawn agents for components. Output: `{REPORTS_DIR}/component-<name-kebab>.md`.

Each agent searches for matching Figma component and compares. If no Figma counterpart — documents what the code component does.

### Step 4: Cross-page consistency analysis

Spawn ONE agent (general-purpose, model: sonnet) — **Consistency Auditor**.

This is the most important step of this audit. It catches issues that per-page and token comparisons cannot find.

Prompt must include:
- Full content of `{CATALOG_FILE}` (especially the component usage details per page and potential duplicates)
- Project path
- Output file: `{REPORTS_DIR}/consistency.md`

**Consistency Auditor task:**
1. **Component usage consistency:** For every shared component that appears on 2+ pages, compare HOW it's used:
   - Are the same props passed? If different — is the difference intentional (different content) or accidental (different styling)?
   - Are wrapper styles consistent? (e.g., same `<Input>` component but with `mb-4` on one page and `mb-6` on another)
   - Are className overrides consistent? Inline styles?
   - Are there pages using hardcoded values where other pages use the shared component's built-in props?
2. **Copy-paste detection:** For patterns flagged as "Potential Duplicates" in the catalog:
   - Read each location and confirm whether the code is truly duplicated.
   - If duplicated — describe what differs between copies (often small style/spacing differences that indicate drift).
   - Suggest which shared component to extract or reuse.
3. **Token usage consistency:** Across all pages:
   - Find places where hardcoded color/spacing/typography values are used instead of design tokens.
   - Find places where different tokens are used for the same visual purpose on different pages.
4. **Pattern consistency:** Look for structural patterns:
   - Page layouts: do all pages follow the same layout pattern? (header, content area, footer, padding)
   - Form patterns: are forms structured consistently? (label placement, error display, spacing between fields)
   - List/table patterns: are data displays consistent?
   - Empty states, loading states, error states: consistent patterns across pages?
5. Write report to output file:

```markdown
# Cross-Page Consistency Report

## Component Usage Inconsistencies

### <ComponentName>
- **Expected usage pattern:** <how most pages use it>
- **Inconsistent on:**
  - <PageName>: <what's different> File=<path:line>
  - <PageName>: <what's different> File=<path:line>
- **Impact:** <visual inconsistency description>
- **Fix:** <what to change to make consistent>

## Duplicated Code (should be shared components)

### <description>
- **Locations:**
  - <file:line> — <brief context>
  - <file:line> — <brief context>
- **Differences between copies:** <what varies>
- **Recommendation:** <extract to shared component / use existing <ComponentName>>

## Hardcoded Values (should use tokens)

### <page or component>
- <value> used at <file:line> — should be token `<token-name>` (<token-value>)

## Inconsistent Patterns

### <pattern-name> (e.g. "Form layout", "Page padding", "List spacing")
- **Standard pattern:** <how most pages do it>
- **Deviations:**
  - <PageName>: <what's different> File=<path:line>
- **Fix:** <what to change>

## Pages Without Figma Designs — Consistency Check

For each page that has no Figma design, report whether it follows the established patterns:
### <PageName>
- **Uses shared components:** ✓/✗ (list any local alternatives to shared components)
- **Follows layout pattern:** ✓/✗ (describe deviation)
- **Uses design tokens:** ✓/✗ (list hardcoded values)
- **Overall consistency:** <good / needs fixes / major issues>
- **Specific fixes needed:** <list>
```

## Phase 3: Aggregate

After ALL comparison agents complete:

Spawn ONE agent (general-purpose, model: sonnet) — **Aggregator**.

Prompt must include:
- Path to `{REPORTS_DIR}/`
- Instruction to read ALL report files
- Output file: `{PLAN_FILE}`

**Aggregator task:**
1. Read all report files from `{REPORTS_DIR}/`, including `consistency.md`.
2. Collect all issues: Differences, Missing in Code, Missing in Figma, No Figma Design, Mismatches, Component Inconsistencies, Duplicated Code, Hardcoded Values, Pattern Deviations.
3. Deduplicate: same issue found on multiple pages or in multiple reports → merge into one item, list all affected pages.
4. Categorize and sort by impact (highest leverage first):
   - **Consistency fixes** — component usage inconsistencies, duplicated code, hardcoded values (fixing these makes the whole project more uniform)
   - **Token fixes** — color/typography/spacing mismatches with Figma
   - **Layout fixes** — structural differences per page vs Figma
   - **Pages without designs** — pages with no Figma screen (with consistency assessment)
   - **Missing in Code / Missing in Figma** — gaps between code and designs
5. Write action plan to output file:

```markdown
# Code Audit — Action Plan

## Summary
- Pages audited: <N>
- Pages with Figma match: <N>
- Pages without Figma design: <N>
- Tokens compared: <N>
- Consistency issues: <N> (component inconsistencies: <N>, duplicated code: <N>, hardcoded values: <N>, pattern deviations: <N>)
- Figma issues: <N> (token: <N>, layout: <N>, missing-in-code: <N>)

## Consistency Fixes (highest priority — makes entire project uniform)

### Duplicated Code → Extract Shared Components

#### <description>
- **What:** <code duplicated instead of using shared component>
- **Locations:** <file:line>, <file:line>, ...
- **Differences between copies:** <what varies — often small spacing/style drift>
- **Fix:** <extract to shared component / use existing `<ComponentName>`>
- **Evidence:** see reports/consistency.md

### Component Usage Inconsistencies

#### <ComponentName>: <inconsistency description>
- **What:** <same component used differently across pages>
- **Standard usage:** <how most pages use it>
- **Deviations:**
  - <PageName>: <what's different> File=<path:line>
- **Fix:** <unify to standard usage>
- **Evidence:** see reports/consistency.md

### Hardcoded Values → Use Tokens

#### <description>
- **Locations:** <file:line>, <file:line>, ...
- **Value used:** <hardcoded value>
- **Should be:** token `<token-name>` (<token-value>)
- **Evidence:** see reports/consistency.md

### Pattern Deviations

#### <pattern-name>: <deviation description>
- **Standard pattern:** <how most pages do it>
- **Deviations:**
  - <PageName>: <what's different> File=<path:line>
- **Fix:** <align to standard pattern>
- **Evidence:** see reports/consistency.md

## Token Fixes (Figma mismatches — apply once, fixes everywhere)

### <fix-title>
- **What:** <description>
- **Code:** <what code has>
- **Figma:** <what Figma says>
- **File:** <path:line>
- **Affected pages:** <list>
- **Evidence:** see reports/<report-file>.md

## Layout Fixes (Figma mismatches per page)

### <page-name>: <fix-title>
- **What:** <description>
- **Code:** <what code does>
- **Figma:** <what Figma shows>
- **File:** <path:line>
- **Evidence:** see reports/<report-file>.md

## Pages Without Figma Designs

### <page-name>
- **Route:** <url-pattern>
- **File:** <file-path>
- **Description:** <what this page does>
- **Consistency status:** <does it follow project patterns? list specific deviations>
- **Uses shared components:** ✓/✗
- **Uses design tokens:** ✓/✗
- **Fixes needed for consistency:** <list, even without Figma design>
- **Evidence:** see reports/consistency.md, reports/page-<name>.md

## Missing in Code (exists in Figma, not in code)

### <item>
- **What:** <description>
- **Figma node:** <node-id>
- **Expected location:** <where it should be in code>
- **Evidence:** see reports/<report-file>.md

## Missing in Figma (exists in code, not in Figma)

### <item>
- **What:** <exists in code but not in Figma>
- **File:** <path:line>
- **Possible reason:** <intentional feature? needs design?>
```

## Phase 4: Present

1. Read `{PLAN_FILE}`.
2. Present summary to user: how many issues found per category, highlighting:
   - Consistency issues (component inconsistencies, duplicated code, hardcoded values) — these are the highest-value fixes
   - Pages without Figma designs and their consistency status
   - Figma mismatches
3. Ask user how to proceed:
   - Review the full plan (`cat temp/code-audit/action-plan.md`)
   - Start fixing consistency issues first (highest leverage)
   - Start fixing token issues
   - Pick specific pages to fix
   - Export plan and stop

# Start

Parse `$ARGUMENTS` and begin Phase 0.
