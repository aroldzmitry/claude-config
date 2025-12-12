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

### 3. Normalize to User-Observable Assertions

Convert steps to **user-visible outcomes only**. Focus on high-level UX validation, not granular state checks.

**Good examples (manual QA level):**
- "User clicks login" → `CL-###: Login button visible and enabled`
- "API returns error" → `CL-###: Error message displayed with recovery option`
- "Data saves" → `CL-###: Success confirmation appears`
- "Account created" → `CL-###: User redirected to expected destination`

**Forbidden patterns:**
- ❌ Implementation details ("Backend returns 200 OK", "Database saves record")
- ❌ Intermediate UI states ("field focused", "validating state", "field filled")
- ❌ Duplicate error conditions (separate checks for network/500/race when behavior is identical)

**Consolidation rules:**
- Merge similar error scenarios → single "Error handling works correctly" check
- Skip intermediate states → focus on initial and final states only
- Combine redundant validations → one check per unique user outcome

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

From Negative Scenarios + Error UI Requirements, create **consolidated error checks**:
- Group similar error types (network/500/timeout) → single "Error UI displays correctly" check
- Only create separate items if error behavior differs (e.g., retry available vs. not)
- Standard error UI contract: message visible, recovery option (if applicable), loading cleared
- Skip redundant checks across error scenarios

### 7. Map to Component States (Reduced)

From Component Mapping section, create checks for **critical states only**:
- Initial/idle state (page load)
- Loading state (during async operations)
- Success state (completion confirmation)
- Error state (error display)
- Skip intermediate states: focused, filled, validating, disabled (unless critical to UX)
- Skip empty state unless explicitly mentioned as important in flow

### 8. Validation

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

## Submit & Success, Alternative Conditions, Error Handling, Accessibility

[Same table structure as above, one example row per section + ...]

Note: Analytics Events section is optional — only include if analytics tracking is critical to flow validation.

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
- Binary only — Pass/Fail, no subjective terms
- **User-observable only** — no API/backend/database implementation details
- **Manual QA focus** — high-level UX validation, not test case granularity
- **Consolidate aggressively** — merge similar error scenarios, skip intermediate states
- Target 20-30 items for typical flow (40 max for complex flows)
- Include severity: [CRITICAL], [IMPORTANT], [OPTIONAL]
- Minimum coverage: entry, happy path, alternatives, consolidated error handling, success/navigation, basic accessibility
