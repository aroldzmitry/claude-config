---
description: Generate test cases from user flow and checklist documents. Outputs markdown file with TC-IDs, steps, test data, and coverage report.
allowed-tools: Read, Write, Bash
argument-hint: <flow-file> <checklist-file> [test-data-catalog] [env-profile]
model: sonnet
---

# docs:test-case

Generate test cases from user flow + checklist with traceability and coverage validation.

## Process

Parse args: `user-flow-path checklist-path [test-data-catalog] [env-profile]`

Step 0: Validate files exist. If not → error "File not found: <path>" and exit. Derive FLOWCODE from flow filename (e.g., `user-registration.md` → `REG`).

Step 1: Extract from user-flow: Goals, User types, Preconditions, Happy Path, Alternative paths, Negative scenarios, Success criteria, Infrastructure Behaviors (standard references), Component mapping, Boundaries.

Step 2: Extract from checklist: Item ID, Severity, Expected result, Source section.

Step 3: Build requirement map by linking checklist items to flow sections via source reference. Infrastructure Behaviors reference shared standards (e.g., "Applies: Standard EH-001").

Step 4: Decide test cases via coverage strategy:
- One happy path E2E for core CRITICAL items
- One E2E per CRITICAL alternative that changes outcome
- One E2E per CRITICAL error family (group similar errors if UI contract same)
- One cancellation test if CRITICAL or frequently used
- IMPORTANT: cover if risky/historically flaky
- OPTIONAL: skip unless requested

Step 5: Define test data. Use test-data-catalog IDs if provided (e.g., TD-EMAIL-VALID-UNIQUE), otherwise create inline section. Specify cleanup.

Step 6: Write test cases with format:
- TC ID: TC-<FLOWCODE>-###
- Fields: Title, Priority (P0/P1/P2), Type (E2E/Component/Integration/Contract), Preconditions, Test Data, Cleanup, Covers
- Steps: Action / Expected (UI-observable only: URL, visible text, element state)

Example structure:
```
TC-REG-001: Register happy path
Priority: P0 | Type: E2E
Preconditions: User not authenticated
Test Data: Name=TD-NAME-ASCII, Email=TD-EMAIL-VALID-UNIQUE
Cleanup: Delete user via API | Covers: CL-001, CL-002

Steps:
1. Navigate to /registration → Expected: Form visible, button disabled
2. Fill fields with test data → Expected: Validation indicators shown
3. Click Register → Expected: Loading shown, form disabled
4. Wait for redirect → Expected: Success message, URL is /login
```

Step 7: Validate coverage. List CRITICAL items not covered, orphan test cases, backend-only items. If gaps → ask targeted questions but output best-effort result.

Step 8: Output to `docs/testCases/<area>/[flow-filename].md`: Metadata, Test Data section, Test Cases (grouped by priority), Coverage Report (gaps, orphans, backend items), Out of scope.

Step 9: Git stage with `git add <output-path>`.

## Output

Status: Complete | Gaps identified | Need clarification
- Test cases count by priority (P0/P1/P2)
- Coverage % (checklist items covered)
- Blockers (if any)

## Dialogs

**Dialog 1: Environment & Error Setup** (only if blocking info missing)
When: Preconditions, error-forcing, or auth unclear
Options: Target env (staging/local/prod), Error forcing (mock/flag/hook), Error contract (exact/presence), Auth (hook/manual/flag)
Action: Apply selections or mark blocked steps

**Dialog 2: Coverage Summary** (after generation)
Shows: P0/P1/P2 count, coverage %, gaps
Ask: Proceed / adjust count / add gap details

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
- Output single markdown file only to docs/testCases/<area>/[user-flow-file-name].md
