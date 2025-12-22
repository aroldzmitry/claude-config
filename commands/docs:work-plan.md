---
description: Generate work plan (what to do) from user flow by analyzing codebase status
argument-hint: [user-flow-file-path]
model: sonnet
---

# Work Plan Generator

Analyzes user flow against codebase → outputs WHAT needs to be done (requirements), not HOW.

## WHAT vs HOW

**WHAT (correct):** "User can upload avatar image", "Error message shown when save fails"

**NOT HOW:** ~~"Add ImageUploader to ProfilePage.tsx"~~, ~~"Use zod for validation"~~

## Input

Path to user flow markdown file via `$ARGUMENTS`.

## Process

### Step 1: Validate Flow

Check file exists and contains: Goals, Happy Path, Alternative Paths, Negative Scenarios, Success Criteria.

If missing sections → output error → stop.

### Step 2: Extract Requirements

From flow, extract WHAT system must do:
- **UI** — what user sees/interacts with
- **Behavior** — what happens on actions
- **Validation** — what rules apply
- **Errors** — what feedback on failures
- **State** — what data persists/changes

Assign REQ-ID to each (REQ-001, REQ-002...).

### Step 3: Check Codebase

For each requirement, search codebase to determine status:

1. **Extract keywords** from requirement (nouns, verbs: "upload", "avatar", "validate", "email")
2. **Grep** for keywords in likely locations (components, services, hooks, utils)
3. **Read** matching files to verify functionality exists
4. **Classify**:
   - **Done** — functionality fully matches requirement
   - **Partial** — some aspects exist, others missing
   - **Missing** — no matching code found

### Step 4: Output

**Console summary:**
```
Requirements: N total (UI: X | API: Y | State: Z | Domain: W)
Status: Done: A | Partial: B | Missing: C
```

If all done → "✅ All requirements implemented." → exit without file.

### Step 5: Create Work Plan File

File: `docs/{flow-name}/workPlan.md`

```markdown
# Work Plan: {Flow Name}

Source: {user-flow-file-path}

## Missing Requirements

- [REQ-001] {What is needed} — {Why, from which flow step}

## Partial Requirements

- [REQ-010] {What exists} → {What is missing}

## Acceptance Criteria

- [ ] {Criterion from flow success criteria}
```

### Step 6: Format and Stage

```bash
npx prettier --write docs/{flow-name}/workPlan.md && git add docs/{flow-name}/workPlan.md
```

## Final Checklist

- [ ] All requirements are WHAT, not HOW (no files, components, patterns)
- [ ] Each requirement has REQ-ID
- [ ] Each requirement linked to flow step
- [ ] Codebase checked for each requirement
- [ ] Acceptance criteria from flow included
