---
description: Generate work plan (what to do) from user flow by analyzing codebase status
argument-hint: [user-flow-file-path]
---

# Work Plan Generator

Analyzes user flow against codebase and outputs WHAT needs to be done (requirements), not HOW to implement.

## Input

Path to user flow markdown file via `$ARGUMENTS`.

## Output

### Console Summary

```
Requirements: N total (UI: X | API: Y | State: Z | Domain: W)
Status: Done: A | Partial: B | Missing: C
```

If all done: "✅ All requirements implemented." — exit without file.

### Work Plan File (Only When Work Needed)

File: `./docs/workPlans/{flow-name}-work-plan.md`

**Format:** List of requirements to fulfill. No file paths, no code patterns, no implementation details.

**Structure:**

```markdown
# Work Plan: {Flow Name}

Source: {user-flow-file-path}

## Missing Requirements

- [REQ-001] {What is needed} — {Why, from which flow step}
- [REQ-002] ...

## Partial Requirements

- [REQ-010] {What exists} → {What is missing}

## Acceptance Criteria

- [ ] {Criterion from flow success criteria}
- [ ] ...
```

## Process

1. **Parse Flow** — Extract steps, alternatives, error scenarios, success criteria
2. **Extract Requirements** — What the system must do (not how):
   - UI: what user sees/interacts with
   - Behavior: what happens on actions
   - Validation: what rules apply
   - Errors: what feedback on failures
   - State: what data persists/changes
3. **Check Codebase** — For each requirement, determine: Done | Partial | Missing
4. **Output** — Console summary + file if work needed

## Rules

**Output describes WHAT:**
- "User can upload avatar image"
- "System validates email format"
- "Error message shown when save fails"

**NOT HOW:**
- ~~"Add ImageUploader component to ProfilePage.tsx"~~
- ~~"Use zod schema for validation"~~
- ~~"Call notificationService.error()"~~

**DO:**
- Focus on functional requirements
- Include acceptance criteria from flow
- Reference flow steps (e.g., "from Step 3")

**DON'T:**
- Mention files, components, patterns
- Suggest technical solutions
- Include implementation hints
