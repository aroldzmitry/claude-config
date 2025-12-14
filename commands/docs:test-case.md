---
description: Generate test cases from user flow and checklist documents. Outputs markdown file with TC-IDs, steps, test data, and coverage report.
allowed-tools: Read, Write, Bash
argument-hint: <flow-file> <checklist-file> [test-data-catalog] [env-profile]
model: sonnet
---

# docs:test-case

Generate test cases from user flow document + checklist with traceability and coverage validation.

## Terminology

Observable — user-visible UI behavior (no backend operations, no API details).
E2E (End-to-End) — test covering full user journey from entry to exit.
Integration — test verifying backend/API interaction without UI.
Contract — test validating API request/response structure.
Bi-directional Traceability — every requirement has test, every test links to requirement.

## Instructions

Parse command args as: `user-flow-file-path checklist-file-path [test-data-catalog-path] [environment-profile-path]`

### Input Requirements

User Flow MUST contain: System Context, Goals, User Types, Happy Path, Alternative Paths, Negative Scenarios, Component Mapping.
Checklist MUST contain: CL-IDs, Severity ([CRITICAL]/[IMPORTANT]/[OPTIONAL]), Expected Result, Source (flow section reference).

### Step 0: Pre-Validation (Blocking)

Check files exist and are readable. If not → output error "File not found: <path>" and exit.

Read flow and checklist, verify:

**Flow Structure Valid**
- All required sections present (System Context, Goals, Happy Path, Alternative Paths, Negative Scenarios, Component Mapping)
- Goals are verb-based
- Happy Path contains ONLY observable statements (user actions, visible responses)

**Checklist Structure Valid**
- Every item has CL-ID format (CL-###)
- Every item has severity tag
- Every item has Source column (traceability to flow section)
- Expected Results are user-observable (no backend ops, no API codes)

If validation fails → output violations list → stop → ask user to fix files.

If all pass → derive FLOWCODE from flow file name (e.g., `user-registration.md` → `REG`) → proceed to Step 1.

### Step 1: Extract Flow Data

Read user-flow file and extract: Goals, User types, Preconditions, Happy Path, Alternative paths, Negative scenarios, Success criteria, Infrastructure Behaviors (standard references), Component mapping, Boundaries.

### Step 2: Extract Checklist Data

Read checklist file and extract: Item ID (CL-###), Severity, Expected result, Source section.

### Step 3: Build Requirement Map & Section Mapping

Link each checklist item to flow section by matching Source reference.

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

### Step 4: Decide Test Cases

Use coverage strategy from Section Mapping Table (Step 3).
- One Happy Path E2E for core CRITICAL items
- One E2E per CRITICAL Alternative that changes outcome
- One E2E per CRITICAL error type (domain-specific)
- Integration/Contract tests for Infrastructure Behaviors (standard refs)
- IMPORTANT items: cover if risky or historically flaky
- OPTIONAL: skip unless user requests

### Step 5: Define Test Data

If test-data-catalog provided → use IDs (e.g., TD-EMAIL-VALID-UNIQUE).
If not → create inline Test Data section with reusable IDs.
- Use unique emails for create flows
- Use seeded records for duplicate scenarios
- Specify cleanup strategy (API deletion, database reset, etc.)

### Step 6: Write Test Cases

Each test case format:
- TC ID: TC-<FLOWCODE>-###
- Fields: Title, Priority (P0=CRITICAL, P1=IMPORTANT, P2=OPTIONAL), Type (E2E/Component/Integration/Contract), Preconditions, Test Data, Cleanup, Covers (checklist IDs)
- Steps: Action / Expected (no combined steps). Expected must be UI-observable (URL, visible text, element state, error panel).

Example:
```
TC-REG-001: Register happy path
Priority: P0
Type: E2E
Preconditions: User not authenticated, /registration reachable
Test Data: Name=TD-NAME-ASCII, Email=TD-EMAIL-VALID-UNIQUE
Cleanup: Delete created user via API
Covers: CL-001, CL-002, CL-006, CL-011

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

### Step 7: Pre-Output Validation (Mandatory, Blocking)

Output validation checklist BEFORE creating test file. If violations → fix → re-run → confirm pass → proceed.

**6 Validation Checks:**

1. **Observable-Only Enforcement** — Every Expected Result is user-visible (no backend ops, API status codes, database states)
2. **Bi-directional Traceability** — Every CRITICAL checklist item covered by ≥1 test; every test links to ≥1 CL-ID via Covers field
3. **Test Type Accuracy** — E2E tests have UI steps only; Integration/Contract tests for backend/API validation
4. **Coverage Completeness** — Happy Path has P0 test; every CRITICAL Alternative/Error has test
5. **Test Data References** — All test data uses TD-IDs (not literal strings); cleanup strategy specified
6. **Priority Alignment** — P0 tests cover CRITICAL items; P1 covers IMPORTANT; P2 covers OPTIONAL

If violations → fix → re-run all 6 → confirm pass → proceed.

### Step 8: Output Test Cases File

Create single markdown file at `docs/testCases/<area>/[user-flow-file-name].md`:
- Metadata block (Flow name, source files, generated date)
- Test Data section
- Test Cases section (grouped by priority or type)
- Coverage Report section (gaps, orphans, backend items)
- Out of scope reminders

### Step 9: Stage for Git

After creating file, run:
```bash
git add docs/testCases/<area>/[user-flow-file-name].md
```

### Step 10: Report

Output:
```
Test Cases: docs/testCases/<area>/[flow-name].md
Generated: X test cases (Y P0, Z P1, W P2)
Coverage: N% of CRITICAL checklist items
Validation: All 6 checks passed
Gaps: [list if any]
```

## Dialogs (Compact Format with Defaults)

Use `AskUserQuestion` ONLY if test cases become unexecutable without answer. Use defaults:

- Target Environment → staging
- Error Forcing → mark steps "requires test hook" (manual setup needed)
- Error Contract → presence only (not exact text match)
- Auth Preconditions → test hook (automated login helper)
- Test Data Strategy → inline Test Data section with TD-IDs

Do NOT ask: Test priorities (use Section Mapping), test types (use flow section), coverage targets (CRITICAL items mandatory).

## Rules

- Extract ONLY from flow/checklist — never invent requirements
- Every test case: executable, UI-observable Expected Results, links to CL-IDs via Covers field
- NO backend assertions in E2E tests (API status, database states) — use Integration/Contract type
- Use test data IDs (TD-*), not literal strings; specify cleanup strategy
- Keep test count lean (few high-value cases, not one per checklist item)
- Bi-directional traceability: every CRITICAL item covered, every test traces to requirement
- Pre-Output Validation MANDATORY — 6 checks must pass before creating file
- Section Mapping Table determines test type/priority
- Target: 1 Happy Path E2E, 1 E2E per CRITICAL alternative/error, Integration/Contract for infra refs
- Output single markdown file to `docs/testCases/<area>/[user-flow-file-name].md`
