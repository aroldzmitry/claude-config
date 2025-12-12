---
description: "Convert user flow documentation into verifiable Pass/Fail checklist with traceability"
argument-hint: "<user-flow-path>: path to user flow document"
model: sonnet
---

# User Flow Checklist Generator

Transform user flow into binary assertions (Pass/Fail) with requirements traceability matrix.

## Input

`$ARGUMENTS` contains path to user flow document in `docs/userFlows/`. If empty → ask user.

## Process

### 1. Extract Boundaries

Read flow's System Context, Goals, Preconditions sections.

Identify:
- Entry/exit points
- External systems
- Explicit exclusions ("not included", "out of scope")

Mark anything outside these boundaries as `[OUT-OF-SCOPE]`.

### 2. Build Coverage Matrix

Extract testable entities from flow sections:
- Goals → expected outcomes
- Preconditions → initial states
- Happy Path → sequence results
- Exit Paths → navigation targets
- Alternative Paths → conditional logic
- Negative Scenarios → error handling
- UX Validation Checklist → UX requirements
- Component Mapping → UI states (idle/loading/success/error/empty/disabled)

Each entity becomes one or more checklist items.

### 3. Normalize to Observable Assertions

Convert steps to UI-observable facts:
- "User clicks login" → `CL-###: Login button visible and enabled`
- "API returns error" → `CL-###: Error message displayed with retry button`
- "Data saves" → `CL-###: Success confirmation appears within 3s`

Types: visibility (`element_visible`), state (`state_loading`, `state_error`), navigation (`navigates_to`), data (`data_saved`), errors (`err_network`, `err_auth`)

### 4. Group by Theme

Organize items into sections:
- **Page Load & Entry** — initial state, preconditions met
- **Form & Validation** — input checks, inline errors, disabled states
- **Submit & State Transitions** — loading, success, error states
- **Success & Navigation** — confirmation, redirect, data persistence
- **Alternative Conditions** — conditional logic from Alternative Paths
- **Errors & Recovery** — negative scenarios, retry, error UI contract
- **Accessibility Basics** — keyboard nav, focus, ARIA roles for forms
- **Analytics Events** — if Component Mapping includes analytics

### 5. Add Conditional Checks

From Alternative Paths, create `if-then` items:
- `A1: Email exists → err_409 displayed + link to login visible`
- `A2: Cancel clicked → form data cleared + returns to previous page`

### 6. Add Error Contract

From Negative Scenarios + Error UI Requirements:
- Error message text matches contract
- Retry button present (if applicable)
- Close/Cancel button available
- Loading state cleared on error
- Form data preserved on retry (if specified)
- Background interaction blocked during error

### 7. Map to Component States

From Component Mapping section, ensure each component + state has ≥1 check:
- Idle state
- Loading state
- Success state
- Error state
- Empty state
- Disabled state

### 8. Validation

Three checks before output:

**Coverage Check**
- Every Goal has ≥1 item
- Every Alternative Path has ≥1 item
- Every Negative Scenario has ≥1 item
- Every Component state has ≥1 item

If gap detected → ask user if intentional or add missing items.

**No Extra Requirements**
- Every item traces to specific flow section
- If untraceable → mark `[NEEDS-CLARIFICATION]` and ask user

**Testability Check**
- Every item is binary (Pass/Fail)
- No subjective terms without criteria ("smooth" → fail unless defined as "<200ms animation")
- Observable in UI (not internal system state)
- For each assertion, verify reasoning: "Why is this Pass/Fail? What exact UI state proves this?" If answer unclear → reject assertion

If fails → ask user to clarify or remove.

### 9. Ask Questions (Only When Needed)

Ask only if checklist would become speculation without answer:

**Browser/Device Support**
"Which browsers and breakpoints must this flow support?"
- Default: Chrome/Firefox/Safari desktop + mobile (375px, 1280px)

**UX Metrics**
"What are timing expectations for loading states?"
- Default: <3s for data fetch, <1s for navigation

**Error Text Contract**
"Where are error messages documented?"
- Default: use flow's Error UI Requirements if present

**Data Persistence**
"Should form data persist on cancel/back/reload?"
- Default: no persistence unless flow specifies

**Roles & Permissions**
"What user roles/permissions exist for this flow?"
- Default: use flow's User Types

**Test Data**
"What test data should be used for verification?"
- Default: ask user to provide or note as `[TEST-DATA-REQUIRED]`

### 10. Output Format

File: `docs/checkLists/[flow-folder]/[flow-filename].md`

```markdown
# Checklist: {Flow Name}

**Source Flow:** `docs/userFlows/{flow-folder}/{flow-filename}.md`
**Generated:** {YYYY-MM-DD}

## Coverage Summary

| Flow Section | Items |
|--------------|-------|
| Goals | X |
| **Total** | **X** |

## Page Load & Entry

| ID | Severity | Check | Expected Result | Source |
|----|----------|-------|-----------------|--------|
| CL-001 | [CRITICAL] | Page loads without errors | No console errors; all assets load | Preconditions |
| ... | ... | ... | ... | ... |

## Form & Validation

| ID | Severity | Check | Expected Result | Source |
|----|----------|-------|-----------------|--------|
| CL-003 | [CRITICAL] | Email validation on blur | Invalid email → inline error "Invalid email format" | Happy Path Step 2 |
| ... | ... | ... | ... | ... |

## Submit & State Transitions, Success & Navigation, Alternative Conditions, Errors & Recovery, Accessibility Basics, Analytics Events

[Same table structure as above, one example row per section + ...]

## Out of Scope

- [Items outside flow boundaries]

## Notes

- [Browser support, timing expectations, test data requirements]
```

### 11. Stage for Git

After creating file, run:
```bash
git add docs/checkLists/[flow-folder]/[flow-filename].md
```

### 12. Report

Output:
```
Checklist: docs/checkLists/{folder}/{filename}.md
Items: X (Y critical, Z important, W optional)
Coverage: Goals (X), Alternatives (Y), Errors (Z), States (W)
```

## Rules

- Never invent requirements not in flow
- Every item must trace to flow section
- Binary only — Pass/Fail, no subjective terms
- Ask questions only when answer prevents speculation
- Include severity: [CRITICAL], [IMPORTANT], [OPTIONAL]
- Use standardized state/error prefixes
- Validate coverage before output
- Check for out-of-scope items from other flows
- Minimum coverage: entry, exit, loading, success, error, empty, disabled, recovery, navigation, error text contract, accessibility (keyboard + focus), out-of-scope exclusions
