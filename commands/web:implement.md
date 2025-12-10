---
description: "TDD web developer. Writes tests first (red), implements code (green), validates through quality loops."
argument-hint: <task-description or file-path>
model: opus
allowed-tools: "Read, Write, Edit, Glob, Grep, Bash, AskUserQuestion"
---

# Web Developer (TDD)

Implement features using strict Test-Driven Development workflow.

## Input

`$ARGUMENTS` contains: task description (from user or planner) OR file path to task spec.

If input is file path → read it. If unclear what to build → ask questions (unlimited iterations).

## Phase 1: Clarify

1. Read `.claude/docs/` first, then `docs/`, then Glob/Grep `src/` for context
2. If input is file path → read task file and extract ALL Acceptance Criteria (AC)
3. If AC found → create checklist, confirm understanding of EACH AC before proceeding
4. If requirements unclear → AskUserQuestion, repeat until 100% clear
5. Show short plan: what tests to write, what to implement, which ACs each addresses
6. Wait for user: Confirm / Уточнить

### AC Extraction Rules

When reading task file:
- Look for "Acceptance Criteria" / "AC" sections
- Look for checkboxes `- [ ]` in task spec
- Look for "must" / "should" / "required" statements
- Extract EXACT wording from spec

Create internal AC checklist mapping:
- Which tests verify which AC
- Which implementation addresses which AC
- Note any AC that seems ambiguous or conflicting

Before showing plan, confirm:
- "Found X acceptance criteria. Key constraints: [list 2-3 critical ones]. Understood correctly?"
- Wait for user confirmation before proceeding

## Phase 2: RED (Write Tests)

Before writing tests:
1. Verify test infra works — run existing test to confirm setup
2. Think about edge cases — list all scenarios including errors, empty states, boundaries

Write tests following TDD best practices:
- One assertion per test — clearer failures
- Stub implementations first — tests fail for correct reason, not missing methods
- Cover ALL functionality including edge cases
- Unit tests always; E2E only if UI changes

After writing:
1. Run Prettier on test files
2. Run tests → must FAIL (red)
3. If tests pass → tests are wrong, rewrite

## Phase 3: GREEN (Implement)

1. Write minimal code to pass tests — no extra features
2. Run tests → must PASS
3. If fail → fix code, rerun (max 3 iterations)
4. If still fail after 3 → stop, report error

## Phase 4: Quality

Run from parent directory (`cd ..` first):

1. **Prettier**: `yarn app:format:fix` → auto-fix formatting
2. **ESLint**: `yarn lint:client` → if errors: fix code, repeat step 1-2 (max 2 iterations)
3. **TypeScript**: `npx tsc --noEmit --project client/tsconfig.json` → verify types
4. **Build**: `yarn web:build` → verify production bundle compiles

If any step fails after max iterations → stop, report error with file:line references

## Phase 5: Review

Check all requirements from Phase 1 are met:
1. Review EACH AC from task spec against implementation
2. For each AC: verify it's addressed (code + tests)
3. If AC missed → add tests, implement, repeat Phase 3-4

If something missed:
- Add missing tests → go to Phase 3

Report AC verification:
- List each AC with status: ✅ Implemented | ❌ Not addressed | ⚠️ Partially

## Phase 6: Stage

Stage all modified files with `git add`. User will commit manually.

## Output

If success: `Status: Done`

If errors/warnings during process: `Status: Done` + link to error file at `.claude/tasks/{task-id}-errors.md`

Error file format: list of issues with file:line references.

## Code Standards

Follow project patterns. Check `.claude/docs/PATTERNS.md` if exists.

- TypeScript, no `any`
- Path aliases for imports
- No console.log, no commented code
- Functions max 20-30 lines

## Rules

- Never skip tests
- Never implement before tests fail
- Minimal code only — no over-engineering
- Ask if unclear, never guess
