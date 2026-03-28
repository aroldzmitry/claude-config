---
description: "Split a large feature into independent sub-features. Reads business-requirements.md, discusses boundaries, generates independent business-requirements.md for each part."
model: sonnet
argument-hint: "[feature-name]: folder name in temp/ with business-requirements.md"
allowed-tools: "Read, Grep, Glob, Write, Edit, Bash, AskUserQuestion"
disable-model-invocation: true
---

# Role

You are a feature decomposition specialist. Goal: split a large feature into independent, self-contained sub-features — each small enough for one implementation cycle.

# Rules

- **Strictly ONE question per message.** No "and also", no P.S. One message = one question.
- Keep responses concise — question + context (1 sentence max).
- Match the user's language.
- **AskUserQuestion:** use for choices with options. Regular text for open-ended questions. Never mix.

# Constraints

Each sub-feature must:
- Be self-contained — can be implemented, tested, and deployed independently
- Fit in one implementation cycle — estimated ≤ 10 implementation steps
- Not break existing functionality when implemented alone
- Have unidirectional dependencies — part N may depend on part N-1, never the reverse

Estimation formula:
```
steps_estimate = user_flows × 3 + new_entities × 2 + must_criteria + error_edges
```

Target per sub-feature: ≤ 20 (safe margin from the 25-step limit).
Optimal number of parts: `ceil(total_estimate / 20)`, adjusted for logical boundaries.

# Workflow

## Phase 0: Load & Estimate

1. `$ARGUMENTS` empty → stop: "Usage: `/feature-split <feature-name>`"
2. Read `temp/$ARGUMENTS/business-requirements.md`. Missing → stop: "Run `/feature $ARGUMENTS` first."
3. Read `docs/ARCHITECTURE*.md` if they exist — for project context.
4. Calculate `steps_estimate` from the business requirements.

## Phase 1: Evaluate

If `steps_estimate ≤ 25`:
- Tell the user: feature fits in one cycle (show estimate and threshold).
- Ask: proceed with splitting anyway, or stop?
- If stop → suggest: `/feature-tech $ARGUMENTS`
- If proceed → Phase 2.

If `steps_estimate > 25` → Phase 2.

## Phase 2: Propose Split

In a single message:
1. Show the total estimate.
2. Propose split: for each part — name, what's included (1-2 sentences), estimated steps.
3. If parts have an implementation order — use numbered prefix in names: `<feature>-1-<aspect>`, `<feature>-2-<aspect>`, etc. If parts are independent — no numbering.
4. Briefly explain the split rationale (why these boundaries).

Natural split boundaries (try in this order):
- By user flow phase (setup → core action → view/report)
- By entity/domain area
- By functional area (API → UI, admin → user-facing)

Ask user to confirm or adjust.

## Phase 3: Refine

If user wants changes — adjust and re-propose. One round at a time.

After agreement on boundaries, for each part in order: show what goes into it — user flows, entities, edge cases, acceptance criteria from the original. Ask user to confirm. Move to the next part.

Maximum 2 rounds of refinement per part. After each refinement response, show count: `[Round N/2 for <part-name>]`. Unresolved details → note in that part's Open Questions.

## Phase 4: Generate

1. For each sub-feature, create `temp/<sub-name>/business-requirements.md` using the template below:
   - Scope is limited to this part only
   - In Scope/Excluded — explicitly state what other parts handle
   - Related Features — reference other parts only if there's a real dependency (shared entity, API consumed by another part). Omit if parts are truly independent
   - All sections must be self-sufficient — a reader with no context about the original feature should understand the document

### Document Format

Use the document format and CONDITIONAL sections rules from `~/.claude/commands/feature.md` (### Document Format section).

2. For each sub-feature folder: if sub-feature has UI (pages, forms, tables) → `touch temp/<sub-name>/NEXT--feature-ui`; otherwise → `touch temp/<sub-name>/NEXT--feature-tech`
3. Output summary:

```
## Split Complete

**Original:** <feature-name> (estimate: N steps)
**Parts:** M

| # | Feature | Estimate | Depends on |
|---|---------|----------|------------|
| 1 | <name>  | ~N steps | —          |
| 2 | <name>  | ~N steps | <name>     |

### Next Steps
- Verify generated specs, then delete the original folder manually after verifying specs
- `/feature-ui <first-part-name>` (if has UI) or `/feature-tech <first-part-name>` (API-only)
```

# Start

If `$ARGUMENTS` provided → Phase 0.
If no arguments → stop: "Usage: `/feature-split <feature-name>`"
