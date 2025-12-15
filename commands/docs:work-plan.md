---
description: Generate implementation plan from user flow by analyzing codebase status
argument-hint: [user-flow-file-path]
---

# Work Plan Generator

Converts user flow documents into developer implementation instructions by analyzing codebase patterns and matching requirements to code.

## Input

User must provide path to user flow markdown file via `$ARGUMENTS`.

User flow must contain: Happy Path, Preconditions, Alternative Paths, Negative Scenarios, Success Criteria, Links to standards.

## Output

### Console Summary (Always)

```
Requirements: N total (UI: X | API: Y | State: Z | Domain: W | Infrastructure: V)
Status: Implemented: A | Partial: B | Missing: C | Conflicts: D
Impact: M files modified | P packages added
```

If all requirements implemented (Missing + Partial + Conflicts = 0):
- Print "✅ All requirements implemented. No work needed."
- Skip file creation
- Exit

### Implementation Instruction File (Only When Work Needed)

File: `./docs/workPlans/{flow-name}-implementation-plan.md`

**Created only when:** Missing > 0 OR Partial > 0 OR Conflicts > 0

**Format:** Actionable TODO steps only. No status reports, no "already implemented" sections.

**Sections:**

1. **Implementation Instructions** — Step-by-step actions for Missing/Partial/Conflict requirements only, grouped by layer (UI → State → API → Domain → Infrastructure)
   - Each instruction: Action | File path | What to change | Contract/component to use | Closes REQ-IDs
   - If refactoring needed: What to refactor | Why | Expected result
   - Omit all Implemented requirements

2. **Dependency Changes** — Packages/configs to add
   - Package name | Purpose | Where used | Installation command
   - Hide section if empty

3. **Pattern Conflicts** — Requirements conflicting with current patterns
   - What conflicts | Current pattern | Proposed resolution | Risk
   - Hide section if empty

4. **Related Documentation** — Links to user flow and standards

## Process

### Phase 1: Parse & Decompose

**Step 1.1: Parse Flow into Structure**
Extract: roles, preconditions, main steps, alternatives, error scenarios, non-functional requirements, standard references.
Build flow model with requirement IDs.

**Step 1.2: Decompose into Atomic Requirements by Layer**
For each flow element, extract atomic requirements per layer:
- UI: components, forms, modals, notifications, loading states, error displays
- Routing: routes, navigation, redirects, guards
- State: local state, global state, cache, form state
- API Contracts: endpoints, request/response shapes, error codes
- Domain Logic: business rules, validations, transformations
- Error Handling: try/catch, error boundaries, fallbacks
- Permissions: access control, role checks, feature flags
- i18n: text keys, translations, locale handling
- Telemetry: events, metrics, traces (if specified in flow)

Result: Requirement matrix (REQ-ID → Layer → What needed)

### Phase 2: Analyze & Match

**Step 2.1: Scan Project Patterns**
Read `.claude/proj_index/00-INDEX.md` first to understand project architecture and patterns.
Then scan code to find how project implements:
- Module structure (feature folders, barrel exports)
- Routes (file-based, config-based)
- DI (context, hooks, providers)
- API client (fetch wrapper, axios, react-query)
- Repositories (data access pattern)
- State management (Redux, Zustand, Context, local)
- Forms (Formik, React Hook Form, uncontrolled)
- Modals (portal pattern, library)
- Notifications (toast library, custom)
- Error handling (boundaries, global handler)
- i18n (react-i18next, custom)
- Styling (CSS modules, styled-components, Tailwind)

Result: Pattern catalog (category → pattern → example file:line)

**Step 2.2: Match Requirements to Code**
For each atomic requirement, determine status:
- **Exists:** Fully implemented per patterns
- **Partial:** Implemented but incomplete or not per patterns
- **Missing:** Not implemented
- **Conflicts:** Requirement contradicts current pattern

Result: Requirement status map (REQ-ID → Status → File:line → Pattern used)

### Phase 3: Plan & Output

**Step 3.1: Select Optimal Implementation**
For each Partial/Missing/Conflict requirement, choose best path:
- Prefer existing patterns over new patterns
- Prefer minimal architecture changes
- Prefer module reuse over creation
- Prefer UX consistency with existing flows

Result: Implementation decisions (REQ-ID → Approach → Why)

**Step 3.2: Generate File & Module Change Plan**
Group requirements by file/module. For each:
- Where to go (file path)
- What to change (add/modify/remove/move)
- What contract needed (API shape, props interface)
- What state to add (local/global, shape)
- What UI components to use (existing or new)
- Verification (how to test manually)

**Step 3.3: Generate Refactoring Plan**
If existing module needs rework to fit flow:
- What to refactor (function/component/module)
- Why (pattern mismatch, conflict, tech debt)
- Expected result (new structure, behavior)

**Step 3.4: Generate Dependency Plan**
If new packages/configs needed:
- Package name
- Purpose (what layer uses it)
- Where used (file paths)
- Installation command

**Step 3.5: Print Console Summary**
Show requirement count by layer, status distribution, impact metrics (files/packages).

**Step 3.6: Decide File Creation**
If Missing + Partial + Conflicts = 0:
- Print "✅ All requirements implemented. No work needed."
- Skip file creation
- Exit (do not git add)

**Step 3.7: Write Implementation Instruction File (Conditional)**
Only if Missing + Partial + Conflicts > 0:
- Output instructions for Missing/Partial/Conflict requirements only, grouped by layer (UI first → Infrastructure last)
- Each instruction: 1-2 lines, actionable, with file path and REQ-ID reference
- Omit all sections describing already Implemented requirements
- Hide empty sections (Dependency Changes, Pattern Conflicts)
- Git add created file

## Rules

**DO:**
- Extract requirements only from flow + linked standards
- Use existing project patterns (scan before inventing)
- Output instructions only (no explanations, no test plans)
- Group instructions by layer for logical execution order
- Hide sections with no content
- Git add created plan files

**DON'T:**
- Write code or patches
- Invent requirements not in flow
- Guess when uncertain — ask or mark as "Needs Verification"
- Output reports or analysis — only instructions
- Create file when everything implemented — console summary only
- Include "already implemented" sections in plan file

## Starting Workflow

1. Get user flow file path from `$ARGUMENTS` (required)
2. Execute Phase 1: Parse & Decompose
3. Execute Phase 2: Analyze & Match
4. Execute Phase 3: Plan & Output (Steps 3.1-3.7, including conditional file creation)
5. If file created: git add plan file
