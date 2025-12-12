---
description: Generate test cases from user flow and checklist documents. Outputs markdown file with TC-IDs, steps, test data, and coverage report.
allowed-tools: Read, Write
argument-hint: <flow-file> <checklist-file> [test-data-catalog] [env-profile]
model: sonnet
---

# docs:use-case

Generate test cases from user flow document + checklist with traceability and coverage validation.

## Instructions

Parse command args as: `user-flow-file-path checklist-file-path [test-data-catalog-path] [environment-profile-path]`

Step 0: Validate files. Check user-flow and checklist files exist and are readable. If not, output error: "File not found: <path>" and exit. Derive FLOWCODE from flow file name (e.g., `user-registration.md` → `REG`, `budget-creation.md` → `BUDG`).

Step 1: Read user-flow file and extract: Goals, User types, Preconditions, Happy Path, Alternative paths, Negative scenarios, Success criteria, Error UI, Component mapping, Boundaries.

Step 2: Read checklist file and extract: Item ID, Severity (CRITICAL/IMPORTANT/OPTIONAL), Expected result, Source section.

Step 3: Build requirement map. Link each checklist item to flow section by matching source reference. Treat Goals, Success criteria, Alternative paths, Negative scenarios, Error UI as requirements nodes.

Step 4: Decide test cases using coverage strategy:
- One happy path E2E for core CRITICAL items
- One E2E per CRITICAL alternative that changes outcome
- One E2E per CRITICAL error family (group similar errors if UI contract is same)
- One cancellation test if CRITICAL or frequently used
- IMPORTANT items: cover if risky or historically flaky
- OPTIONAL: skip unless explicitly requested

Step 5: Define test data. If test-data-catalog provided, use its IDs (e.g., TD-EMAIL-VALID-UNIQUE). If not, create inline section with reusable IDs. Use unique email for create flows, seeded records for duplicates, specify cleanup.

Step 6: Write each test case:
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

Step 7: Validate coverage:
- List CRITICAL items not covered
- List test cases with no checklist IDs
- List backend-only items moved to Integration/Contract
- If gaps: ask targeted questions but output best-effort result

Step 8: Output single markdown file to `docs/testCases/<area>/<flowId>-testcases.md`:
- Metadata block (Flow name, source files, generated date)
- Test Data section
- Test Cases section (grouped by priority or type)
- Coverage Report section (gaps, orphans, backend items)
- Out of scope reminders

## Output

Status: Complete | Gaps identified | Need clarification

Data:
- Test cases generated (count by priority)
- Coverage % (checklist items covered)
- Blockers (if any)

## Dialogs

**Dialog 1: Environment & Error Setup (if blocking info missing)**
- When: Preconditions, error-forcing strategy, or auth setup unclear
- Type: Multi-select (pick applicable, others default)
- Options:
  - Target environment: staging / local / prod-like (default: staging)
  - Error forcing: mock layer / feature flag / test endpoint / requires manual hook (default: mark steps "requires test hook")
  - Error contract: exact text match / presence only (default: presence only)
  - Auth preconditions: test hook / manual login / feature flag (default: test hook)
- Action: Apply selections or mark blocked steps

**Dialog 2: Coverage Summary (shown after test case generation completes)**
- Shows: count P0/P1/P2 cases, coverage %, list of gaps
- Ask: Proceed with output / adjust case count / add details for gaps

## Rules

- Extract ONLY from flow and checklist, never invent requirements
- Make every test case executable with UI-observable expected results
- Link every test case to checklist IDs via Covers field
- Use test data IDs (TD-*) not literal strings
- Separate E2E from backend-only checks (mark as Integration/Contract type)
- Keep test count lean: few high-value cases, not one per checklist item
- Report coverage gaps honestly in Coverage Report section
- Never create vague steps like "test should work" or "verify behavior"
- Skip analytics tests unless user explicitly requests coverage
- Never renumber existing TC-IDs or checklist IDs unless user asks
- Output single markdown file only to docs/testCases/<area>/<flowId>-testcases.md
