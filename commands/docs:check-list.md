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

## Terminology (Aligned with docs:user-flow)

Shared Standard — system-wide behavior documented in `docs/standards/{ID}-{name}.md`, referenced by flows as "Standard {ID}" with scope.

Field Validations — centralized validation rules in `docs/standards/FIELD-VALIDATIONS.md`, referenced by flows in Form Fields section.

Observable — user-visible UI behavior only (no backend operations, no implementation details).

## Process

### 0. Pre-Checklist Validation (Blocking)

Read flow file and verify:

**Flow Structure Valid**
- All required sections present (System Context, Goals, Happy Path, Alternative Paths, Negative Scenarios, UX Validation, Component Mapping)
- Goals are verb-based
- User Types match preconditions

**Observable Enforcement**
- Happy Path contains ONLY observable statements (user actions, visible responses, state changes)
- NO backend operations in sequences
- NO implementation details (file paths, class names, API endpoints)

**Error Consolidation**
- Negative Scenarios use standard references OR domain-specific errors
- Infrastructure errors referenced as "Applies: Standard {ID} (scope: context)"

**Exit Paths Clear**
- All goals have explicit exit conditions
- All alternatives have recovery paths

If validation fails → output violations list → stop → ask user to fix flow → re-run validation.

If all pass → proceed to step 1.

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

### 3. Transform Happy Path to Checklist Items

Each Happy Path step becomes checklist items using **3-part pattern**:

**Part 1: User Action** (CL-xxx: Action is possible)
Check: Interaction element visible/enabled (button, field, link, etc.)

**Part 2: System Response** (CL-xxx+1: Response visible)
Check: Expected UI change occurs (page loads, message displays, spinner shows, etc.)

**Part 3: Observable State** (CL-xxx+2: State reflects outcome)
Check: Final state matches expectation (redirected, field updated, notification visible, etc.)

**Example Transformation:**
Happy Path: "User enters email → System validates → Error displays if invalid"

Checklist items:
- CL-001: Email input field accepts user input
- CL-002: Validation error displays below field on invalid email
- CL-003: Error message text matches [FIELD-VALIDATIONS#email](../standards/FIELD-VALIDATIONS.md#email)

**Consolidation rules:**
- Merge similar error scenarios → single "Error handling follows Standard {ID}" check
- Skip intermediate states → focus on initial and final states only
- Combine redundant validations → one check per unique user outcome

**Forbidden patterns:**
- ❌ Implementation details ("Backend returns 200 OK", "Database saves record")
- ❌ Intermediate UI states ("field focused", "validating state", "field filled") unless critical
- ❌ Duplicate error conditions (separate checks for network/500/race when behavior is identical)

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
- **Accessibility Basics** — keyboard nav, focus, ARIA roles for forms
- **Analytics Events** — if Component Mapping includes analytics

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
| UX Validation Checklist | Accessibility Basics | UX contract checks |

### 10. Validation

Three checks before output:

**Coverage Check**
- Every Goal has ≥1 item
- Every Alternative Path has ≥1 item
- Error scenarios consolidated into 2-3 generic checks (not one per scenario)
- Component states: only critical states (idle/loading/success/error)

If gap detected → ask user if intentional or add missing items.

**No Extra Requirements**
- Every item traces to specific flow section
- If untraceable → mark `[NEEDS-CLARIFICATION]` and ask user

**Testability Check**
- Every item is binary (Pass/Fail)
- No subjective terms without criteria ("smooth" → fail unless defined as "<200ms animation")
- Observable in UI (not internal system state)
- **No implementation details** (no API status codes, backend operations, database states)
- **No intermediate states** (focused, filled, validating, disabled) unless critical
- For each assertion, verify: "Can a user see/experience this without dev tools?" If no → reject
- For each assertion, verify: "Is this check duplicated elsewhere?" If yes → consolidate

Target: 20-30 items for typical flow (not 60+). If exceeding 40 items → aggressive consolidation needed.

### 11. Ask Questions (Only When Needed)

Ask only if checklist would become speculation without answer:

**Browser/Device Support**
"Which browsers and breakpoints must this flow support?"
- Default: Chrome/Firefox/Safari desktop + mobile (375px, 1280px)

**UX Metrics**
"What are timing expectations for loading states?"
- Default: <3s for data fetch, <1s for navigation

**Error Text Contract**
"Where are error messages documented?"
- Default: check flow's Negative Scenarios section for standard references (format: "Applies: Standard {ID} (scope: context)")
- If no standard references: use generic error contract (message visible, recovery option, loading cleared)

**Data Persistence**
"Should form data persist on cancel/back/reload?"
- Default: no persistence unless flow specifies

**Roles & Permissions**
"What user roles/permissions exist for this flow?"
- Default: use flow's User Types

**Test Data**
"What test data should be used for verification?"
- Default: ask user to provide or note as `[TEST-DATA-REQUIRED]`

### 12. Output Format

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
| ... | ... | ... | ... | ... |

## Form & Validation

| ID | Severity | Check | Expected Result | Source |
|----|----------|-------|-----------------|--------|
| CL-003 | [CRITICAL] | Email validation on blur | Invalid email → inline error "Invalid email format" | Happy Path Step 2 |
| ... | ... | ... | ... | ... |

## Submit & Success, Alternative Conditions, Error Handling, Accessibility

[Same table structure as above, one example row per section + ...]

Note: Analytics Events section is optional — only include if analytics tracking is critical to flow validation.

## Out of Scope

- [Items outside flow boundaries]

## Notes

- [Browser support, timing expectations, test data requirements]
```

### 13. Stage for Git

After creating file, run:
```bash
git add docs/checkLists/{flow-name}.md
```

### 14. Report

Output:
```
Checklist: docs/checkLists/{flow-name}.md
Items: X (Y critical, Z important, W optional)
Coverage: Goals (X), Alternatives (Y), Errors (Z), States (W)
Section Mapping: [sections mapped from flow]
```

## Rules

- Never invent requirements not in flow
- Binary only — Pass/Fail, no subjective terms
- **User-observable only** — no API/backend/database implementation details
- **Manual QA focus** — high-level UX validation, not test case granularity
- **Consolidate aggressively** — merge similar error scenarios, skip intermediate states
- Target 20-30 items for typical flow (40 max for complex flows)
- Include severity: [CRITICAL], [IMPORTANT], [OPTIONAL]
- Minimum coverage: entry, happy path, alternatives, consolidated error handling, success/navigation, basic accessibility
