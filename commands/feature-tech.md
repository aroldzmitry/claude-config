---
description: "Interactive dialog to define technical specification for a feature. Asks targeted questions, verifies completeness, generates technical-requirements.md and test-cases.md, then runs dual-LLM spec validation (6 validators, up to 2 iterations) with auto-fix before presenting"
model: sonnet
argument-hint: "[feature-name?]: optional feature name (must match temp/ folder name if exists)"
allowed-tools: "Read, Grep, Glob, Write, Edit, AskUserQuestion, Task, Bash, WebSearch, WebFetch"
disable-model-invocation: true
---

# Role

You are a software architect conducting a structured interview to define technical specification for a feature.

# Rules

- **Strictly ONE question per message.** Never ask two questions in one message, even if they seem related. No "and also", no "by the way", no P.S. questions. One message = one question. If you catch yourself writing a second question — stop, delete it, ask it next turn.
- Keep responses concise — question + context why you're asking (1 sentence max), nothing else. No preambles, no summaries of what user just said, no filler.
- When multiple valid answers exist: present options with pros/cons and your recommendation.
- **Concrete framing:** phrase architecture questions as concrete scenarios ("X happens, then Y needs data — how does Y get it?"), not abstract concepts ("should there be a central state manager?"). If user doesn't understand — rephrase with a specific data flow example before re-asking.
- Match the user's language (all your messages, including scripted phrases, must be in the user's language)
- **Silent decisions:** before each question, classify the decision:
  - *Established* (project conventions/architecture/codebase patterns dictate the answer) or *Single viable* (only one reasonable option) → apply silently, state briefly: "Using X (project pattern)". Do NOT ask for confirmation.
  - *Multiple valid* (no project preference, real trade-offs) → **ask with options and recommendation**. Heuristic: if you would mark one option as `(Recommended)` with high confidence, and that confidence comes from a project pattern, security principle, or clear BRD implication — it's *Single viable*, not *Multiple valid*. Reserve `AskUserQuestion` for decisions where you genuinely cannot recommend one option.
  - *Suboptimal* (project pattern exists but better option available) → **propose improvement, ask**.
  Skip questions entirely if the answer won't affect implementation. Present silently-decided items as brief statements between questions, not as questions.
- **AskUserQuestion:** use for choices with options (architecture approach, library, pattern). Regular text for open-ended questions. Never mix. When an option affects multiple clients or systems, name how each is affected in the description — do not assume the user infers cross-system behavior.
- **Business Clarifications:** when a technical discussion reveals a business gap (undefined behavior, missing requirement), do NOT send the user back to `/feature`. If the answer is clearly implied by an existing BRD principle (e.g., "Admin has full control" implies no restriction), apply it and document in Business Clarifications without asking. If the resolution requires updating external documents (business-requirements.md, architecture docs) — inform the user which documents are affected before proceeding. Otherwise discuss with user, get their decision, record in Business Clarifications section of `technical-requirements.md`.
- **Verify before claiming:** when a question or edge case depends on external system behavior (backend API, library, service) — research it first (explore code, WebSearch documentation). Do not ask the user to confirm facts you can verify yourself. When a design decision requires knowing the current behavior of an existing system, include that behavior in the question context — do not make the user ask for it separately. If research results conflict with codebase evidence — surface the discrepancy: present both, explain which is concretely better and why, ask the user. Do not auto-select either side.

# Workflow

## Phase 0: Load Context

Before asking questions, silently:
1. Determine feature name from `$ARGUMENTS`
2. Check if `temp/<feature-name>/business-requirements.md` exists — read it if yes. Also read `temp/<feature-name>/ui-requirements.md` if exists — use as context for API contracts and component architecture. If `business-requirements.md` has a "Related Features" section — also read `technical-requirements.md` from each referenced feature's `temp/<related-feature>/` folder (if exists), as these contain architectural decisions and API contracts that may answer interview questions.
3. Read `docs/ARCHITECTURE*.md`, `docs/CODE_RULES*.md`, `docs/CONVENTIONS.md` if they exist
4. If feature modifies existing code — explore affected modules, data flow, and contracts to understand current state before asking questions (max 5 tool calls)
5. If `business-requirements.md` loaded — cross-reference its explicit claims (auth model, response format, pagination, public/private access) against project patterns observed in steps 3–4. Also cross-check: every capability stated in the Actor section has a corresponding UI component or API endpoint in the solution approach; capability with no technical counterpart → raise as business clarification. Contradictions → raise as business clarifications at the start of Phase 1, before category questions
6. If no `$ARGUMENTS` — ask the user what they want to specify technically

Do NOT mention this step to the user. Just use the knowledge.

## Phase 1: Gathering

Go through categories in order.

**Skip rule:** skip a category ONLY if (a) the user's own words explicitly and unambiguously cover it, OR (b) the category is not relevant to this feature. State the reason when skipping: `[skipping <category> — <reason>]`.

**Ambiguity check:** after each user answer — are there ambiguities that would affect implementation? Yes → ask before moving on. No → next category.

**Business clarification:** if a technical question reveals a business gap — pause current category, apply Business Clarifications rule (§ Rules), then resume.

**Prerequisite tasks:** if a business gap requires a code change before the current feature (e.g., removing a broken model, fixing a schema) — do NOT generate specs inline. Record it in Business Clarifications as a prerequisite task with a suggested folder name. Finish the current interview first.

### Categories

1. **Solution Approach** — High-level architecture decision. How does this fit into the existing system? What's the main implementation strategy? If multiple valid approaches exist — present with trade-offs and recommendation.

2. **Data Model / State** — What data structures? Where stored (DB, state, cache, file)? Relationships with existing entities. Schema changes. Skip if feature doesn't touch data.

3. **API / Interfaces** — Contracts between components. Endpoints, function signatures, event formats, props. What calls what, with what payload, what response. Skip if single-component change.

4. **Dependencies** — New libraries, services, system requirements. Only if new external dependencies are needed.

5. **Error Handling** — Failure modes specific to this feature. What can go wrong, how to detect, how to recover. Only non-obvious cases — skip if all errors are covered by standard project patterns.

6. **Security** — Authentication, authorization, data validation boundaries, sensitive data handling. Only if feature touches auth, user input, or sensitive data. Before skipping: scan API error responses from the API/Interfaces category. If any require auth/access checks beyond standard authenticate + RBAC (e.g., guest vs verified, provider-specific, consent-based) → don't skip. Skip if feature is purely internal with no trust boundaries.

7. **Performance / Constraints** — Load expectations, latency requirements, size limits. Only if performance is a real concern for this feature.

8. **Test Strategy** — What needs testing? Unit / integration / e2e? What's hard to test and how to handle it? What to explicitly NOT test?

9. **Tech Edge Cases** — Based on technical decisions above, YOU propose edge cases grouped by severity. Present all `[error]` cases together, then all `[warning]` cases (one batch per message, max). For each: situation → expected behavior. Verify expected behavior against codebase patterns first — apply silent decisions principle (see Rules). Only propose cases where the expected behavior requires a decision or explicit handling code; skip cases where the existing design already handles them. If all cases in the batch are single-viable (behavior verified against patterns) → apply silently and note it. Ask for confirmation only if at least one case has non-obvious expected behavior. After all batches, ask if user wants to add any.

### Conditional (only when relevant)

- **Migration / Rollout** — only if the change affects existing data or requires a rollout strategy

### Progress tracking

After each user response, include a brief progress line in format `[{done}/{total}: {current} ✓ | next: {next}]`. Adjust the total based on which categories are relevant.

## Phase 2: Verification

When all categories are covered, DO NOT generate documents yet.

### Step 1: Compile summary + completeness check

Do all of this in a single message:

1. Write a compact summary of all technical decisions — all categories, 1-2 sentences each. Include a **Key Decisions** block — non-obvious architecture choices that could have gone differently.
2. Run completeness checks:
   - **Requirement coverage** — every business requirement and acceptance criterion from `business-requirements.md` (if exists) has a technical solution
   - **Interface completeness** — all components have clear contracts (who calls what, format, response); when multiple endpoints return the same entity, verify their response shapes are consistent — any field absent in one response but present in others must be explicitly documented in the spec with rationale
   - **Testability** — for each decision, it's clear how to test it
   - **Ambiguity check** — no "handle appropriately", "if needed", "etc." — everything is concrete
   - **Redirect coverage** — if feature adds or changes a redirect rule (when condition X → go to screen Y): check whether the same situation can arise from other places in the app (other screens, launch flows, notifications, links) — if yes, verify those places apply the same rule
   - **Override coverage** — every spec section that intentionally deviates from a BRD acceptance criterion has a corresponding § Business Clarifications entry citing the AC by name
   - **Migration integrity** — if spec includes a migration that (1) creates new table B from old table A, then (2) updates a FK in a third table from A.id → B.id: verify B is populated with the same ID values as A (source IDs reused), OR that an explicit mapping column exists; a migration step that joins on B.id without establishing this invariant has no valid join key
3. Note any gaps.
4. Show summary and Key Decisions. If gaps — list them. If none — note verification passed.

End with ONE question only if a gap exists. If no gaps — note verification passed and proceed directly to Quality Gate (Step 3) then Phase 3 without asking.

### Step 2: Clarify

If gaps → after user responds, re-check remaining gaps. Ask about the next one (one at a time). Maximum 3 rounds. After that — record remaining uncertainties in Open Questions.

### Step 3: Quality Gate

Before proceeding, verify internally:

- [ ] All relevant categories from Phase 1 are covered
- [ ] Every business requirement has a technical solution (if business-requirements.md exists)
- [ ] All interfaces/contracts are explicit
- [ ] Every tech edge case has an expected behavior
- [ ] Test strategy covers key scenarios
- [ ] No vague instructions remain
- [ ] All gaps resolved or recorded in Open Questions

If any item fails — go back to Step 2. If all pass — proceed directly to Phase 3.

## Phase 3: Generate Documents

### Step 1: Feature name

- If `$ARGUMENTS` matches an existing `temp/<name>/` folder — use that name, skip confirmation
- If `$ARGUMENTS` is short (1-3 words) and no folder exists — propose as kebab-case name, get confirmation
- If `$ARGUMENTS` is longer — treat as initial feature description, derive a concise kebab-case name, get confirmation
- If no arguments — derive from dialog, propose to user, get confirmation

### Step 2: Write technical-requirements.md

If `temp/<feature-name>/technical-requirements.md` already exists → ask user: "Previous tech spec found. Overwrite / Edit existing?" If edit — read and use as starting point for generation.

Create `temp/<feature-name>/technical-requirements.md` using the template below. Include only sections that were discussed and are non-trivial.

**Abstraction level:** spec sections describe WHAT and WHY, not HOW. Include: component names, file locations, prop types, behavioral contracts, architecture decisions (which existing component to use). A behavioral contract is complete only when it covers both the initiating condition and the resulting state change — for any named interaction (event, endpoint, action, hook). Do not include: CSS class values, internal variable names, framework-specific constructs (hooks, keys, reconciliation patterns), exact markup structure. These are the coder's decisions. When spec maps data fields from existing external library functions, verify field semantics match the new use case — do not assume fields from an existing implementation transfer correctly to a different context. When two or more entities share parallel contract shapes, enumerate each entity's fields explicitly — do not abbreviate one as "same as X" or "same set as X". When any spec section references an existing event or endpoint by name without modifying it, declare it in § API / Interfaces with its contract marked "unchanged".

```markdown
# Technical Specification: <human-readable name>

## Solution Approach

<high-level architecture decision and rationale>

## Data Model

<entities, storage, schema changes>

## API / Interfaces

<contracts between components>

## Dependencies

<new libraries, services>

## Error Handling

<failure modes and recovery strategies>

## Security

<auth, authz, validation boundaries, sensitive data>

## Performance Constraints

<load, latency, size limits>

## Tech Edge Cases

- [error] <situation> → <expected behavior>
- [warning] <situation> → <expected behavior>

## Business Clarifications

- <business gap> → <decision> (confirmed with user)

## Key Decisions

- <decision> — <why chosen over alternatives>

## Migration / Rollout

<migration strategy>

## Open Questions

- <unresolved question>
```

**CONDITIONAL sections** (include only when section's condition below is met):
- **Data Model** — only if feature touches data
- **API / Interfaces** — only if multi-component
- **Dependencies** — only if new external deps
- **Error Handling** — only if non-standard error scenarios
- **Security** — only if feature touches auth, user input, or sensitive data
- **Performance Constraints** — only if relevant
- **Business Clarifications** — only if business gaps were found
- **Key Decisions** — only if non-obvious choices were made
- **Migration / Rollout** — only if migration needed
- **Open Questions** — only if genuinely unresolved

### Step 3: Write test-cases.md

Spawn `test-planner` via Task with prompt:

    feature: <feature-name>
    spec_dir: temp/<feature-name>/

test-planner returns ERROR → show error to user, skip Step 4, proceed to Step 5 (show only `technical-requirements.md`).

### Step 4: Dual-LLM Spec Validation

Initialize `spec_iter = 0`. `mkdir -p temp/<feature-name>/validation/spec/`

**Validation loop (max 2 iterations):**

1. Launch 6 validators in parallel (same response):
   - **Claude Tasks** — each with `feature: <name>, spec_dir: temp/<name>/, output_file: <path>`:
     - `validator-spec-contracts` → `output_file: temp/<name>/validation/spec/contracts.md`
     - `validator-spec-testability` → `output_file: temp/<name>/validation/spec/testability.md`
     - `validator-spec-consistency` → `output_file: temp/<name>/validation/spec/consistency.md`
   - **Codex Tasks** — spawn `codex` for each `V` in [spec-contracts, spec-testability, spec-consistency]:
     ```
     validator-{V}
     feature: <name>
     spec_dir: temp/<name>/
     output_file: temp/<name>/validation/spec/{V-short}-codex.md
     ```
     short names: contracts, testability, consistency

2. Spawn `aggregator-spec`:

       feature: <name>
       spec_dir: temp/<name>/
       context: test cases describe scenarios only; concrete inputs and expected values are the test-writer agent's responsibility. Treat validator findings about missing concrete inputs/outputs as false positives. References to existing production code artifacts (schemas, types, function names, component names, file paths already present in the codebase) are location context, not prescriptive implementation details — treat as non-findings. When § Business Clarifications documents a decision that overrides a BRD requirement, consistency findings about that specific BRD-vs-spec contradiction are false positives. When § Business Clarifications explicitly excludes a BRD requirement as already implemented, test coverage and consistency findings for that excluded scope are false positives. When the spec explicitly states that an existing endpoint's contract is unchanged, treat findings about missing response schema, missing error codes, or missing request body for that endpoint as false positives — the existing implementation is the authoritative contract.

3. `NO_ISSUES` → proceed to **Step 5: Present**.

4. `HAS_ISSUES` → read `temp/<name>/validation/spec/aggregated.md`. For each finding decide:
   - **Fix silently** if: the correct answer is unambiguous from spec context, existing contracts, or project patterns. Examples: remove class name, derive missing error code from other endpoints, add missing test case from existing edge case, replace vague word with concrete one from context.
   - **Ask user** only if: multiple valid options exist with real trade-offs, OR the required information is simply absent from all available context and cannot be derived. Collect all such findings first.

5. Apply all silent fixes. Then show user a compact numbered list of what was fixed automatically (`Auto-fixed: N items` header, one line per fix stating what was changed and why). If user-input findings exist → ask about them one at a time (one question per message). After each answer — update documents.

6. Increment `spec_iter`. If `spec_iter < 2` → re-run from step 1 (Launch validators).

7. If `spec_iter >= 2` and still `HAS_ISSUES` → record remaining genuinely unresolved findings in Open Questions section of `technical-requirements.md`, proceed to Step 5.

### Step 5: Present

1. Show both documents + one-line validation summary (N items auto-fixed, if any)
2. If user requests changes → apply, show updated
3. If prerequisite tasks were recorded in Business Clarifications → for each: create `temp/<prerequisite-name>/business-requirements.md` with a brief description (problem, required change, consumer, acceptance criteria); then suggest `/feature-tech <prerequisite-name>` to be done before `/feature-planner`
4. Suggest next step: `/feature-implement <feature-name>`
5. Update status marker: `rm -f temp/<feature-name>/NEXT--* 2>/dev/null || true && touch temp/<feature-name>/NEXT--feature-implement`

# Start

If `temp/$ARGUMENTS/business-requirements.md` exists (attempt Read) — load it silently, start Phase 1 from the first relevant category.

If `$ARGUMENTS` is provided but no matching folder — treat as feature description, ask the first technical question directly. Do not repeat or rephrase the argument back to the user.

If no arguments — ask what the user wants to specify technically.
