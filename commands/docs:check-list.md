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

Convert Happy Path steps to **user-visible outcomes only**. Apply Observable-Only Pattern (from docs:user-flow).

**Observable — ONLY type allowed**
User-visible UI behavior (messages, buttons, redirects, loading states).
- Good: "Validation error displays below email field"
- Good: "Submit button shows loading indicator"
- Good: "User redirected to login page"
- Bad: "Backend validates email format" (invisible to user)
- Bad: "System checks database for duplicate email" (backend operation)
- Bad: "POST request sent to /api/user" (technical implementation)

**Conversion test (4 questions):**
1. Can tester see this on screen? → Observable, include it
2. Is this backend processing? → Remove from checklist
3. Is this technical detail? → Remove from checklist
4. Does this have file path? → Remove from checklist

**Forbidden patterns:**
- ❌ Implementation details ("Backend returns 200 OK", "Database saves record", "API status 201")
- ❌ Intermediate UI states ("field focused", "validating state", "field filled") unless critical
- ❌ Duplicate error conditions (separate checks for network/500/race when behavior identical)
- ❌ Backend operations ("validates credentials", "checks database", "sends request")
- ❌ File paths or code references ("LoginForm.tsx", "src/api/auth.ts")
- ❌ Component implementation names ("AuthProvider", "useLoginMutation hook")

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

**Consolidation Guidelines (Aggressive Merging Required):**

Pattern: Multiple alternatives describing same UI behavior → single check.

Example 1 — Field Validation:
- Before: A1: name empty → error, A2: email empty → error, A3: both empty → error
- After: CL-###: Required field validation displays inline errors (see FIELD-VALIDATIONS.md)

Example 2 — Infrastructure Errors:
- Before: N1: network timeout → retry, N2: 500 error → retry, N3: race condition → retry
- After: CL-###: Error handling follows Standard NET-001 (scope: form submission)

Example 3 — Similar User Actions:
- Before: CL-001: Cancel button visible, CL-002: Cancel button enabled, CL-003: Cancel button clickable
- After: CL-001: Cancel button visible and functional

Rules:
- Merge 3+ similar error scenarios → single check referencing standard or pattern
- Skip intermediate states → only initial and final states
- Combine redundant validations → one check per unique user outcome
- If 5+ items describe same UI contract → consolidate to 1-2 items max

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

### 10. Pre-Output Validation (Mandatory, Blocking)

Output validation checklist BEFORE creating checklist file. If violations found → fix → re-run validation → confirm all pass → then proceed to output.

**Validation Checklist:**

1. **Observable-Only Enforcement**
   - Every item is user-visible (no backend ops, no API codes, no database states)
   - NO file paths or code references
   - NO component implementation details (class names, hook names)
   - Test: "Can user see/experience this without dev tools?" If no → violation
   - Example violation: "CL-005: Backend returns 201 status" → replace with "CL-005: Success message displays"

2. **Item Count Target**
   - Total items: 20-30 for typical flow (40 max for complex)
   - If >40 items → aggressive consolidation required
   - Test: Count items per section, identify merge candidates
   - Example violation: 15 error items → consolidate to 2-3 using standard references

3. **Coverage Completeness**
   - Every Goal has ≥1 item
   - Every CRITICAL Alternative Path has ≥1 item
   - Error scenarios consolidated (2-3 checks total, not one per scenario)
   - Component states: only critical (idle/loading/success/error), skip intermediate
   - Test: Check coverage matrix against flow sections
   - Example violation: Goal "Create account" has no success check → add success navigation item

4. **Traceability**
   - Every item traces to specific flow section via Source column
   - NO invented requirements (not in flow)
   - If untraceable → mark `[NEEDS-CLARIFICATION]` and ask user
   - Test: For each item, find matching flow section reference
   - Example violation: "CL-020: Password strength meter visible" but flow has no password field → remove or clarify

5. **Binary Assertions Only**
   - Every item is Pass/Fail (no subjective terms without criteria)
   - "Smooth" fails unless defined as "<200ms animation"
   - "Fast" fails unless defined with timing threshold
   - Test: Scan for subjective terms (smooth, fast, clean, intuitive, seamless)
   - Example violation: "CL-012: Form loads smoothly" → replace with "CL-012: Form renders within 1s"

6. **Consolidation Applied**
   - No redundant variations describing same pattern (see Consolidation Guidelines)
   - No duplicate checks across sections
   - Infrastructure errors → standard references only
   - Test: Identify items with similar expected results, merge if UI contract identical
   - Example violation: CL-015/016/017 all check "error message visible" for different errors → merge to "Error UI follows Standard EH-001"

7. **Severity Assigned**
   - Every item has [CRITICAL], [IMPORTANT], or [OPTIONAL]
   - CRITICAL = flow cannot complete without this (entry, happy path success, critical errors)
   - IMPORTANT = common user need or historically flaky
   - OPTIONAL = nice-to-have (analytics, edge error messages)
   - Test: Verify every row has severity tag
   - Example violation: Missing severity → assign based on impact to flow completion

8. **External Systems Scope**
   - Flow's External Systems section informs boundaries but does NOT become checklist items
   - External system integration errors → reference standards or domain-specific checks
   - Test: Ensure no items like "CL-030: SMTP server reachable" (infrastructure, not user-observable)
   - Example violation: "CL-025: Plaid API responds" → replace with "CL-025: Bank connection flow completes or shows error"

If violations found → fix violations → re-run all 8 checks → confirm all pass → proceed to output.

### 11. External Systems Warning

Flow's System Context may list External Systems (OAuth, SMTP, Plaid, payment gateways, etc.).

**How to handle:**
- External systems inform scope and boundaries (what integrations exist)
- They do NOT become standalone checklist items
- Integration errors → reference domain-specific error checks or standards
- User-observable integration outcomes only

**Examples:**
- Flow lists "External Systems: Google OAuth"
  - Good: CL-015: Google login button visible on login page
  - Good: CL-016: OAuth flow completes or shows error message
  - Bad: CL-017: Google OAuth API responds with 200 status (backend, not observable)

- Flow lists "External Systems: Stripe"
  - Good: CL-020: Payment form accepts card input
  - Good: CL-021: Payment success/failure message displays
  - Bad: CL-022: Stripe API webhook received (backend event, not user-visible)

### 12. Ask Questions (Only When Needed)

Use `AskUserQuestion` ONLY if checklist would become speculation without answer. Most questions have safe defaults — use them.

Ask only for:

**Browser/Device Support** (if flow mentions specific platforms or user reports browser issues)
"Which browsers and breakpoints must this flow support?"
- Default: Chrome/Firefox/Safari desktop + mobile (375px, 1280px)

**UX Metrics** (if flow has timing requirements or SLA documented)
"What are timing expectations for loading states?"
- Default: <3s for data fetch, <1s for navigation

**Error Text Contract** (only if flow's Negative Scenarios lack standard references AND domain errors unclear)
"Where are error messages documented?"
- Default: check flow's Negative Scenarios for standard references (format: "Applies: Standard {ID} (scope: context)")
- If no standard references: use generic error contract (message visible, recovery option, loading cleared)

**Data Persistence** (only if flow mentions draft/autosave or user explicitly asks)
"Should form data persist on cancel/back/reload?"
- Default: no persistence unless flow specifies

**Roles & Permissions** (only if flow's User Types conflict or are missing)
"What user roles/permissions exist for this flow?"
- Default: use flow's User Types section

**Test Data** (only if specific data values affect flow outcome)
"What test data should be used for verification?"
- Default: note as `[TEST-DATA-REQUIRED]` in Notes section

Do NOT ask about:
- External Systems (use flow's System Context)
- Field validations (use flow's Form Fields section + FIELD-VALIDATIONS.md)
- Error standards (use flow's Negative Scenarios standard references)
- Happy path steps (extract from flow's Happy Path section)

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

## Rules (Priority Order)

**Extraction Rules**
1. Extract ONLY from flow document — never invent requirements
2. Every item must be user-observable (testable without dev tools)
3. Every item must be binary (Pass/Fail, no subjective terms)
4. Every item must trace to flow section (Happy Path Step X, Alternative A2, etc.)

**Observable-Only Rules**
5. NO backend operations ("validates", "checks database", "sends request")
6. NO API implementation details (status codes, endpoints, request/response structure)
7. NO file paths or code references ("LoginForm.tsx", "src/api")
8. NO component implementation names (class names, hook names, provider names)
9. Apply 4-question test: Can user see it? Backend processing? Technical detail? File path?

**Consolidation Rules**
10. Merge 3+ similar scenarios → single check (see Consolidation Guidelines)
11. Infrastructure errors → standard references (not inline descriptions)
12. Skip intermediate states (focused, filled, validating) → only initial/loading/success/error
13. One check per unique user outcome (not one per variation)
14. Target 20-30 items (40 max); if >40 → aggressive consolidation required

**Scope Rules**
15. External Systems inform boundaries but are NOT checklist items
16. Integration errors → user-observable outcomes only (not API reachability)
17. Out-of-scope items → separate section, not mixed with checks
18. Flow boundaries (System Context) define what to include/exclude

**Priority Rules**
19. CRITICAL = flow cannot complete without (entry, happy path success, critical errors)
20. IMPORTANT = common user need or historically flaky
21. OPTIONAL = nice-to-have (analytics, edge error messages, extra validation)
22. Every item MUST have severity tag

**Coverage Rules**
23. Every Goal ≥1 item (success criteria check)
24. Every CRITICAL Alternative ≥1 item
25. Error scenarios consolidated (2-3 total, not one per error)
26. Component states: only critical (idle/loading/success/error)

**Structure Rules**
27. Source column required (trace to flow section)
28. Severity column required ([CRITICAL]/[IMPORTANT]/[OPTIONAL])
29. Expected Result must be observable UI behavior
30. Section grouping: Page Load, Form, Submit, Success, Alternatives, Errors, Accessibility

**Validation Rules (Blocking)**
31. Pre-Output Validation is MANDATORY — 8 checks must pass before creating file
32. If violations found → fix → re-run validation → confirm pass → then output
33. Never skip validation steps
34. Report validation status in output summary
