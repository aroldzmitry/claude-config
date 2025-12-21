---
description: "Convert user flow documentation into verifiable Pass/Fail checklist with traceability"
argument-hint: "<user-flow-path>: path to user flow document"
model: sonnet
---

# User Flow Checklist Generator

Transform user flow into binary assertions (Pass/Fail) with requirements traceability matrix.

## Input

`$ARGUMENTS` contains path to user flow file: `docs/userFlows/{flow-name}.md`. If empty → ask user.

Flow MUST contain: System Context, Goals, User Types, Happy Path, Alternative Paths, Negative Scenarios, Component Mapping.

## Terminology

- **Observable** — user-visible UI behavior (no backend/implementation details, API codes, file paths, class names)
- **Shared Standard** — system-wide behavior in `docs/standards/{ID}-{name}.md`, referenced as "Standard {ID}" with scope
- **Field Validations** — validation rules in `docs/standards/FIELD-VALIDATIONS.md`

## Consolidation Rules (Apply Throughout)

- Merge 3+ similar scenarios → single check (e.g., field validations → FIELD-VALIDATIONS.md reference)
- Infrastructure errors (network/500/timeout) → single standard reference (e.g., NET-001)
- Similar UI checks → combine (e.g., "button visible + enabled + clickable" → "button visible and functional")
- Skip intermediate states (focused, validating) → initial/final only
- If 5+ items share same UI contract → consolidate to 1-2 max
- External Systems inform scope boundaries, NOT checklist items — create items for user-observable outcomes only

## Process

### 0. Pre-Validation (Blocking)

Check flow file exists and readable. If not → output error "File not found: <path>" and exit.

Read flow, verify:

**Flow Structure Valid**

- All required sections present (System Context, Goals, User Types, Happy Path, Alternative Paths, Negative Scenarios, Component Mapping)
- Goals are verb-based
- Happy Path contains ONLY observable statements (user actions, visible responses)

If validation fails → output violations list → stop → ask user to fix flow.

If all pass → derive AREA from flow file path (e.g., `docs/userFlows/auth/login.md` → `auth`) → proceed to Step 1.

### 1. Extract Boundaries

Read flow's System Context, Goals, Preconditions sections.

Identify:

- Entry/exit points
- External systems (inform scope, not items)
- Explicit exclusions ("not included", "out of scope")

Mark anything outside these boundaries as `[OUT-OF-SCOPE]`.

### 2. Ask Questions (Only When Blocking)

Use `AskUserQuestion` ONLY if checklist becomes unexecutable without answer. Use defaults:

- Browser/Device Support → Chrome/Firefox/Safari desktop + mobile (375px, 1280px)
- Error Text Contract → check flow's Negative Scenarios for standard refs; fallback: generic (message visible, recovery option, loading cleared)
- Data Persistence → no persistence unless flow specifies
- Roles/Permissions → use flow's User Types
- Test Data → note as `[TEST-DATA-REQUIRED]`

Do NOT ask: UX Metrics/timing, External Systems, Field validations, Error standards, Happy path steps, Accessibility (only from flow's UX Validation Checklist).

### 3. Build Coverage Matrix

Extract testable entities from flow sections:

- Goals → expected outcomes
- Preconditions → initial states
- Happy Path → sequence results
- Exit Paths → navigation targets
- Alternative Paths → conditional logic
- Negative Scenarios → domain-specific error handling + standard references
- UX Validation Checklist → UX requirements
- Component Mapping → UI states (idle/loading/success/error)

Each entity becomes one or more checklist items.

### 4. Section Mapping Reference

| User Flow Section                    | Checklist Section                              | Items Generated                                                 |
| ------------------------------------ | ---------------------------------------------- | --------------------------------------------------------------- |
| Preconditions                        | Page Load & Entry                              | Entry state checks                                              |
| Happy Path                           | Form & Validation + Submit & State Transitions | User action + system response (3-part pattern)                  |
| Form Fields                          | Form & Validation                              | Input validation + error display + FIELD-VALIDATIONS references |
| Alternative Paths                    | Alternative Conditions                         | If-then assertions                                              |
| Negative Scenarios (domain)          | Errors & Recovery                              | Error-specific checks                                           |
| Negative Scenarios (infra refs)      | Errors & Recovery                              | Standard references (e.g., "follows Standard NET-001")          |
| Component Mapping                    | Submit & Success + states                      | UI state transitions (idle/loading/success/error)               |
| UX Validation Checklist (if present) | Accessibility                                  | Accessibility checks from flow ONLY                             |
| Component Mapping (analytics)        | Analytics Events                               | Analytics tracking (if explicitly in flow)                      |

### 5. Group by Theme

Organize items into sections:

- **Page Load & Entry** — initial state, preconditions met
- **Form & Validation** — input checks, inline errors, disabled states
- **Submit & State Transitions** — loading, success, error states
- **Success & Navigation** — confirmation, redirect, data persistence
- **Alternative Conditions** — conditional logic from Alternative Paths
- **Errors & Recovery** — negative scenarios, retry, standard references
- **Accessibility** — ONLY if flow has UX Validation Checklist section with accessibility requirements
- **Analytics Events** — ONLY if Component Mapping includes analytics tracking

### 6. Normalize to User-Observable Assertions

Convert Happy Path steps to user-visible outcomes only.

**Forbidden:**

- Backend ops ("validates", "checks database", "API returns 200")
- Implementation details (file paths, class names, hook names)
- Intermediate states ("focused", "validating") unless critical

**3-part Happy Path transformation pattern:**

Part 1: User Action (CL-xxx: Action is possible)
→ Interaction element visible/enabled (button, field, link)

Part 2: System Response (CL-xxx+1: Response visible)
→ Expected UI change occurs (page loads, message displays, spinner shows)

Part 3: Observable State (CL-xxx+2: State reflects outcome)
→ Final state matches expectation (redirected, field updated, notification visible)

Example:
Happy Path: "User enters email → System validates → Error displays if invalid"

Checklist items:

- CL-001: Email input field accepts user input
- CL-002: Validation error displays below field on invalid email
- CL-003: Error message text matches [FIELD-VALIDATIONS#email](../standards/FIELD-VALIDATIONS.md#email)

### 7. Extract Form Field Validations

For flows with Form Fields section:

1. For each field: extract required/optional status
2. Link to `docs/standards/FIELD-VALIDATIONS.md` anchor
3. Create CL items for: required validation, format validation, error message display

Example:
Flow specifies: "Name field: required, validation: [FIELD-VALIDATIONS#name](../standards/FIELD-VALIDATIONS.md#name)"

Creates:

- CL-008: Name field is required (error on submit if empty)
- CL-009: Error message matches FIELD-VALIDATIONS#name contract

### 8. Add Conditional Checks

From Alternative Paths, create `if-then` items:

- `A1: Email exists → err_409 displayed + link to login visible`
- `A2: Cancel clicked → form data cleared + returns to previous page`

### 9. Add Error Contract

From Negative Scenarios section, create **consolidated error checks**:

**Domain-Specific Errors** (from Negative Scenarios domain-specific subsection):
Create specific checks for each unique error type with different behavior.

**Infrastructure Errors** (from Negative Scenarios inline standard references):
Flow uses format: "Applies: Standard {ID} (scope: context)"
Checklist item: "CL-xxx: Error handling follows Standard {ID} contract"

### 10. Map to Component States (Critical Only)

From Component Mapping section, create checks for:

- Initial/idle state (page load)
- Loading state (during async operations)
- Success state (completion confirmation)
- Error state (error display)

Skip: focused, filled, validating, disabled, empty (unless explicitly critical in flow).

### 11. Pre-Output Validation (Mandatory, Blocking)

Output validation checklist BEFORE creating file. If violations → fix → re-run → confirm pass → proceed.

**8 Validation Checks:**

1. **Observable-Only** — Every item user-visible (no backend ops, API codes, file paths, class names)
2. **Item Count** — 20-30 typical (40 max); if >40 → prioritize CRITICAL, then IMPORTANT, drop OPTIONAL until ≤40
3. **Coverage** — Every Goal ≥1 item; every CRITICAL Alternative ≥1 item; errors consolidated (2-3 total)
4. **Traceability** — Every item traces to flow section; no invented requirements
5. **Binary Assertions** — Pass/Fail only (no "smooth"/"fast" without criteria)
6. **Consolidation Applied** — No redundant variations; infrastructure errors → standard refs
7. **Severity Assigned** — Every item has [CRITICAL]/[IMPORTANT]/[OPTIONAL]
8. **Scope Respected** — External systems inform boundaries only; no backend integration checks

If violations → fix → re-run all 8 → confirm pass → proceed.

### 12. Output Format

File: `docs/checklists/<area>/[flow-name].md`

```markdown
# Checklist: {Flow Name}

**Source Flow:** `docs/userFlows/{flow-name}.md`
**Generated:** {YYYY-MM-DD}

## Coverage Summary

| Flow Section | Items |
| ------------ | ----- |
| Goals        | X     |
| **Total**    | **X** |

## Page Load & Entry

| ID     | Severity   | Check                     | Expected Result                    | Source        |
| ------ | ---------- | ------------------------- | ---------------------------------- | ------------- |
| CL-001 | [CRITICAL] | Page loads without errors | No console errors; all assets load | Preconditions |

## Form & Validation

| ID     | Severity   | Check                    | Expected Result                                     | Source            |
| ------ | ---------- | ------------------------ | --------------------------------------------------- | ----------------- |
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

### 13. Format and Stage for Git

Format with Prettier, then stage: `npx prettier --write docs/checklists/<area>/[flow-name].md && git add docs/checklists/<area>/[flow-name].md`

### 14. Report

Output:

```
Checklist: docs/checklists/<area>/[flow-name].md
Items: X (Y critical, Z important, W optional)
Coverage: Goals (X), Alternatives (Y), Errors (Z), States (W)
Validation: All 8 checks passed
```

## Rules

- Extract ONLY from flow — never invent requirements
- Every item: user-observable, binary (Pass/Fail), traces to flow section
- Severity required: [CRITICAL] (flow-blocking), [IMPORTANT] (common/flaky), [OPTIONAL] (nice-to-have)
- Coverage: Every Goal ≥1 item; every CRITICAL Alternative ≥1 item; errors consolidated (2-3 total)
- Target 20-30 items (40 max); if >40 → prioritize by severity, drop OPTIONAL first
