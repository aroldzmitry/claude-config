---
description: "Create comprehensive user flow documentation through semi-automatic interactive dialogue"
argument-hint: "<flow-description>: describe what user flow to document"
model: sonnet
allowed-tools: "Read, Glob, Grep, AskUserQuestion, Write, Bash, WebSearch, WebFetch"
---

# User Flow Generator

Create executable, testable user flow documentation by combining project context analysis with guided user input.

## Input

`$ARGUMENTS` contains initial description (what flow to document). If empty → ask user.

## Process

1. **Analyze project** — Read `.claude/CLAUDE.md`, existing user flows, and codebase patterns
2. **Determine mode** — Analyze description complexity; recommend auto/controlled mode
3. **Gather system boundaries** — Always ask/confirm (4 questions)
4. **Controlled mode only** — Ask user to select goals + user types
5. **Auto-generate rest** — Use project context + web research for remaining 7 steps
6. **Save flow** — Write to `docs/userFlows/{name}.md`
7. **Update index** — Add/update entry in `docs/userFlows/USER_FLOWS.md`

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

### Steps 2, 4-9: Auto-Generation (All Modes)
For each selected goal (controlled) or inferred goal (auto):
- Generate happy path (entry point → steps → success criteria)
- Generate alternative paths (errors, cancellations, edge cases)
- Generate negative scenarios (no internet, 401/403/500, expired session, etc.)
- Validate UX completeness (clarity, state visibility, cancellability, confirmations)
- Map to components (pages, routes, component states, analytics events)

Use web research if project patterns insufficient.

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
Entry point: [URL/button/CTA]
Sequence:
1. [screen] → [action] → [result]
2. ...

Success criteria: [what user sees at end]

### Alternative Paths
A1. [error scenario] → [recovery path]
A2. [cancellation] → [return point]
A3. [edge case] → [handling]

### Negative Scenarios
E1. No internet → [offline behavior]
E2. 401 Unauthorized → [re-auth flow]
E3. Server error (500) → [retry/error message]
E4. Expired session → [force login]
E5. Inconsistent data → [validation error]
E6. Direct URL access → [redirect/initialization]

### UX Validation Checklist
- [ ] Next action clear without hints?
- [ ] System state visible to user?
- [ ] Action safely cancellable?
- [ ] Result confirmed to user?
- [ ] No dead ends?

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
```

## Final Steps

After generating flow:
1. **Update docs/userFlows/USER_FLOWS.md**
   - Create file if missing (with header: "# User Flows")
   - Add entry: `- [Goal Name](./{flow-name}.md)`
   - If section doesn't exist, create "## Documented Flows" section

2. **Output Summary**
   - Path: `docs/userFlows/{flow-name}.md`
   - Goal: `[flow-goal-summary]`

## Rules

- Never guess system boundaries → confirm with user
- Only recommend modes based on description complexity (simple=auto, complex=controlled)
- Each goal must be verb-based (register, login, find, compare, etc.)
- Every scenario must return user to goal or safe state
- Happy path must be testable (→ can become Playwright test)
- All 9 steps required; none can be skipped
- Check existing flows to avoid duplicates
