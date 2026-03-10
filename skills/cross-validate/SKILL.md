---
description: "Multi-aspect cross-validation: auto-determines aspects, runs Claude Task + Gemini + Codex per aspect in parallel, aggregates and triages findings."
argument-hint: "<file-or-directory> [haiku|sonnet|opus]"
allowed-tools: "Task, Bash, Read, Glob, Grep"
model: sonnet
disable-model-invocation: true
---

# Multi-Aspect Cross-Validation

**Input:** $ARGUMENTS

## Rules

- Never ask clarifying questions — decide and proceed.
- Match user's language.
- Each validator runs independently.
- Finding is REAL: confirmed by 2+ validators, OR CRITICAL from 1 validator.
- Finding is FALSE POSITIVE: 1 validator only AND severity MEDIUM or LOW.

---

## Phase 0: Parse Arguments

Last word of `$ARGUMENTS` = `haiku|sonnet|opus` → `TIER` = that word, `TARGET` = rest. Otherwise `TIER` = `sonnet`, `TARGET` = full input.

| Tier | Claude model | Gemini flag | Codex flag |
|------|-------------|-------------|------------|
| haiku | claude-haiku-4-5-20251001 | `-m gemini-2.5-flash-lite` | `-m codex-mini-latest` |
| sonnet | claude-sonnet-4-6 | `-m gemini-2.5-flash` | (default) |
| opus | claude-opus-4-6 | `-m gemini-2.5-pro` | `-m o3` |

---

## Phase 1: Load Target

Resolve TARGET: file → Read; directory → Glob + read 5 key files; freeform → Grep/Glob then read.

Write content to `/tmp/cv_target.txt`:
```bash
cat > /tmp/cv_target.txt << 'ENDOFCONTENT'
{full content}
ENDOFCONTENT
```

---

## Phase 2: Determine Aspects

Choose 4–5 aspects. For each aspect produce **5–10 specific YES/NO questions** — not prose descriptions.

**Specification/planning documents** — always include:
1. **Cross-Reference Consistency** — for every rule/policy, find all sections that must reflect it; ask whether each pair is consistent
2. **Entity Completeness** — for every named entity (phase, worker, artifact, field, schema file), ask whether all sub-components the document itself requires are present

Then add 2–3 domain-specific aspects.

**Code** — aspects by content: Security · Input validation · Error handling · State consistency · Race conditions · Auth/authz · etc.

Questions must be concrete: "Does line X contradict section Y?", "What happens when Z returns (failed, stop)?", "Is field F in both the rule and the field list?"

Store: `ASPECTS` = list of `{name, questions[]}` (4–5 items)

---

## Phase 3: Parallel Validation

For each aspect N write `/tmp/cv_prompt_N.txt`:

```
You are a code validator. Check ONLY this specific aspect.

ASPECT: {name}
MODEL TIER: {TIER}

QUESTIONS TO CHECK:
1. {question}
2. {question}
...

FILE: {target path}
---
{full file content}
---

For each QUESTION: output a finding if issue exists, skip silently if not.
Also report any additional issues in this aspect.
Format: [SEVERITY] line N: description
SEVERITY: CRITICAL / HIGH / MEDIUM / LOW
Line numbers: exact line of the problem, not surrounding comments.
Output ONLY findings. NO_ISSUES if nothing found.
```

Launch ALL N×3 validators in one parallel batch:

- **Claude Task**: `subagent_type: general-purpose`, `model: {CLAUDE_MODEL}`, `prompt: [contents of /tmp/cv_prompt_N.txt]`
- **Gemini**: `gemini {GEMINI_MODEL_FLAG} --yolo -p "$(cat /tmp/cv_prompt_N.txt)" 2>&1`
- **Codex**: `codex exec {CODEX_MODEL_FLAG} - < /tmp/cv_prompt_N.txt 2>&1`

CLI error → include raw error, mark validator as `—`.

---

## Phase 4: Aggregate and Verify

**Deduplicate**: group findings at same line (±2) and same concept; record which validators flagged it; take highest severity.

**Verify every finding**: read the exact lines. Confirm the issue exists as described. Consensus does not replace verification.

**Post-fix pass**: after verifying, scan for rule/example pairs and high-level/detail section pairs covering the same behavior — check both sides are consistent.

**Classify**: REAL → report. FALSE POSITIVE → exclude with reason.

---

## Phase 5: Report

```
## Cross-Validation Report: {TARGET}
**Tier:** {TIER} | **Validators:** Task · Gemini · Codex
**Aspects:** N | **Findings:** X real, Y false positives filtered

### {ASPECT NAME}
| Sev | Line | Issue | Task | Gemini | Codex |
|-----|------|-------|:----:|:------:|:-----:|
...

### Filtered
- `finding` — reason

### Action Required
{REAL findings ordered by severity}
```

Legend: ✓ flagged · ✗ not flagged · — unavailable · ⚠ single validator

---

## Phase 6: Fix Triage

Classify every REAL finding:

**List A — apply autonomously**: exactly one reasonable solution, purely corrective (sync/add/correct — not behavior change), answer derivable from the document itself, no new contradictions created.

**List B — discuss first**: multiple valid approaches exist; changes or removes existing behavior; introduces a new mechanism; CRITICAL with non-obvious solution.

```
## Fix Triage

### List A — Can apply now (N)
| ID | Sev | Line | Fix |
...

### List B — Needs your decision (M)
| ID | Sev | Line | Question | Options |
...
```

Wait for user response. Apply List A immediately if approved. Apply List B per chosen options.
