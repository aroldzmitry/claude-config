---
description: "Create comprehensive user flow documentation through semi-automatic interactive dialogue"
argument-hint: "<flow-description>: describe what user flow to document"
model: sonnet
allowed-tools: "Read, Glob, Grep, AskUserQuestion, Write, Bash, WebSearch, WebFetch"
---

# User Flow Generator

Create executable, testable user flow documentation by combining project context analysis with guided user input. Extracts shared system behaviors to reusable standards.

## Conceptual Model

**User Flow** — documents user intention and domain-specific scenarios for achieving a goal
**Shared Standard** — documents system-wide behaviors (error handling, loading, auth) that apply across multiple flows

Agent must identify cross-flow patterns and extract them to Shared Standards, not duplicate inline.

## Input

`$ARGUMENTS` contains initial description (what flow to document). If empty → ask user.

## Process

1. **Analyze project** — Read `.claude/CLAUDE.md`, existing flows/standards, codebase patterns
2. **Determine mode** — Analyze description complexity; recommend auto/controlled mode
3. **Gather system boundaries** — Always ask/confirm (4 questions)
4. **Controlled mode only** — Ask user to select goals + user types
5. **Auto-generate content** — Use evidence-first approach: search codebase BEFORE writing technical details
6. **Normalize and deduplicate** — Extract shared behaviors to standards (mandatory)
7. **Pre-Write Validation** — Output checklist, fix violations, confirm all pass (BLOCKING)
8. **Save flow** — Write to `docs/userFlows/{name}.md`
9. **Update indexes** — Update `docs/userFlows/USER_FLOWS.md` and `docs/standards/STANDARDS.md`

## Modes

### Auto Mode (Simple Flows)
- User provides description
- Agent extracts all 9-step flow automatically from description + project context
- No additional questions (except system boundaries confirmation)

### Controlled Mode (Complex Flows)
- User provides description
- Agent asks user to select:
  - Goals (from suggestions or custom)
  - User types (from project or defaults)
- Agent auto-generates paths/scenarios for selected items

## Step-by-Step Logic

### Step 1: System Boundaries (Always Interactive)
Ask user or confirm:
1. What is this product and who is it for?
2. What tasks does the user come to solve? (not pages)
3. Where does the site's responsibility start and end?
4. What external systems are involved? (auth, payments, email, etc.)

### Step 3: User Types (Controlled Mode Only)
- Check project docs for existing user type definitions
- If found: suggest those
- If not: suggest defaults (Guest, New User, Active User, Restricted User)
- User confirms or customizes

### Step 3: User Goals (Controlled Mode Only)
- Analyze project flows + description
- Suggest 3-5 verb-based goals
- User selects + adds custom if needed

### Steps 2, 4-5: Auto-Generation (All Modes)

**Evidence-First Pattern**: Before claiming any technical implementation detail:
1. Search codebase with `Grep` for relevant patterns (auth mechanism, validation logic, session handling)
2. Read found files to verify behavior matches claim
3. If verified → cite as Contract statement with file reference
4. If not found → convert to Observable UI behavior OR ask user

For each selected goal (controlled) or inferred goal (auto):
- Generate happy path (entry point → steps → success criteria)
  - Focus on Observable user experience
  - Add Contract statements only when verified in codebase
- Generate alternative paths (domain-specific errors, cancellations, edge cases)
  - Domain logic based on business rules found in code/docs
- Generate negative scenarios (ONLY domain/business errors)
  - Infrastructure errors handled via standard references (not inline)
- Validate UX completeness (clarity, state visibility, cancellability, confirmations)
- Map to components (pages, routes, component states, analytics events)
  - Verify component names/paths exist in codebase

Use web research for UX patterns, NOT for inventing technical implementation details.

### Step 6: Flow Normalization and Deduplication (Mandatory)

Agent MUST perform before saving flow:

1. **Identify shared behaviors** in generated content:
   - Behaviors identical across multiple flows
   - Not dependent on user goal or domain context
   - System reactions, not user intentions
   - Infrastructure concerns (network, auth, errors)

2. **Check standards registry** (`docs/standards/STANDARDS.md`):
   - If matching standard exists → note its ID for reference
   - If no match → propose creating new standard

3. **Extract or reference**:
   - Remove full definitions from flow content
   - Replace with reference: "Error handling: see Standard EH-001"
   - Keep only domain-specific scenarios in flow

4. **Create new standards** if needed:
   - Write to `docs/standards/{ID}-{name}.md`
   - Follow Shared Standard format (see Output Format)

This step is NOT optional. Agent must complete normalization before proceeding to Step 7.

### Step 7: Flow Sanity Checks (Mandatory Pre-Write Validation)

Agent MUST output validation checklist BEFORE using Write tool. Format:

```markdown
## Pre-Write Validation Checklist

**Evidence-First:**
- [ ] All Contract statements cite file paths (searched with Grep/Read)
- [ ] No Assumption statements without source
- [ ] Technical details converted to Observable OR verified in codebase

**Sanity Checks (all 7 MUST pass):**
- [ ] 1. Preconditions: only flow-blocking items (removed cross-flow)
- [ ] 2. External Systems: codebase-verified only (removed infra like PostgreSQL/Redis)
- [ ] 3. User Types: match preconditions (removed contradictions)
- [ ] 4. Negative Scenarios: domain errors OR standard refs (no inline infra)
- [ ] 5. Cross-Flow: scenarios belong here (moved others to correct flow)
- [ ] 6. Timing: sourced values only (removed unsourced "within X seconds")
- [ ] 7. Infra Errors: standard refs with scope (no inline descriptions)

**Verbosity:**
- [ ] No parenthetical explanations: "Guest" not "Guest (unauthenticated)"
- [ ] No long notes: "None" not "None (explanation...)"
- [ ] No technical details in Observable: "not authenticated" not "(no valid JWT token)"

**Status:** ✅ All checks passed / ⚠️ Violations found (fixing...)
```

If violations found → fix → re-run checklist → confirm all pass → then Write.

## Output Format

File: `docs/userFlows/{flow-name}.md`

```markdown
# User Flow: {Goal Name}

## System Context
[Product, user tasks, boundaries, external systems - from Step 1]

## Goals
- [goal 1]
- [goal 2]

## User Types
- Guest
- New User
- Active User
- Restricted User

## Goal: {Goal 1}

### Happy Path

**Entry point**: [URL/button/CTA]

### Preconditions
- [Authentication status required]
- [Data or entities that must exist]
- [UI state before starting (page loaded, etc.)]

**Sequence**:
1. [user action] → [system action] → [UI state reflects change] → [result]
2. [user sees/receives feedback]
3. ...

Success criteria:
- [User-observable outcome with timing (e.g., "within 3 seconds")]
- [Visible confirmation elements user can identify]
- [Data persisted or action completed]

### Exit Paths
- [Normal exit: how user leaves this flow]
- [Alternative exit: modal/sidebar closes]
- [Error exit: if something goes wrong]

### Alternative Paths
A1. [scenario] → [recovery path]
A2. [cancellation] → [return point]
A3. [edge case] → [handling]

### Negative Scenarios

**Domain-Specific**
N1. [Invalid input format] → [validation message, recovery path]
N2. [Business rule violation: quota exceeded] → [upgrade prompt or alternative]
N3. [Flow-specific edge case: partial completion] → [resume or restart option]

**Infrastructure** (references only)
- Standard NET-001 Network Errors (scope: form submission, data fetch)
- Standard SRV-001 Server Errors (scope: registration API)
- Standard AUTH-001 Session Expiration (scope: form interaction)

### UX Validation Checklist
- [x] Next action clear without hints? [Explanation]
- [x] System state visible to user? [Explanation]
- [x] Action safely cancellable? [Explanation]
- [x] Result confirmed to user? [Explanation]
- [x] No dead ends? [Explanation]

### Component Mapping
| Step | Page/Route | Components | States | Analytics |
|------|-----------|-----------|--------|-----------|
| 1 | /login | LoginForm, Alert | loading, error, success | page_view, form_start |
| 2 | /dashboard | Dashboard, Header | ready, loading | page_view, login_success |

## Goal: {Goal 2}
[Repeat structure above]

---

## Cross-Goal Notes
[Any interactions between goals, shared states, or dependencies]

## Standards Referenced
- EH-001 Global Error Handling
- LS-001 Loading States
- AUTH-001 Authentication Redirects
```

### Shared Standard Format

File: `docs/standards/{ID}-{name}.md`

```markdown
# Standard {ID}: {Name}

## Scope
Applies to: [all flows | specific domain | authenticated flows | etc.]

## Behavior Definition

### Trigger Conditions
- [When this standard applies]
- [Specific scenarios]

### System Response
1. [Step-by-step behavior]
2. [Visual changes]
3. [State transitions]

### UI Requirements
- [Visual elements required]
- [Interaction patterns]
- [Accessibility requirements]
- [Timing constraints]

### Exit Conditions
- [How system returns to normal state]
- [User actions that clear the condition]

## Test Criteria
- [Observable behavior for validation]
- [Pass/fail conditions]
- [Edge cases to verify]

## Examples
- Flow X: [how this standard applies]
- Flow Y: [how this standard applies]

## Related Standards
- {ID}: [relationship]
```

## Final Steps

After generating and normalizing flow:

1. **Update docs/userFlows/USER_FLOWS.md**
   - Create file if missing (with header: "# User Flows")
   - Add entry: `- [Goal Name](./{flow-name}.md)`
   - If section doesn't exist, create "## Documented Flows" section

2. **Update docs/standards/STANDARDS.md**
   - Create file if missing (with header: "# Shared Standards")
   - Add section "## Available Standards" if missing
   - For each new standard created: `- {ID} [{Name}](./{ID}-{name}.md) — {one-line description}`
   - For reused standards: verify entry exists
   - Add section "## Standard Categories" grouping by type (Error Handling, Loading, Auth, etc.)

3. **Output Summary**
   - Path: `docs/userFlows/{flow-name}.md`
   - Goal: `[flow-goal-summary]`
   - Shared standards used: `[list of standard IDs referenced]`
   - Shared standards created: `[list of new standard IDs with names]`

## Shared Standard Identification Criteria

Behavior qualifies as Shared Standard if it meets ALL these criteria:
- **Cross-flow applicability** — identical behavior in multiple flows
- **Goal independence** — not specific to user intention or domain context
- **Route independence** — doesn't change based on page or URL
- **System reaction** — describes how system responds, not what user wants
- **Template testability** — can be validated with same test pattern across flows

Typical candidates:
- Error handling (network, 401/403/500, timeouts)
- Loading and retry behavior
- Auth redirects and session management
- Empty states and no-data scenarios
- Permission denied flows
- Offline mode behavior

## Statement Classification System

Every assertion in generated flow must be one of:

**Observable** — User-visible UI behavior (messages, buttons, redirects, loading states)
**Contract** — System obligation verified in codebase or docs (API endpoints, validation rules, data persistence)
**Assumption** — Unverified technical detail requiring source reference

### Classification Rules

1. **Observable statements** — describe what user sees/experiences without backend implementation details
   - Example: "UI shows email validation error below input field"
   - NOT: "Backend validates email format in real-time via WebSocket"

2. **Contract statements** — must reference codebase evidence (file path, API route, config)
   - Example: "POST /api/register creates user account (see server/routes/auth.ts:42)"
   - NOT: "Backend stores session in Redis" (unless verified in codebase)

3. **Assumption statements** — PROHIBITED without source
   - If source unavailable → convert to Observable or ask user
   - If technical detail unknown → generalize to UI behavior

### Evidence-First Implementation

Before writing technical details (Redis, JWT, SMTP, real-time validation, prefill):
1. Search codebase: `Grep` for relevant patterns (auth, session, email, validation)
2. Read implementation files to confirm behavior
3. If not found → do NOT invent, convert to Observable or mark "Unknown - needs confirmation"

**Prohibited**: Inventing implementation details to "sound complete"
**Required**: Ground all Contract statements in verifiable evidence

## Flow Sanity Checks (Mandatory Pre-Write Validation)

After generating content, BEFORE writing file, agent must run checklist and fix violations:

### 1. Preconditions Check
- **Rule**: Only include preconditions without which this flow physically cannot start
- **Fix**: Remove preconditions belonging to other flows
- **Example violation**: "Email service operational" in registration flow → belongs to login/email verification flow
- **Test**: Does this precondition prevent THIS flow's entry point from loading?

### 2. External Systems Check
- **Rule**: Only include external systems directly participating in THIS flow
- **Fix**: Move unverified systems to "Unknown - needs confirmation" and ask user
- **Example violation**: "Redis session management" in registration → not proven for registration specifically
- **Test**: Is there codebase evidence this system is called during THIS flow?

### 3. User Types Check
- **Rule**: Only list user types who can START this flow based on Preconditions
- **Fix**: Remove user types blocked by preconditions
- **Example violation**: "Authenticated User" in registration flow → contradicts "must not be authenticated" precondition
- **Test**: Can this user type satisfy all preconditions?

### 4. Negative Scenarios Check
- **Rule**: Include only domain-specific errors OR references to infrastructure standards
- **Fix**: Replace rare technical details with standard references (NET-001, SRV-001, AUTH-001)
- **Example violation**: "Session cookie not set" or "JavaScript disabled" → too granular, use standard reference
- **Test**: Is this a business rule violation OR covered by existing standard?

### 5. Cross-Flow Ownership Check
- **Rule**: If scenario belongs to different user flow, it must live there, not here
- **Fix**: Move detailed scenarios to correct flow; keep only brief mention in Cross-Goal Notes
- **Example violation**: SMTP configuration details in registration → belongs to email flow
- **Test**: Is this scenario's primary goal different from this flow's goal?

### 6. Timing Promises Check
- **Rule**: No specific time values (seconds) unless sourced from requirements or measurements
- **Fix**: Remove unsourced timing; use "shows confirmation before redirect" instead of "within 1 second"
- **Example violation**: "within 2 seconds" without SLA source
- **Test**: Is this timing value documented in project requirements or measured?

### 7. Infrastructure Error Separation
- **Rule**: Infrastructure errors (network, 401/403/500, timeouts) ONLY as standard references with scope
- **Fix**: Replace inline descriptions with "Applies: Standard NET-001 (scope: registration form submission)"
- **Example violation**: Describing retry logic inline → reference standard and specify scope
- **Test**: Is this error about infrastructure/platform rather than business domain?

## Selective User Questions

Use `AskUserQuestion` ONLY when Assumption-class statement found in:
- Preconditions (uncertain prerequisite)
- External Systems (unverified integration)
- Negative Scenarios (unclear business rule)
- Success Criteria timing (no SLA source)

For other uncertainties, convert to Observable or generalize.

## Rules

- Never guess system boundaries → confirm with user
- Only recommend modes based on description complexity (simple=auto, complex=controlled)
- Each goal must be verb-based (register, login, find, compare, etc.)
- Every scenario must return user to goal or safe state
- Happy path must be testable (→ can become Playwright test)
- Normalization step (Step 6) is MANDATORY, never skip
- **Pre-Write Validation (Step 7) is BLOCKING — output checklist, fix violations, confirm all pass before Write**
- Check existing flows AND standards to avoid duplicates
- User Flow MUST NOT contain full definitions of shared behaviors
- User Flow MAY ONLY reference standards by ID and name with scope
- Before creating new standard, check `docs/standards/STANDARDS.md` for existing match
- Negative Scenarios contain ONLY domain errors, business violations, flow-specific edge cases
- Infrastructure errors (network, auth, server) ALWAYS reference standards with scope, never inline
- All statements must be Observable or Contract with evidence — Assumptions prohibited
- Evidence-first: search codebase before claiming technical implementation exists
- Infrastructure standard references must include scope: "Applies: Standard NET-001 (scope: form submission)"
- Minimize verbosity: no parenthetical explanations, no technical details in user-facing statements
