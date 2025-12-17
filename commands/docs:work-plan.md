---
description: Generate implementation plan from user flow by analyzing codebase status
argument-hint: [user-flow-file-path]
---

# Work Plan Generator

Converts user flow documents into developer implementation instructions by analyzing codebase patterns and matching requirements to code.

## Input

User must provide path to user flow markdown file via `$ARGUMENTS`.

User flow must contain: Happy Path, Preconditions, Alternative Paths, Negative Scenarios, Success Criteria, Links to standards.

## Output

### Console Summary (Always)

```
Requirements: N total (UI: X | API: Y | State: Z | Test IDs: T | Domain: W | Infrastructure: V)
Status: Implemented: A | Partial: B | Missing: C | Conflicts: D
Impact: M files modified | P packages added
Test Coverage: E2E tests found: N | Test IDs defined: M | Missing in code: K
```

If all requirements implemented (Missing + Partial + Conflicts = 0):
- Print "✅ All requirements implemented. No work needed."
- Skip file creation
- Exit

### Implementation Instruction File (Only When Work Needed)

File: `./docs/workPlans/{flow-name}-implementation-plan.md`

**Created only when:** Missing > 0 OR Partial > 0 OR Conflicts > 0

**Format:** Actionable TODO steps only. No status reports, no "already implemented" sections.

**Sections:**

1. **Implementation Instructions** — Step-by-step actions for Missing/Partial/Conflict requirements only, grouped by layer (UI → State → API → Domain → Infrastructure)
   - Each instruction: Action | File path | What to change | Contract/component to use | Closes REQ-IDs
   - If refactoring needed: What to refactor | Why | Expected result
   - Omit all Implemented requirements

2. **Dependency Changes** — Packages/configs to add
   - Package name | Purpose | Where used | Installation command
   - Hide section if empty

3. **Pattern Conflicts** — Requirements conflicting with current patterns
   - What conflicts | Current pattern | Proposed resolution | Risk
   - Hide section if empty

4. **Related Documentation** — Links to user flow and standards

## Process

### Phase 1: Parse & Decompose

**Step 1.1: Parse Flow into Structure**
Extract: roles, preconditions, main steps, alternatives, error scenarios, non-functional requirements, standard references.
Build flow model with requirement IDs.

**Step 1.2: Parse Test Artifacts for Test ID Requirements**
Find test case file: `docs/testCases/{flow-dir}/{flow-name}.md`
Find checklist file: `docs/checkLists/{flow-dir}/{flow-name}.md`
Find E2E test files: `tests/e2e/{flow-dir}/*.spec.ts` matching flow name
Read `tests/testIds.ts` for centralized test ID definitions

Extract from test cases:
- Expected UI elements mentioned in steps (buttons, inputs, notifications, spinners)
- data-testid values referenced in test assertions

Extract from checklists:
- Critical/Important items requiring UI verification (CL-XXX items with [CRITICAL] or [IMPORTANT])
- UI elements mentioned in "Expected Result" column

Extract from E2E tests:
- All `data-testid="..."` locators used in test assertions
- Elements expected to be visible/enabled/disabled during flow

Extract from testIds.ts:
- Defined test IDs for the flow domain (e.g., `testIds.auth.registration.*`)

Result: Test ID requirement list (TESTID → Element → Purpose → Test Coverage)

**Step 1.3: Decompose into Atomic Requirements by Layer**
For each flow element, extract atomic requirements per layer:
- UI: components, forms, modals, notifications, loading states, error displays
- Test IDs: data-testid attributes on interactive/verifiable elements for E2E coverage
- Routing: routes, navigation, redirects, guards
- State: local state, global state, cache, form state
- API Contracts: endpoints, request/response shapes, error codes
- Domain Logic: business rules, validations, transformations
- Error Handling: try/catch, error boundaries, fallbacks
- Permissions: access control, role checks, feature flags
- i18n: text keys, translations, locale handling
- Telemetry: events, metrics, traces (if specified in flow)

Result: Requirement matrix (REQ-ID → Layer → What needed)

### Phase 2: Analyze & Match (Delegated to Plan Subagent)

Use Task tool with `subagent_type="Plan"` to delegate phases 2-3 planning work.

**Plan Agent Prompt:**
- Input: Requirement matrix from Phase 1, user flow file path, test artifacts
- Task: Analyze codebase patterns, match requirements to code, generate implementation decisions
- Output: Pattern catalog, requirement status map, implementation decisions, file/module change plan, refactoring plan, dependency plan

**Plan Agent Instructions:**
Scan `.claude/proj_index/00-INDEX.md` for architecture. Scan code for patterns: module structure, routes, DI, API client, repositories, state management, forms, modals, notifications, error handling, i18n, styling.

Match each requirement to code status: Exists (fully implemented), Partial (incomplete/non-standard), Missing (not implemented), Conflicts (contradicts pattern).

For test IDs: grep codebase for testIds.ts values, check data-testid usage in components, mark Missing if defined but unused, Partial if wrong element/conditional, Exists if correct.

Select optimal implementation: prefer existing patterns, minimal architecture changes, module reuse, UX consistency.

Generate file/module change plan: file path, changes (add/modify/remove/move), contracts (API shape, props), state (local/global, shape), UI components, test IDs (element, testIds.ts value, conditional logic), verification.

Generate refactoring plan if needed: what to refactor, why (pattern mismatch, conflict, tech debt), expected result.

Generate dependency plan if needed: package name, purpose, where used, installation command.

### Phase 3: Plan & Output

**Step 3.5: Print Console Summary**
Show requirement count by layer, status distribution, impact metrics (files/packages).

**Step 3.6: Decide File Creation**
If Missing + Partial + Conflicts = 0:
- Print "✅ All requirements implemented. No work needed."
- Skip file creation
- Exit (do not git add)

**Step 3.7: Write Implementation Instruction File (Conditional)**
Only if Missing + Partial + Conflicts > 0:
- Output instructions for Missing/Partial/Conflict requirements only, grouped by layer (UI first → Infrastructure last)
- Each instruction: 1-2 lines, actionable, with file path and REQ-ID reference
- Omit all sections describing already Implemented requirements
- Hide empty sections (Dependency Changes, Pattern Conflicts)
- Format created file: `npx prettier --write {file-path}`
- Git add formatted file

## Rules

**DO:**
- Extract requirements from flow + linked standards + test cases + checklists
- Parse test artifacts (test cases, checklists, E2E tests, testIds.ts) to identify test ID requirements
- Detect missing test IDs even when functionality exists
- Use existing project patterns (scan before inventing)
- Output instructions only (no explanations, no test plans)
- Group instructions by layer for logical execution order
- Include test ID requirements with element location and test coverage info
- Hide sections with no content
- Git add created plan files

**DON'T:**
- Write code or patches
- Invent requirements not in flow
- Guess when uncertain — ask or mark as "Needs Verification"
- Output reports or analysis — only instructions
- Create file when everything implemented — console summary only
- Include "already implemented" sections in plan file

## Starting Workflow

1. Get user flow file path from `$ARGUMENTS` (required)
2. Execute Phase 1: Parse & Decompose (Steps 1.1-1.3, including test artifact parsing)
3. Delegate Phase 2-3 Planning: Use Task tool with `subagent_type="Plan"`, provide requirement matrix and instructions from Phase 2 section
4. Parse Plan agent output: Extract pattern catalog, requirement status map, implementation decisions, change plans
5. Execute Phase 3: Plan & Output (Steps 3.5-3.7, using Plan agent results for console summary and file generation)
6. If file created: git add plan file
