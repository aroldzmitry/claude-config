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
5. **Auto-generate content** — Use project context + web research for flow details
6. **Normalize and deduplicate** — Extract shared behaviors to standards (mandatory)
7. **Save flow** — Write to `docs/userFlows/{name}.md`
8. **Update indexes** — Update `docs/userFlows/USER_FLOWS.md` and `docs/standards/STANDARDS.md`

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
For each selected goal (controlled) or inferred goal (auto):
- Generate happy path (entry point → steps → success criteria)
- Generate alternative paths (domain-specific errors, cancellations, edge cases)
- Generate negative scenarios (ONLY domain/business errors, NOT infrastructure errors)
- Validate UX completeness (clarity, state visibility, cancellability, confirmations)
- Map to components (pages, routes, component states, analytics events)

Use web research if project patterns insufficient.

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

This step is NOT optional. Agent must complete normalization before proceeding to save.

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
N1. [Domain-specific error: invalid input format] → [validation message, recovery path]
N2. [Business rule violation: quota exceeded] → [upgrade prompt or alternative]
N3. [Flow-specific edge case: partial completion] → [resume or restart option]

### Infrastructure Behaviors
Applies: Standard EH-001 Global Error Handling
Applies: Standard LS-001 Loading States
Applies: Standard AUTH-001 Authentication Redirects

(Infrastructure errors like network failures, 401/403/500, expired sessions reference standards only)

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

## Rules

- Never guess system boundaries → confirm with user
- Only recommend modes based on description complexity (simple=auto, complex=controlled)
- Each goal must be verb-based (register, login, find, compare, etc.)
- Every scenario must return user to goal or safe state
- Happy path must be testable (→ can become Playwright test)
- Normalization step (Step 6) is MANDATORY, never skip
- Check existing flows AND standards to avoid duplicates
- **User Flow MUST NOT contain full definitions of shared behaviors**
- **User Flow MAY ONLY reference standards by ID and name**
- Before creating new standard, check `docs/standards/STANDARDS.md` for existing match
- Negative Scenarios contain ONLY domain errors, business violations, flow-specific edge cases
- Infrastructure errors (network, auth, server) ALWAYS reference standards, never inline
