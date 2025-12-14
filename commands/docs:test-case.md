---
description: Generate test cases from user flow document. Outputs markdown file with TC-IDs, steps, test data, and coverage report.
allowed-tools: Read, Write, Bash
argument-hint: <flow-file> [test-data-catalog] [env-profile]
model: sonnet
---

# docs:test-case

Generate test cases from user flow document with traceability and coverage validation.

## Terminology

Observable — user-visible UI behavior (no backend operations, no API details).
E2E (End-to-End) — test covering full user journey from entry to exit.
Integration — test verifying backend/API interaction without UI.
Contract — test validating API request/response structure.
Flow-Based Traceability — every flow section has test, every test links to flow sections.

## Instructions

Parse command args as: `user-flow-file-path [test-data-catalog-path] [environment-profile-path]`

### Input Requirements

User Flow MUST contain: System Context, Goals, User Types, Happy Path, Alternative Paths, Negative Scenarios, Component Mapping.

### Step 0: Pre-Validation (Blocking)

Check flow file exists and readable. If not → output error "File not found: <path>" and exit.

Read flow, verify:

**Flow Structure Valid**
- All required sections present (System Context, Goals, Happy Path, Alternative Paths, Negative Scenarios, Component Mapping)
- Goals are verb-based
- Happy Path contains ONLY observable statements (user actions, visible responses)

If validation fails → output violations list → stop → ask user to fix flow.

If all pass → derive FLOWCODE from flow file name (e.g., `user-registration.md` → `REG`) → proceed to Step 1.

### Step 1: Extract Flow Data & Build Section Map

Read user-flow file and extract: Goals, User types, Preconditions, Happy Path, Alternative paths, Negative scenarios, Success criteria, Infrastructure Behaviors (standard references), Component mapping, Boundaries.

Map flow sections to test requirements using Section Mapping Table below.

**Section Mapping Table:**

| Flow Section | Test Type | Priority Guidance | Coverage Strategy |
|---|---|---|---|
| Happy Path | E2E | P0 (CRITICAL) | One comprehensive test covering core flow |
| Alternative Paths | E2E | P0-P1 | One test per CRITICAL alternative that changes outcome |
| Negative Scenarios (domain) | E2E | P0-P1 | One test per CRITICAL error type |
| Negative Scenarios (infra refs) | Integration/Contract | P2 | Backend validation, not UI |
| Component Mapping (UI states) | E2E | P0-P1 | Verify idle/loading/success/error states |
| Success Criteria | E2E | P0 | Include in Happy Path test |
| UX Validation | E2E | P1-P2 | Accessibility checks if IMPORTANT |

For Infrastructure Behaviors (standard refs like "Standard NET-001"): create Integration/Contract tests, NOT E2E.

### Step 2: Decide Test Cases

Use coverage strategy from Section Mapping Table.
- One Happy Path E2E (P0)
- One E2E per Alternative that changes outcome (P0-P1 based on criticality)
- One E2E per domain-specific error type (P0-P1)
- Integration/Contract tests for Infrastructure Behaviors (standard refs) (P2)

### Step 3: Define Test Data

If test-data-catalog provided → use IDs (e.g., TD-EMAIL-VALID-UNIQUE).
If not → create inline Test Data section with reusable IDs.
- Use unique emails for create flows
- Use seeded records for duplicate scenarios
- Specify cleanup strategy (API deletion, database reset, etc.)

### Step 4: Write Test Cases

Each test case format:
- TC ID: TC-<FLOWCODE>-###
- Fields: Title, Priority (P0/P1/P2), Type (E2E/Integration/Contract), Preconditions, Test Data, Cleanup, Covers (flow section references)
- Steps: Action / Expected (no combined steps). Expected must be UI-observable (URL, visible text, element state, error panel).
- Covers field examples: "Happy Path Steps 1-5", "Alternative A1", "Negative Scenario N2"

Example:
```
TC-REG-001: Register happy path
Priority: P0
Type: E2E
Preconditions: User not authenticated, /registration reachable
Test Data: Name=TD-NAME-ASCII, Email=TD-EMAIL-VALID-UNIQUE
Cleanup: Delete created user via API
Covers: Happy Path Steps 1-5

Steps:
1. Navigate to /registration
   Expected: Registration form visible, Register button disabled
2. Fill Full Name with TD-NAME-ASCII
   Expected: Field shows value
3. Fill Email with TD-EMAIL-VALID-UNIQUE
   Expected: Email valid indicator shown, Register enabled
4. Click Register
   Expected: Loading shown, form disabled
5. Wait for success and redirect
   Expected: Success message shown, URL is /login
```

### Step 5: Pre-Output Validation (Mandatory, Blocking)

Output validation checklist BEFORE creating test file. If violations → fix → re-run → confirm pass → proceed.

**5 Validation Checks:**

1. **Observable-Only Enforcement** — Every Expected Result is user-visible (no backend ops, API status codes, database states)
2. **Flow-Based Traceability** — Every flow section covered by ≥1 test; every test links to flow sections via Covers field
3. **Test Type Accuracy** — E2E tests have UI steps only; Integration/Contract tests for backend/API validation
4. **Coverage Completeness** — Happy Path has P0 test; every Alternative/Error from flow has test
5. **Test Data References** — All test data uses TD-IDs (not literal strings); cleanup strategy specified

If violations → fix → re-run all 5 → confirm pass → proceed.

### Step 6: Output Test Cases File

Create single markdown file at `docs/testCases/<area>/[user-flow-file-name].md`:
- Metadata block (Flow name, source flow file, generated date)
- Test Data section
- Test Cases section (grouped by priority or type)
- Coverage Report section (flow section coverage, gaps, backend items)
- Out of scope reminders

### Step 7: Stage for Git

After creating file, run:
```bash
git add docs/testCases/<area>/[user-flow-file-name].md
```

### Step 8: Report

Output:
```
Test Cases: docs/testCases/<area>/[flow-name].md
Generated: X test cases (Y P0, Z P1, W P2)
Coverage: X flow sections tested
Validation: All 5 checks passed
Gaps: [list if any]
```

## Dialogs (Compact Format with Defaults)

Use `AskUserQuestion` ONLY if test cases become unexecutable without answer. Use defaults:

- Target Environment → staging
- Error Forcing → mark steps "requires test hook" (manual setup needed)
- Error Contract → presence only (not exact text match)
- Auth Preconditions → test hook (automated login helper)
- Test Data Strategy → inline Test Data section with TD-IDs

Do NOT ask: Test priorities (use Section Mapping), test types (use flow section), coverage targets (flow sections mandatory).

## Rules

- Extract ONLY from flow — never invent requirements
- Every test case: executable, UI-observable Expected Results, links to flow sections via Covers field
- NO backend assertions in E2E tests (API status, database states) — use Integration/Contract type
- Use test data IDs (TD-*), not literal strings; specify cleanup strategy
- Keep test count lean (few high-value cases covering all flow sections)
- Flow-based traceability: every flow section covered, every test traces to flow sections
- Pre-Output Validation MANDATORY — 5 checks must pass before creating file
- Section Mapping Table determines test type/priority
- Target: 1 Happy Path E2E, 1 E2E per CRITICAL alternative/error, Integration/Contract for infra refs
- Output single markdown file to `docs/testCases/<area>/[user-flow-file-name].md`
