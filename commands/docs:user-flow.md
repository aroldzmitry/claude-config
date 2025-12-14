---
description: "Create comprehensive user flow documentation through semi-automatic interactive dialogue"
argument-hint: "<flow-description>: describe what user flow to document"
model: sonnet
allowed-tools: "Read, Glob, Grep, AskUserQuestion, Write, Bash, WebSearch, WebFetch"
---

# User Flow Generator

Create executable, testable user flow documentation by combining project context analysis with guided user input. Extracts shared system behaviors to reusable standards.

## Core Concepts

**User Flow** — documents user intention and domain-specific scenarios for achieving a goal.
**Shared Standard** — documents system-wide behaviors (error handling, loading, auth) that apply across multiple flows.

Agent must identify cross-flow patterns and extract them to Shared Standards, not duplicate inline.

## Input

`$ARGUMENTS` contains flow description. If empty → ask user.

## Process

1. Analyze project context (`.claude/CLAUDE.md`, existing flows, standards, codebase)
2. Determine mode: simple descriptions → auto mode, complex → controlled mode
3. Gather system boundaries (4 questions: product, user tasks, boundaries, external systems)
4. Controlled mode only: ask user to select goals + user types
5. Auto-generate content using evidence-first approach (search codebase before claiming implementation)
6. Normalize and deduplicate (extract shared behaviors to standards)
7. Consolidate patterns (merge redundant alternative path variations)
8. Run pre-write validation (output checklist, fix violations, confirm all pass)
9. Save flow and update indexes

## Modes

**Auto Mode** (simple flows): Agent extracts flow automatically from description + context. No additional questions except system boundaries.

**Controlled Mode** (complex flows): Agent asks user to select:
- Goals (from suggestions or custom)
- User types (check project docs first; if missing use defaults: Guest, New User, Active User, Restricted User)
Then auto-generates paths/scenarios for selected items.

## Generation Rules

### System Boundaries (Always Interactive)
Confirm with user:
1. Product and target users
2. User tasks to solve (not pages)
3. System responsibility boundaries
4. External systems involved (third-party integrations only: OAuth providers, SMTP, payment gateways, Plaid, etc. — NOT internal backend API, database, or infrastructure)

### Auto-Generation (All Modes)

For each goal, generate:

**Happy Path**: Observable user experience only - what user sees, does, and observes. NO backend operations, NO Contract statements, NO file paths.

**Alternative Paths**: Domain-specific errors, cancellations, edge cases with recovery.

**Negative Scenarios**: ONLY domain/business errors and flow-specific edge cases. Infrastructure errors → standard references with scope.

**UX Validation**: Clarity, state visibility, cancellability, confirmations.

**Component Mapping**: Generic UI element names (form, button, field), routes, UI states, test IDs. NO implementation class names.

Use web research for UX patterns (best practices, accessibility), NOT for inventing technical implementation details.

### Observable-Only Pattern

Happy Path sequences contain ONLY what user sees and does:
1. User action (clicks button, enters text, navigates)
2. Visible system response (page displays, button shows loading, message appears)
3. Observable state change (redirected to page, notification visible, field changes color)

Prohibited in sequences:
- Backend operations (validates, checks database, creates record, sends request)
- File paths or code references
- Component class names or implementation details
- Technical processes invisible to user

Implementation details belong in Implementation Notes section only.

### Flow Normalization (Mandatory Before Writing)

1. **Identify shared behaviors**: behaviors identical across multiple flows, infrastructure concerns, system reactions (not user intentions)
2. **Check standards registry** (`docs/standards/STANDARDS.md`): if matching standard exists, note ID for reference
3. **Extract or reference**: remove full definitions from flow, replace with standard ID reference, keep only domain-specific scenarios
4. **Create new standards** if needed: write to `docs/standards/{ID}-{name}.md`

### Pattern Consolidation (Mandatory Before Writing)

Before writing flow, scan Alternative Paths and Negative Scenarios:
1. Identify redundant variations describing same pattern (A1: field X empty, A2: field Y empty, A3: both empty)
2. Consolidate into single alternative describing pattern ("Required fields not filled")
3. Replace enumerated examples with pattern-based description
4. Keep only domain-specific variations that differ meaningfully

### Pre-Write Validation Checklist (Mandatory, Blocking)

Output checklist BEFORE using Write tool:

**Observable-Only:**
- Happy Path contains ONLY user-visible actions and responses
- NO backend operations in sequences
- NO file paths or code references in sequences
- Technical details ONLY in Implementation Notes section

**Sanity Checks (all MUST pass):**
1. Preconditions: only flow-blocking items (removed cross-flow)
2. External Systems: third-party only (removed backend/database/infra)
3. User Types: match preconditions (no contradictions)
4. Negative Scenarios: domain errors OR standard refs (no inline infra)
5. Cross-Flow: scenarios belong here (moved to correct flow if not)
6. Timing: sourced values only (no unsourced "within X seconds")
7. Infrastructure Errors: standard refs with scope (no inline descriptions)
8. Pattern Consolidation: no redundant variations (consolidated to patterns)

**Verbosity:**
- No parenthetical explanations: "Guest" not "Guest (unauthenticated)"
- No technical details in sequences: "User redirected to login" not "System validates JWT and redirects"
- No backend operations: "Success notification displays" not "Backend returns 201 and notification displays"

If violations found → fix → re-run checklist → confirm all pass → then Write.

## Output Format

File: `docs/userFlows/{flow-name}.md`

```markdown
# User Flow: {Goal Name}

## System Context
**Product**: [description]
**User Task**: [what user solves]
**Boundaries**: Start: [entry], End: [exit]
**External Systems**: [third-party integrations — omit line if none]

## Goals
- [verb-based goal 1]
- [verb-based goal 2]

## User Types
- Guest / Authenticated User / etc.

## Goal: {Goal Name}

### Happy Path
**Entry point**: [URL/button/location]
### Preconditions
- [Required auth/data/state]
**Sequence**:
1. [User action] → [System response] → [UI state change]
2. [User observes result]
**Success Criteria**:
- [Observable outcome]
- [Visible confirmation]

### Exit Paths
- Normal: [how flow completes]
- Cancel: [alternative exit]

### Alternative Paths
A1. [edge case] → [recovery]
A2. [cancellation] → [return point]

### Negative Scenarios
**Domain-Specific**
N1. [Invalid input] → [validation, recovery]
**Infrastructure**
Applies: Standard NET-001 (scope: form submission)

### UX Validation Checklist
- [x] Next action clear? [Yes/Explanation]
- [x] System state visible? [Yes/Explanation]
- [x] Safely cancellable? [Yes/Explanation]
- [x] Result confirmed? [Yes/Explanation]
- [x] No dead ends? [Yes/Explanation]

### Component Mapping
| Step | Route | Components | States | Test ID |
|------|-------|-----------|--------|---------|
| 1 | /login | Login form | idle | auth.login.form |
| 2 | /login | Email input field | input | auth.login.email-input |
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

1. **Update docs/userFlows/USER_FLOWS.md**
   - Create file if missing (with header: "# User Flows")
   - Add entry: `[Goal Name](./flow-name.md) — one-line summary`
   - If category section doesn't exist, create it

2. **Update docs/standards/STANDARDS.md**
   - Create file if missing (with header: "# Shared Standards")
   - Add section "## Available Standards" if missing
   - For each new standard created: `- {ID} [{Name}](./{ID}-{name}.md) — one-line description`
   - For reused standards: verify entry exists
   - Add/update section "## Standard Categories" grouping by type (Error Handling, Loading, Auth, etc.)

3. **Output Summary**
   - Path: `docs/userFlows/{flow-name}.md`
   - Goals documented: `[list]`
   - Shared standards used: `[list of standard IDs referenced]`
   - Shared standards created: `[list of new standard IDs with names]`

## Shared Standard Criteria

Behavior qualifies as Shared Standard if ALL apply:
- Identical across multiple flows
- Independent of user goal or domain context
- Independent of page/URL
- Describes system reaction (not user intention)
- Testable with same pattern across flows

Typical candidates: network/auth/server errors, loading states, empty states, permission denied, offline mode.

## Statement Types for Happy Path Sequences

**Observable** — ONLY type allowed in Happy Path sequences. User-visible UI behavior (messages, buttons, redirects, loading states).
- Good: "Validation error displays below email field"
- Good: "Submit button shows loading indicator"
- Good: "User redirected to login page"
- Bad: "Backend validates email format" (invisible to user)
- Bad: "System checks database for duplicate email" (backend operation)
- Bad: "POST request sent to /api/user" (technical implementation)

**Implementation Details** — Belongs ONLY in Implementation Notes section at end of document.
- Security implementation (encryption, hashing)
- Backend validation logic
- Database operations
- API endpoints and file paths
- Component class names

### Observable-Only Enforcement

Happy Path must be convertible to Playwright test steps:
1. Can tester see this on screen? → Observable, include it
2. Is this backend processing? → Remove from sequence
3. Is this technical detail? → Move to Implementation Notes
4. Does this have file path? → Remove from sequence

All technical verification belongs in Implementation Notes, never in sequences.

## Flow Sanity Checks - 7 Mandatory Checks

After generating content, BEFORE writing file, run checklist and fix violations:

**1. Preconditions**: Only include conditions without which flow cannot start.
- Fix: Remove preconditions belonging to other flows.
- Example violation: "Email service operational" in registration → belongs to login flow
- Test: Does this precondition prevent THIS flow's entry point from loading?

**2. External Systems**: Only third-party integrations (OAuth, SMTP, payment gateways, Plaid). Exclude internal backend API, database, infrastructure.
- Fix: Remove internal systems (PostgreSQL, Redis, backend API). If no real external systems exist, remove "External Systems" line from output.
- Example violation: "Backend REST API" or "PostgreSQL" in registration → internal implementation, not external
- Test: Is this a third-party service with its own authentication/API, or internal infrastructure?

**3. User Types**: Only types who can START this flow based on preconditions.
- Fix: Remove user types blocked by preconditions.
- Example violation: "Authenticated User" in registration → contradicts "not authenticated" precondition
- Test: Can this user type satisfy all preconditions?

**4. Negative Scenarios**: Only domain errors OR standard references.
- Fix: Replace technical details with standard refs (NET-001, SRV-001, AUTH-001).
- Example violation: "Session cookie not set" or "JavaScript disabled" → too granular, use standard
- Test: Is this a business rule violation OR covered by existing standard?

**5. Cross-Flow Ownership**: Scenarios belong to different flow? Move them.
- Fix: Keep only brief mention in Cross-Goal Notes.
- Example violation: "SMTP configuration details" in registration → belongs to email flow
- Test: Is this scenario's primary goal different from this flow's goal?

**6. Timing Promises**: No time values unless sourced from requirements.
- Fix: Remove unsourced timing; use "shows confirmation before redirect".
- Example violation: "within 2 seconds" without documented SLA or measurement
- Test: Is this timing value documented in project requirements or measured?

**7. Infrastructure Errors**: ONLY standard references with scope.
- Fix: Replace inline descriptions with "Applies: Standard NET-001 (scope: form submission)".
- Example violation: "Retry logic with exponential backoff" inline → reference standard with scope
- Test: Is this error about infrastructure/platform rather than business domain?

**8. Pattern Consolidation**: No redundant variations of same behavior.
- Fix: Consolidate A1/A2/A3 describing same pattern into single alternative.
- Example violation: A1: name empty, A2: email empty, A3: both empty → consolidate to "Required fields not filled"
- Test: Do multiple alternatives describe variations of same validation/UI pattern?

## Selective User Questions

Use `AskUserQuestion` ONLY for Assumption-class statements found in:
- Preconditions (uncertain prerequisite)
- External Systems (unverified integration)
- Negative Scenarios (unclear business rule)
- Success Criteria timing (no SLA source)

For other uncertainties, convert to Observable or generalize.

## Rules (Priority Order)

1. Never guess system boundaries → confirm with user
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
15. Technical implementation details belong ONLY in Implementation Notes section
16. Infrastructure standard references must include scope: "Applies: Standard NET-001 (scope: form submission)"
17. Minimize verbosity: no parenthetical explanations, no technical details in sequences
18. System Boundaries questions are mandatory, non-negotiable
19. User Types section: only list types who can START this flow (not all users in system)
20. Alternative Paths: domain-specific edge cases, cancellations, user recoveries
21. Negative Scenarios in flow: only domain/business errors (infrastructure → standards)
22. Cross-Goal Notes: interactions between goals, shared state, dependencies
23. Component Mapping: use generic UI element names (form, button, field), NOT implementation class names
24. UX Validation Checklist: all 5 must pass before marking flow complete
25. Test each generated flow becomes actual Playwright test to verify happy path accuracy
