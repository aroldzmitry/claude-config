---
description: "Convert user flow documentation into verifiable Pass/Fail checklist with traceability"
argument-hint: "<user-flow-path>: path to user flow document"
model: sonnet
allowed-tools: "Read, Write, Bash, AskUserQuestion"
---

# User Flow Checklist Generator

Transform user flow into binary assertions (Pass/Fail) with requirements traceability matrix.

## Input

`$ARGUMENTS` contains path to user flow file: `docs/{flow-name}/userFlows.md`. If empty → ask user.

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

If all pass → derive FLOWNAME from flow file path (e.g., `docs/01-register/userFlows.md` → `01-register`) → proceed to Step 1.

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

Sections: Page Load & Entry, Form & Validation, Submit & State Transitions, Success & Navigation, Alternative Conditions, Errors & Recovery, Accessibility (if in flow), Analytics (if tracked)

### 6. Normalize to User-Observable Assertions

Convert Happy Path steps to user-visible outcomes only.

**Forbidden:**

- Backend ops ("validates", "checks database", "API returns 200")
- Implementation details (file paths, class names, hook names)
- Intermediate states ("focused", "validating") unless critical

**3-part Happy Path transformation:**

Part 1: User Action (element visible/enabled)
Part 2: System Response (UI change occurs)
Part 3: Observable State (final state matches expectation)

Example: "User enters email → validates → error displays" becomes CL-001 (field accepts input), CL-002 (error displays), CL-003 (message matches FIELD-VALIDATIONS)

### 7. Extract Form Field Validations

For each field: extract required/optional, link to FIELD-VALIDATIONS.md, create CL items for required/format/error message.

Example: "Name: required, FIELD-VALIDATIONS#name" → CL-008 (required check), CL-009 (message matches contract)

### 8. Add Conditional Checks

From Alternative Paths, create if-then items (e.g., A1: Email exists → err_409 + login link; A2: Cancel → clear + return)

### 9. Add Error Contract

Domain-Specific: specific checks per unique error type
Infrastructure: "CL-xxx: Error handling follows Standard {ID} contract" from flow standard refs

### 10. Map to Component States (Critical Only)

Create checks for: idle (load), loading (async), success (confirm), error (display). Skip: focused, filled, validating, disabled, empty (unless critical).

### 11. Pre-Output Validation (Internal Self-Check)

Run validation internally. If violations → fix internally → re-run all 8 → once all pass → proceed to file creation.

**8 Validation Checks:**

1. **Observable-Only** — Every item user-visible (no backend ops, API codes, file paths, class names)
2. **Item Count** — 20-30 typical (40 max); if >40 → prioritize CRITICAL, then IMPORTANT, drop OPTIONAL until ≤40
3. **Coverage** — Every Goal ≥1 item; every CRITICAL Alternative ≥1 item; errors consolidated (2-3 total)
4. **Traceability** — Every item traces to flow section; no invented requirements
5. **Binary Assertions** — Pass/Fail only (no "smooth"/"fast" without criteria)
6. **Consolidation Applied** — No redundant variations; infrastructure errors → standard refs
7. **Severity Assigned** — Every item has [CRITICAL]/[IMPORTANT]/[OPTIONAL]
8. **Scope Respected** — External systems inform boundaries only; no backend integration checks

If violations → fix internally → re-run all 8 → once all pass → proceed.

### 12. Output Format

File: `docs/{flow-name}/checkList.md`

```markdown
# Checklist: {Flow Name}

**Source Flow:** `docs/{flow-name}/userFlows.md`
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

Format with Prettier, then stage: `npx prettier --write docs/{flow-name}/checkList.md && git add docs/{flow-name}/checkList.md`

### 14. Report

Output:

```
Checklist: docs/{flow-name}/checkList.md
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
