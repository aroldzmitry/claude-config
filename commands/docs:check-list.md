---
description: "Convert user flow documentation into verifiable Pass/Fail checklist with traceability"
argument-hint: "<user-flow-path>: path to user flow document"
model: sonnet
---

# User Flow Checklist Generator

Transform user flow into binary assertions (Pass/Fail) with requirements traceability matrix.

## Input

`$ARGUMENTS` contains path to user flow file: `docs/userFlows/{flow-name}.md`. If empty → ask user.

Flow MUST contain these sections:
- System Context (Product, User Task, Boundaries, External Systems)
- Goals (verb-based)
- User Types
- Goal sections with: Happy Path, Form Fields (for form flows), Exit Paths, Alternative Paths, Negative Scenarios, UX Validation Checklist, Component Mapping

## Terminology

Shared Standard — system-wide behavior in `docs/standards/{ID}-{name}.md`, referenced as "Standard {ID}" with scope.
Field Validations — validation rules in `docs/standards/FIELD-VALIDATIONS.md`.
Observable — user-visible UI behavior (no backend/implementation details).

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
- Negative Scenarios → domain-specific error handling
- Infrastructure Behaviors → shared standard references (if present)
- UX Validation Checklist → UX requirements
- Component Mapping → UI states (idle/loading/success/error/empty/disabled)

Each entity becomes one or more checklist items.

### 3. Normalize to User-Observable Assertions

Convert Happy Path steps to user-visible outcomes only (see Terminology: Observable).

**Forbidden:**
- ❌ Backend ops ("validates", "checks database", "API returns 200")
- ❌ Implementation details (file paths, class names, hook names)
- ❌ Intermediate states ("focused", "validating") unless critical
- ❌ Duplicate error checks (network/500/timeout → single standard reference)

**3-part Happy Path transformation pattern:**

Part 1: User Action (CL-xxx: Action is possible)
Check: Interaction element visible/enabled (button, field, link)

Part 2: System Response (CL-xxx+1: Response visible)
Check: Expected UI change occurs (page loads, message displays, spinner shows)

Part 3: Observable State (CL-xxx+2: State reflects outcome)
Check: Final state matches expectation (redirected, field updated, notification visible)

Example:
Happy Path: "User enters email → System validates → Error displays if invalid"

Checklist items:
- CL-001: Email input field accepts user input
- CL-002: Validation error displays below field on invalid email
- CL-003: Error message text matches [FIELD-VALIDATIONS#email](../standards/FIELD-VALIDATIONS.md#email)

**Consolidation (Aggressive Merging Required):**
- Merge 3+ similar scenarios → single check (e.g., field validations → FIELD-VALIDATIONS.md reference)
- Infrastructure errors → standard references (e.g., NET-001)
- Similar UI checks → combine (e.g., "button visible + enabled + clickable" → "button visible and functional")
- Skip intermediate states → initial/final only
- If 5+ items same UI contract → consolidate to 1-2 max

### 4. Extract Form Field Validations

For flows with Form Fields section:
1. For each field: extract required/optional status
2. Link to `docs/standards/FIELD-VALIDATIONS.md` anchor
3. Create CL items for: required validation, format validation, error message display

Example:
Flow specifies: "Name field: required, validation: [FIELD-VALIDATIONS#name](../standards/FIELD-VALIDATIONS.md#name)"

Creates:
- CL-008: Name field is required (error on submit if empty)
- CL-009: Error message matches FIELD-VALIDATIONS#name contract

### 5. Group by Theme

Organize items into sections using Section Mapping (see below):
- **Page Load & Entry** — initial state, preconditions met
- **Form & Validation** — input checks, inline errors, disabled states
- **Submit & State Transitions** — loading, success, error states
- **Success & Navigation** — confirmation, redirect, data persistence
- **Alternative Conditions** — conditional logic from Alternative Paths
- **Errors & Recovery** — negative scenarios, retry, standard references
- **Accessibility** — ONLY if flow has UX Validation Checklist section with accessibility requirements
- **Analytics Events** — ONLY if Component Mapping includes analytics tracking

### 6. Add Conditional Checks

From Alternative Paths, create `if-then` items:
- `A1: Email exists → err_409 displayed + link to login visible`
- `A2: Cancel clicked → form data cleared + returns to previous page`

### 7. Add Error Contract

From Negative Scenarios section, create **consolidated error checks**:

**Domain-Specific Errors** (from Negative Scenarios domain-specific subsection):
Create specific checks for each unique error type with different behavior.

**Infrastructure Errors** (from Negative Scenarios inline standard references):
Flow uses format: "Applies: Standard {ID} (scope: context)"
Checklist item: "CL-xxx: Error handling follows Standard {ID} contract"

**Consolidation:**
- Group similar error types (network/500/timeout) → single check referencing the standard
- Only create separate items if error behavior differs (e.g., retry available vs. not)
- Skip redundant checks across error scenarios

### 8. Map to Component States (Reduced)

From Component Mapping section, create checks for **critical states only**:
- Initial/idle state (page load)
- Loading state (during async operations)
- Success state (completion confirmation)
- Error state (error display)
- Skip intermediate states: focused, filled, validating, disabled (unless critical to UX)
- Skip empty state unless explicitly mentioned as important in flow

### 9. Section Mapping Table

| User Flow Section | Checklist Section | Items Generated |
|---|---|---|
| Preconditions | Page Load & Entry | Entry state checks |
| Happy Path | Form & Validation + Submit & State Transitions | User action + system response (3-part pattern) |
| Form Fields | Form & Validation | Input validation + error display + FIELD-VALIDATIONS references |
| Alternative Paths | Alternative Conditions | If-then assertions |
| Negative Scenarios (domain) | Errors & Recovery | Error-specific checks |
| Negative Scenarios (infra refs) | Errors & Recovery | Standard references (e.g., "follows Standard NET-001") |
| Component Mapping | Submit & Success + states | UI state transitions (idle/loading/success/error) |
| UX Validation Checklist (if present) | Accessibility | Accessibility checks from flow ONLY |
| Component Mapping (analytics) | Analytics Events | Analytics tracking (if explicitly in flow) |

### 10. Pre-Output Validation (Mandatory, Blocking)

Output validation checklist BEFORE creating file. If violations → fix → re-run → confirm pass → proceed.

**8 Validation Checks:**

1. **Observable-Only** — Every item user-visible (no backend ops, API codes, file paths, class names)
2. **Item Count** — 20-30 typical (40 max); if >40 → consolidate
3. **Coverage** — Every Goal ≥1 item; every CRITICAL Alternative ≥1 item; errors consolidated (2-3 total)
4. **Traceability** — Every item traces to flow section; no invented requirements
5. **Binary Assertions** — Pass/Fail only (no "smooth"/"fast" without criteria)
6. **Consolidation Applied** — No redundant variations; infrastructure errors → standard refs
7. **Severity Assigned** — Every item has [CRITICAL]/[IMPORTANT]/[OPTIONAL]
8. **External Systems Scope** — Systems inform boundaries, NOT checklist items; integration errors → user-observable outcomes

If violations → fix → re-run all 8 → confirm pass → proceed.

### 11. External Systems Handling

External Systems (OAuth, SMTP, Plaid, payment gateways) inform scope, NOT checklist items.
- Create items for user-observable outcomes only (login button visible, payment success message)
- NO backend checks (API responds, webhook received, server reachable)

### 12. Ask Questions (Only When Needed)

Use `AskUserQuestion` ONLY if checklist becomes unexecutable without answer. Use defaults:

- Browser/Device Support → Chrome/Firefox/Safari desktop + mobile (375px, 1280px)
- Error Text Contract → check flow's Negative Scenarios for standard refs; fallback: generic (message visible, recovery option, loading cleared)
- Data Persistence → no persistence unless flow specifies
- Roles/Permissions → use flow's User Types
- Test Data → note as `[TEST-DATA-REQUIRED]`

Do NOT ask: UX Metrics/timing (only use if flow specifies), External Systems, Field validations, Error standards, Happy path steps, Accessibility (only from flow's UX Validation Checklist).

### 13. Output Format

File: `docs/checkLists/{flow-name}.md`

```markdown
# Checklist: {Flow Name}

**Source Flow:** `docs/userFlows/{flow-name}.md`
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

## Form & Validation

| ID | Severity | Check | Expected Result | Source |
|----|----------|-------|-----------------|--------|
| CL-003 | [CRITICAL] | Email validation on blur | Invalid email → inline error "Invalid email format" | Happy Path Step 2 |

## Submit & Success, Alternative Conditions, Error Handling

[Same table structure, one example row per section]

## Accessibility (if flow has UX Validation Checklist)

[Only include this section if flow explicitly defines accessibility requirements]

## Analytics Events (if explicitly tracked in flow)

[Only include if Component Mapping includes analytics tracking]

## Out of Scope

- [Items outside flow boundaries]

## Notes

- [Browser support, timing expectations, test data requirements]
```

### 14. Stage for Git

After creating file, run:
```bash
git add docs/checkLists/{flow-name}.md
```

### 15. Report

Output:
```
Checklist: docs/checkLists/{flow-name}.md
Items: X (Y critical, Z important, W optional)
Coverage: Goals (X), Alternatives (Y), Errors (Z), States (W)
Validation: All 8 checks passed
```

## Rules

- Extract ONLY from flow — never invent requirements
- Every item: user-observable, binary (Pass/Fail), traces to flow section
- NO backend ops, API details, file paths, class names
- Consolidate: merge 3+ similar → single check; infrastructure errors → standard refs; skip intermediate states
- External Systems inform scope, NOT checklist items
- Severity required: [CRITICAL] (flow-blocking), [IMPORTANT] (common/flaky), [OPTIONAL] (nice-to-have)
- Coverage: Every Goal ≥1 item; every CRITICAL Alternative ≥1 item; errors consolidated (2-3 total)
- Target 20-30 items (40 max)
- Pre-Output Validation MANDATORY — 8 checks must pass before output
