---
description: "Create comprehensive user flow documentation through semi-automatic interactive dialogue"
argument-hint: "<flow-description>: describe what user flow to document"
model: sonnet
allowed-tools: "Read, Grep, Glob, AskUserQuestion, Write, Bash, WebSearch, WebFetch"
---

# User Flow Generator

Create executable, testable user flow documentation by combining project context analysis with guided user input. Extracts shared system behaviors to reusable standards.

## Core Concepts

User Flow — documents user intention and domain-specific scenarios for achieving a goal.
Shared Standard — documents system-wide behaviors (error handling, loading, auth) that apply across multiple flows.

Agent must identify cross-flow patterns and extract them to Shared Standards, not duplicate inline.

## Input

`$ARGUMENTS` contains flow description. If empty → ask user.

## Tool Usage Rules

Read Tool: For docs/ directory (existing flows, standards, project documentation) and project source code when needed.

Project Questions: For implementation details (validation rules, business logic, API contracts, component behavior), use Grep/Read to search codebase directly.

## Process

1. Analyze project context (`.claude/CLAUDE.md`, existing flows/standards via Read, project structure via Grep/Read)
2. Determine mode: simple descriptions → auto mode, complex → controlled mode
3. Gather system boundaries (check docs first, ask only if unclear)
4. Controlled mode only: ask user to select goals + user types
5. Auto-generate content using evidence-first approach (use Grep/Read for codebase questions)
6. Extract field validation rules (use Grep/Read for validation code analysis, update `docs/standards/FIELD-VALIDATIONS.md`)
7. Normalize and deduplicate (extract shared behaviors to standards)
8. Consolidate patterns (merge redundant alternative path variations)
9. Run pre-write validation (output checklist, fix violations, confirm all pass)
10. Evaluate UX checklist, show multi-select for UX improvements (see UX Improvement Selection)
11. Run completeness validation, show multi-select for implementation gaps (see Implementation Gaps Selection)
12. Save flow and update indexes (ONLY template sections, no TBD Items)

## Modes

Auto Mode (simple flows): Agent extracts flow automatically from description + context. No additional questions except system boundaries.

Controlled Mode (complex flows): Agent asks user to select:

- Goals (from suggestions or custom)
- User types (check project docs first; if missing use defaults: Guest, New User, Active User, Restricted User)
  Then auto-generates paths/scenarios for selected items.

## Generation Rules

### System Boundaries

Check project documentation (README.md, CLAUDE.md) first. Only ask questions when information is unclear.

Product Context (ask only if unclear from docs):
1. Product and target users

Flow-Specific (always confirm):
2. User tasks to solve (not pages)
3. System responsibility boundaries
4. External systems involved (third-party integrations only: OAuth providers, SMTP, payment gateways, Plaid, etc. — NOT internal backend API, database, or infrastructure)

### Auto-Generation (All Modes)

Single-Form Consolidation: When multiple goals share same page, form, and submit button → merge into one Goal section. List all goals in "## Goals" but create single "## Goal: [Primary Action]" section combining all field interactions.

For each goal, generate:

Happy Path: Observable user experience only - what user sees, does, and observes. NO backend operations, NO Contract statements, NO file paths.

Alternative Paths: Domain-specific errors, cancellations, edge cases with recovery.

Negative Scenarios: ONLY domain/business errors and flow-specific edge cases. Infrastructure errors → standard references with scope.

UX Validation: Clarity, state visibility, cancellability, confirmations.

Component Mapping: Generic UI element names (form, button, field), routes, UI states, test IDs. NO implementation class names.

Use web research for UX patterns (best practices, accessibility), NOT for inventing technical implementation details.

### Observable-Only Pattern

Happy Path sequences contain ONLY what user sees and does:

1. User action (clicks button, enters text, navigates)
2. Visible system response (page displays, button shows loading, message appears)
3. Observable state change (redirected to page, notification visible, field changes color)

### Flow Normalization (Mandatory Before Writing)

1. **Identify shared behaviors**: behaviors identical across multiple flows, infrastructure concerns, system reactions (not user intentions)
2. **Check standards registry** (`docs/standards/STANDARDS.md`): if matching standard exists, note ID for reference
3. **Extract or reference**: remove full definitions from flow, replace with standard ID reference, keep only domain-specific scenarios
4. **Create new standards** if needed: write to `docs/standards/{ID}-{name}.md`

### Field Validation Extraction (Mandatory for Form Flows)

When flow contains form inputs, extract validation rules:

1. Use Grep to find validation rules for [field names] in [flow context] (server-side validators, client-side schemas, error messages)
2. Parse search results to identify rules per field: format (email, phone), length (min/max), pattern (regex), required/optional
3. Read existing `docs/standards/FIELD-VALIDATIONS.md` to check if field already documented
4. Add/update field entries in FIELD-VALIDATIONS.md with: field name, validation rules, error messages, examples
5. In flow document "Form Fields" section: reference field with required/optional status and link to FIELD-VALIDATIONS.md anchor
6. In flow document "Negative Scenarios": add section "Field Validation" with link to FIELD-VALIDATIONS.md, remove inline validation details

### Pattern Consolidation (Mandatory Before Writing)

Before writing flow, scan Alternative Paths and Negative Scenarios:

1. Identify redundant variations describing same pattern (A1: field X empty, A2: field Y empty, A3: both empty)
2. Consolidate into single alternative describing pattern ("Required fields not filled")
3. Replace enumerated examples with pattern-based description
4. Keep only domain-specific variations that differ meaningfully

### UX Improvement Selection (Mandatory Before Writing)

After completeness validation, evaluate UX criteria and capture user selection:

1. Evaluate 5 UX criteria against gathered implementation details:
   - Next action clear? (buttons visible, labels descriptive, CTAs obvious)
   - System state visible? (loading spinners, success states, error messages)
   - Safely cancellable? (close button, ESC key, unsaved changes warning)
   - Result confirmed? (toast notification, list update, redirect, visible confirmation)
   - No dead ends? (always next action available, no blocking states)

2. Classify each criterion: Yes (fully met), Partial (works but incomplete), No (missing/broken)

3. Extract improvements for Partial/No items:
   - Loading state missing → "Add loading spinner/disabled button during form submission"
   - Unsaved changes warning missing → "Add confirmation dialog when closing sidebar with unsaved data"
   - Success feedback missing → "Add toast notification after successful create/update/delete"
   - Error visibility missing → "Show inline error messages for validation failures"
   - Cancellation unclear → "Add cancel button with ESC keyboard shortcut"
   - Next action unclear → "Add visible CTA button or next step indicator"

4. Use AskUserQuestion with multiSelect=true:
   - Header: "UX Improvements"
   - Question: "Which UX improvements should be included as requirements in this flow?"
   - Options: List of improvements extracted in step 3
   - Each option: label (brief improvement), description (what will be implemented)

5. Capture selected improvements and integrate into flow generation:
   - Happy Path: Weave selected improvements into normal sequence ("Submit → Loading spinner → Success toast → Redirect")
   - Alternative Paths: Add paths for selected improvements ("A3. User closes with unsaved changes → Confirmation dialog → User confirms/cancels")
   - UI State Behaviors: Document selected states (loading, disabled, etc.)

6. Unselected items: Do NOT document. Current UX is acceptable.

### Implementation Gaps Selection (Mandatory Before Writing)

After UX improvements, run completeness check and capture user selection:

1. Query codebase via Grep/Read for 4 categories:
   - Constraints: field limits, file size limits, list maximums
   - UI States: button disabled conditions, loading states, validation timing
   - Confirmations: unsaved changes warnings, destructive action dialogs
   - Security: re-auth requirements, session handling

2. Classify findings: implemented vs not-implemented

3. For not-implemented items, use AskUserQuestion with multiSelect=true:
   - Header: "Implementation Gaps"
   - Question: "Which missing behaviors should be documented as requirements?"
   - Options: List of not-implemented behaviors
   - Each option: label (brief gap), description (what would be implemented)

4. Integrate selected gaps into flow:
   - Alternative Paths: Add paths for selected behaviors
   - UI State Behaviors: Document selected states
   - Negative Scenarios: Add domain-specific error handling

5. Unselected items: Do NOT document. Current implementation is acceptable.

### Pre-Write Validation Checklist (Mandatory, Blocking)

Output checklist BEFORE using Write tool:

Observable-Only:

- Happy Path contains ONLY user-visible actions and responses

Field Validation (for form flows):

- Form Fields section present with all input fields listed
- Each field links to FIELD-VALIDATIONS.md anchor
- Each field shows required/optional status
- FIELD-VALIDATIONS.md updated with all field validation rules
- Negative Scenarios has "Field Validation" section linking to FIELD-VALIDATIONS.md
- NO inline validation details in flow (moved to FIELD-VALIDATIONS.md)

Sanity Checks (all MUST pass):

1. Preconditions: only flow-blocking items (removed cross-flow)
2. External Systems: third-party only (removed backend/database/infra)
3. User Types: match preconditions (no contradictions)
4. Negative Scenarios: domain errors OR standard refs (no inline infra or field validation)
5. Cross-Flow: scenarios belong here (moved to correct flow if not)
6. Timing: sourced values only (no unsourced "within X seconds")
7. Infrastructure Errors: standard refs with scope (no inline descriptions)
8. Pattern Consolidation: no redundant variations (consolidated to patterns)

Verbosity:

- No parenthetical explanations: "Guest" not "Guest (unauthenticated)"
- No technical details in sequences: "User redirected to login" not "System validates JWT and redirects"
- No backend operations: "Success notification displays" not "Backend returns 201 and notification displays"

If violations found → fix → re-run checklist → confirm all pass → then Write.

## Output Format

File: `docs/{flow-name}/userFlows.md`

```markdown
# User Flow: {Goal Name}

## System Context

Product: [description]
User Task: [what user solves]
Boundaries: Start: [entry], End: [exit]
External Systems: [third-party integrations — omit line if none]

## Goals

- [verb-based goal 1]
- [verb-based goal 2]

## User Types

- Guest / Authenticated User / etc.

## Goal: {Goal Name}

[For multi-step or multi-page flows: one Goal section per distinct page/action]
[For single-form flows: one Goal section combining all field interactions]

### Happy Path

Entry point: [URL/button/location]

#### Preconditions

- [Required auth/data/state]

Sequence:

[For single-form: list all field interactions in one sequence]

1. [Field 1 interaction] → [response]
2. [Field 2 interaction] → [response]
3. [Submit action] → [loading] → [success] → [all changes visible]

[For multi-step: separate sequences per page/action]

1. [User action] → [System response] → [UI state change]
2. [User observes result]

Success Criteria:

- [Observable outcomes for all fields/actions]
- [Visible confirmation]

### Form Fields

- Name field: required, validation: [FIELD-VALIDATIONS#field-name](../standards/FIELD-VALIDATIONS.md#field-name)
- Email field: required, validation: [FIELD-VALIDATIONS#email](../standards/FIELD-VALIDATIONS.md#email)

### Exit Paths

- Normal: [how flow completes]
- Cancel: [alternative exit]

### Alternative Paths

A1. [edge case] → [recovery]
A2. [cancellation] → [return point]

### Negative Scenarios

Field Validation
See [Field Validations](../standards/FIELD-VALIDATIONS.md) for all field-level validation errors (format, required, length, etc.)

Domain-Specific
N1. [Business rule violation] → [recovery]

Infrastructure
Applies: Standard NET-001 (scope: form submission)

### Component Mapping

| Step | Route  | Components        | States | Test ID                |
| ---- | ------ | ----------------- | ------ | ---------------------- |
| 1    | /login | Login form        | idle   | auth.login.form        |
| 2    | /login | Email input field | input  | auth.login.email-input |

### UI State Behaviors

Element Name:
- State: [condition when state applies]
- Behavior: [what user observes]
```

Field Validation Registry: `docs/standards/FIELD-VALIDATIONS.md`

```markdown
# Field Validation Rules

Central registry for all form field validation rules. Referenced by user flows to avoid duplication.

## Email

Validation Rules:

- Format: Valid email format (RFC 5322)
- Required: Context-dependent (see flow)
- Client-side: None (submit button disabled when empty)
- Server-side: express-validator `isEmail()`

Error Messages:

- Empty: "Email is required"
- Invalid format: Default express-validator message

Examples:

- Valid: user@example.com
- Invalid: invalidemail, test@, user@domain

Flows using this field: 01-register, 02-login, 03-edit-profile
```

Shared Standard file: `docs/standards/{ID}-{name}.md`

```markdown
# Standard {ID}: {Name}

## Scope

Applies to: [all flows | specific context]

## Behavior Definition

### Trigger Conditions

- [When applies]

### System Response

1. [Step 1]
2. [Step 2]

### UI Requirements

- [Visual element]
- [Interaction]

### Exit Conditions

- [How resolved]

## Test Criteria

- [Observable behavior]

## Examples

- Flow X: [applies how]

## Related Standards

- [Related standard ID]
```

## Final Steps

1. **Update docs/USER_FLOWS.md**

   - Create file if missing (with header: "# User Flows")
   - Add entry: `[Goal Name](./{flow-name}/userFlows.md) — one-line summary`
   - If category section doesn't exist, create it

2. **Update docs/standards/FIELD-VALIDATIONS.md**

   - Create file if missing (use template above)
   - For each field in flow: check if field section exists
   - Add new field sections or update existing with discovered validation rules
   - Update "Flows using this field" list with current flow number

3. **Update docs/standards/STANDARDS.md**

   - Create file if missing (with header: "# Shared Standards")
   - Add section "## Available Standards" if missing
   - Ensure FIELD-VALIDATIONS.md is listed: `- [Field Validation Rules](./FIELD-VALIDATIONS.md) — Central registry for form field validation`
   - For each new standard created: `- {ID} [{Name}](./{ID}-{name}.md) — one-line description`
   - For reused standards: verify entry exists
   - Add/update section "## Standard Categories" grouping by type (Error Handling, Loading, Auth, etc.)

4. **Format and Stage Files**

   - Collect created/modified files: flow, indexes, field validations (if updated), standards (if created)
   - Format: `npx prettier --write [all collected files]`
   - Stage: `git add [all formatted files]`

5. **Output Summary**
   - Path: `docs/{flow-name}/userFlows.md`
   - Goals documented: `[list]`
   - Field validations: `[list of fields added/updated in FIELD-VALIDATIONS.md]`
   - UX improvements + implementation gaps integrated: `[list of selected items woven into flow]`
   - Shared standards used: `[list of standard IDs referenced]`
   - Shared standards created: `[list of new standard IDs with names]`
   - Files staged: `[list of git-added files]`

## Rules (Priority Order)

1. Check docs for product context first, ask only if unclear; always confirm flow-specific boundaries (tasks, boundaries, external systems)
2. Recommend mode based on complexity: simple → auto, complex → controlled
3. Each goal must be verb-based (register, login, find, compare, etc.)
4. Every scenario must return user to goal or safe state
5. Happy path must be testable (→ can become Playwright test)
6. Normalization step is MANDATORY, never skip
7. Pre-Write Validation is BLOCKING — output checklist, fix violations, confirm all pass before Write
8. Check existing flows AND standards to avoid duplicates
9. User Flow MUST NOT contain full definitions of shared behaviors
10. User Flow MAY ONLY reference standards by ID and name with scope
11. Before creating new standard, check `docs/standards/STANDARDS.md` for existing match
12. Negative Scenarios contain ONLY domain errors, business violations, flow-specific edge cases
13. Infrastructure errors (network, auth, server) ALWAYS reference standards with scope, never inline
14. Happy Path sequences contain ONLY Observable statements — NO backend operations, NO file paths
15. NO technical implementation details anywhere in document
16. Infrastructure standard references must include scope: "Applies: Standard NET-001 (scope: form submission)"
17. Minimize verbosity: no parenthetical explanations, no technical details in sequences
18. Flow-specific system boundaries (tasks, boundaries, external systems) are mandatory; product context only asked if docs unclear
19. User Types section: only list types who can START this flow (not all users in system)
20. Alternative Paths: domain-specific edge cases, cancellations, user recoveries
21. Negative Scenarios in flow: only domain/business errors (infrastructure → standards)
22. Cross-Goal Notes: interactions between goals, shared state, dependencies
23. Component Mapping: use generic UI element names (form, button, field), NOT implementation class names
24. UX Validation: evaluate 5 criteria internally, extract improvements for Partial/No items, show multi-select to user, integrate selected improvements into flow description (Happy Path, Alternative Paths, UI State Behaviors)
25. Test each generated flow becomes actual Playwright test to verify happy path accuracy
26. Single-form consolidation: Multiple goals sharing same page/form/button → merge into one Goal section combining all interactions
27. Output document contains ONLY sections from Output Format template. No TBD Items, no custom sections.
28. Unselected improvements/gaps = current implementation acceptable. Do not document as missing.
29. No decorative markdown formatting (bold, italic, emoji) — output must match template format exactly
