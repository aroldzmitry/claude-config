---
description: Generate test cases from user flow document. Outputs markdown file with TC-IDs, steps, test data, and coverage report.
allowed-tools: Read, Write, Bash
argument-hint: <flow-file> [test-data-catalog] [env-profile]
model: sonnet
---

# docs:test-case

Generate test cases from user flow document with traceability and coverage validation.

## Terminology

- **Observable** — user-visible UI behavior (no backend/API)
- **Flow-Based Traceability** — every flow section ↔ test (bidirectional link via Covers field)

## Instructions

Parse command args as: `user-flow-file-path [test-data-catalog-path] [environment-profile-path]`

- `environment-profile-path` — if provided, read to extract target environment name, base URLs, auth method for Preconditions

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

If all pass → derive FLOWCODE from flow file name (e.g., `user-registration.md` → `REG`) and AREA from flow file path (e.g., `docs/flows/auth/login.md` → `auth`) → proceed to Step 1.

### Step 1: Extract Flow Data & Build Section Map

Read user-flow file and extract: Goals, User types, Preconditions, Happy Path, Alternative paths, Negative scenarios, Success criteria, Infrastructure Behaviors (standard references), Component mapping, Boundaries.

**For each infrastructure standard reference (NET-001, SRV-001, etc.)**: Read standard file from `docs/standards/` to extract exact error messages, UI requirements, timing constraints.

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
- Cleanup strategy: use only if explicitly documented in flow or standards; otherwise state "Cleanup: See test infrastructure docs"

**Validation**: Verify Test Data IDs match their usage in test cases (e.g., TD-NAME-VALID used for Name field, not Email field).

### Step 4: Write Test Cases

Each test case format:
- TC ID: TC-<FLOWCODE>-###
- Fields: Title, Priority (P0/P1/P2), Type (E2E/E2E+Mock/Integration/Contract), Preconditions, Test Data, Cleanup, Covers (flow section references)
- Steps: Action / Expected / Source (no combined steps)
  - **Expected**: UI-observable only (URL, visible text, element state). Extract ONLY from flow or standard file—do NOT invent UI details (border colors, animations, exact wording unless quoted in source).
  - **Source**: Citation showing origin (e.g., "Flow line 29", "Standard NET-001 UI Requirements", "Field Validations#email")
- Covers field examples: "Happy Path Steps 1-5", "Alternative A1", "Negative Scenario N2"

**Test Types**:
- **E2E**: UI steps from flow only, no mocking
- **E2E+Mock**: UI steps with infrastructure mocking (network/server errors from standards)
- **Integration**: API-level tests, no UI steps
- **Contract**: API request/response validation

Example:
```
TC-REG-001: Register happy path
Priority: P0 | Type: E2E | Covers: Happy Path Steps 1-4
Preconditions: User not authenticated
Test Data: Name=TD-NAME-VALID, Email=TD-EMAIL-VALID-UNIQUE

1. Navigate /registration → Form displays | Flow:29
2. Enter name, email → Submit enabled | Flow:30-31
3. Click Register → Loading state, success message, redirect /login | Flow:32, Success:35-37
```

### Step 5: Pre-Output Validation (Mandatory, Blocking)

Output validation checklist BEFORE creating test file. If violations → fix → re-run → confirm pass → proceed.

**6 Validation Checks:**

1. **Observable-Only Enforcement** — Every Expected Result is user-visible (no backend ops, API status codes, database states). No UI implementation details unless quoted in source (e.g., no "border turns red" unless flow/standard states it).
2. **Flow-Based Traceability** — Every flow section covered by ≥1 test; every test links to flow sections via Covers field
3. **Test Type Accuracy** — E2E tests have UI steps only; E2E+Mock tests have UI steps with mocked infrastructure; Integration/Contract tests for backend/API validation with no UI steps
4. **Coverage Completeness** — Happy Path has P0 test; every Alternative/Error from flow has test
5. **Test Data References** — All test data uses TD-IDs (not literal strings); TD-ID names match usage (TD-NAME-* for name fields, TD-EMAIL-* for email fields)
6. **Source Citation** — Every Expected Result has Source field citing exact document location (flow line number, standard section, field validation reference)

If violations → fix → re-run all 6 → confirm pass → proceed.

### Step 6: Output Test Cases File

Create single markdown file at `docs/testCases/<area>/[user-flow-file-name].md`:
- Metadata block (Flow name, source flow file, generated date)
- Test Data section
- Test Cases section (grouped by priority or type)
- Coverage Report section (flow section coverage, gaps, backend items)
- Out of scope reminders

### Step 7: Format and Stage for Git

Format with Prettier, then stage: `npx prettier --write docs/testCases/<area>/[user-flow-file-name].md && git add docs/testCases/<area>/[user-flow-file-name].md`

### Step 8: Report

Output:
```
Test Cases: docs/testCases/<area>/[flow-name].md
Generated: X test cases (Y P0, Z P1, W P2)
Coverage: X flow sections tested
Validation: All 6 checks passed
Gaps: [list if any]
Standards read: [list standard files consulted]
```

## Dialogs (Compact Format with Defaults)

Use `AskUserQuestion` ONLY if test cases become unexecutable without answer. Use defaults:

- Target Environment → staging
- Error Forcing → mark steps "requires test hook" (manual setup needed)
- Error Contract → presence only (not exact text match)
- Auth Preconditions → test hook (automated login helper)
- Test Data Strategy → inline Test Data section with TD-IDs

Do NOT ask: Test priorities (use Section Mapping), test types (use flow section), coverage targets (flow sections mandatory).

## Final Checklist

Before output, verify all pass:
- [ ] All Expected Results are observable (no backend/API/DB)
- [ ] All Expected Results have Source citation
- [ ] Every flow section has ≥1 test (Covers field)
- [ ] TD-IDs used (no literal strings), names match fields
- [ ] Test types correct (E2E=UI only, Integration=API only)
- [ ] 6 validation checks from Step 5 passed
