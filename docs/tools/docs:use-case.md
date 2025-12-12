# docs:use-case

Generate test cases from user flow and checklist documents with traceability and coverage validation.

## Purpose

Converts user flow document + checklist into automation-ready test cases with:
- Stable TC-IDs (TC-<FLOWCODE>-###)
- UI-observable expected results
- Reusable test data references (TD-*)
- Traceability to checklist items (Covers field)
- Coverage validation report

## Usage

```bash
/docs:use-case <flow-file> <checklist-file> [test-data-catalog] [env-profile]
```

## Parameters

- `<flow-file>` — Path to user flow markdown (required)
- `<checklist-file>` — Path to checklist markdown (required)
- `[test-data-catalog]` — Optional path to test data catalog with TD-* IDs
- `[env-profile]` — Optional environment profile (staging/local/prod-like)

## Output

Single markdown file: `docs/testCases/<area>/[user-flow-file-name].md` (preserves flow file name pattern)

Contains:
- Metadata block (flow name, sources, date)
- Test Data section (reusable TD-* IDs)
- Test Cases section (grouped by priority)
- Coverage Report (gaps, orphans, backend-only items)

## Example

```bash
/docs:use-case docs/userFlows/authentication/user-registration.md docs/checkLists/authentication/01-register.md
```

Generates:
- `docs/testCases/authentication/user-registration.md`
- Test cases: TC-REG-001, TC-REG-002, etc.
- Coverage report with CRITICAL item validation

## Test Case Format

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
3. Click Register
   Expected: Loading shown, form disabled
```

## Coverage Strategy

- **CRITICAL** → P0 test cases (one happy path, one per alternative outcome, one per error family)
- **IMPORTANT** → P1 test cases (risky or historically flaky items only)
- **OPTIONAL** → P2 or skipped (unless explicitly requested)

## Notes

- Derives FLOWCODE from flow file name (`user-registration.md` → `REG`)
- Never invents requirements not in flow/checklist
- Separates E2E from backend-only checks (marks as Integration/Contract)
- Validates all input files exist before processing
