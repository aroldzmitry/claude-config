---
description: Generate test cases from user flow document. Outputs markdown file with TC-IDs, steps, and test data.
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

If all pass → derive FLOWCODE from flow file name (e.g., `user-registration` → `REG`) and FLOWNAME from flow file path (e.g., `docs/01-register/userFlows.md` → `01-register`) → proceed to Step 1.

### Step 1: Extract Flow Data & Build Section Map

Read user-flow file and extract: Goals, User types, Preconditions, Happy Path, Alternative paths, Negative scenarios, Success criteria, Infrastructure Behaviors (standard references), Component mapping, Boundaries.

**For each infrastructure standard reference (NET-001, SRV-001, etc.)**: Read standard file from `docs/standards/` to extract exact error messages, UI requirements, timing constraints.

Map flow sections to test requirements using Section Mapping Table below.

**Section Mapping Table:**

| Flow Section                    | Test Type            | Priority Guidance | Coverage Strategy                                      |
| ------------------------------- | -------------------- | ----------------- | ------------------------------------------------------ |
| Happy Path                      | E2E                  | P0 (CRITICAL)     | One comprehensive test covering core flow              |
| Alternative Paths               | E2E                  | P0-P1             | One test per CRITICAL alternative that changes outcome |
| Negative Scenarios (domain)     | E2E                  | P0-P1             | One test per CRITICAL error type                       |
| Negative Scenarios (infra refs) | Integration/Contract | P2                | Backend validation, not UI                             |
| Component Mapping (UI states)   | E2E                  | P0-P1             | Verify idle/loading/success/error states               |
| Success Criteria                | E2E                  | P0                | Include in Happy Path test                             |
| UX Validation                   | E2E                  | P1-P2             | Accessibility checks if IMPORTANT                      |

For Infrastructure Behaviors (standard refs like "Standard NET-001"): create Integration/Contract tests, NOT E2E.

### Step 2: Decide Test Cases

Use coverage strategy from Section Mapping Table: Happy Path E2E (P0), Alternatives E2E (P0-P1), domain errors E2E (P0-P1), Infrastructure Integration/Contract (P2)

### Step 3: Define Test Data

Use catalog IDs if provided, else create inline Test Data section. Unique emails for create, seeded for duplicates. Cleanup only if documented. Validate TD-IDs match field usage.

### Step 4: Write Test Cases

Each test case format:

- TC ID: TC-<FLOWCODE>-###
- Fields: Title, Priority (P0/P1/P2), Type (E2E/E2E+Mock/Integration/Contract), Preconditions, Test Data, Cleanup, Covers (flow section references)
- Steps: Action / Expected / Source (no combined steps)
  - **Expected**: UI-observable only (URL, visible text, element state). Extract ONLY from flow or standard file—do NOT invent UI details (border colors, animations, exact wording unless quoted in source).
  - **Source**: Citation showing origin (e.g., "Flow line 29", "Standard NET-001 UI Requirements", "Field Validations#email")
- Covers field examples: "Happy Path Steps 1-5", "Alternative A1", "Negative Scenario N2"

**Test Types**: E2E (UI only), E2E+Mock (UI+infra mocking), Integration (API only), Contract (API validation)

Example: TC-REG-001: P0 E2E covering Happy Path 1-4, steps with Action → Expected | Source citations

### Step 5: Pre-Output Validation (Mandatory, Blocking)

Output validation checklist BEFORE creating test file. If violations → fix → re-run → confirm pass → proceed.

**6 Validation Checks:**

1. **Observable-Only Enforcement** — Every Expected Result is user-visible (no backend ops, API status codes, database states). No UI implementation details unless quoted in source (e.g., no "border turns red" unless flow/standard states it).
2. **Flow-Based Traceability** — Every flow section covered by ≥1 test; every test links to flow sections via Covers field
3. **Test Type Accuracy** — E2E tests have UI steps only; E2E+Mock tests have UI steps with mocked infrastructure; Integration/Contract tests for backend/API validation with no UI steps
4. **Coverage Completeness** — Happy Path has P0 test; every Alternative/Error from flow has test
5. **Test Data References** — All test data uses TD-IDs (not literal strings); TD-ID names match usage (TD-NAME-_ for name fields, TD-EMAIL-_ for email fields)
6. **Source Citation** — Every Expected Result has Source field citing exact document location (flow line number, standard section, field validation reference)

If violations → fix → re-run all 6 → confirm pass → proceed.

### Step 6: Output Test Cases File

Create single markdown file at `docs/{flow-name}/testCases.md`:

**Format rules (minimalist for Claude):**

- No bold, italics, or decorative formatting
- Plain text, bullet lists only where needed
- Metadata: Flow name, source file, date
- Test Data section
- Test Cases section (grouped by priority)

### Step 7: Format and Stage for Git

Format with Prettier, then stage: `npx prettier --write docs/{flow-name}/testCases.md && git add docs/{flow-name}/testCases.md`

### Step 8: Console Report

Output to console (not in file):

```
File: docs/{flow-name}/testCases.md
Test cases: X (Y P0, Z P1, W P2)
Coverage: X/Y flow sections
Validation: passed
Gaps: [list or "none"]
Standards: [list files or "none"]
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
