---
description: "Single-target tuning: mines execution logs of one agent/command and its child-agent chain, behavioral + static analysis, interactive review, targeted edits via audit-applier."
argument-hint: "<agent-or-command-name> [runs?] [solo?]: default 10 recent runs, 'all' = up to 20; 'solo' = skip the child chain"
allowed-tools: "Task, Read, Glob, Grep, Edit, Write, Bash, AskUserQuestion"
disable-model-invocation: true
---

# Role

Single-target tuner. Mines real execution logs of one agent or command, coordinates behavioral + static analyzers, interactive review, and fixes. Goal: remove bloat, fix contract drift across the call chain, raise output quality. Never writes system files directly — delegates to audit-applier.

# Rules

- **ONE finding per message** in Phase 5 — present, discuss, decide, then next.
- Match user's language. AskUserQuestion for structured decisions, plain text for open-ended discussion.
- Never Read a raw `.jsonl` — extraction uses grep/jq/sed slices only.
- Targeted edits only: every fix action is REPLACE/DELETE/ADD of a specific span with explicit CURRENT/REPLACEMENT — never a file or section rewrite.
- Spawn models strictly per the Phase tables: extraction/static/dedup/apply = `sonnet`; synthesis/verification = `fable`; if the spawn fails with a model-availability error → retry once with `opus`.
- Every agent spawn uses `subagent_type: general-purpose`; prompt = `Read instructions at ~/.claude/agents/{agent}.md. Follow all rules, checks, output format.` + the Input fields listed at the spawn site. This applies to ALL phases (2–6).
- Shell variables holding raw jsonl records break on `echo` (control characters) — always pipe via temp file: `grep -m1 ... > $BUNDLE/.record.json`, then `jq ... $BUNDLE/.record.json`.

# Conventions

- `P` = `~/.claude/projects`
- `MEMORY` = `~/.claude/agent-memory/system-tune`
- `TARGET` = resolved path of the tuning subject: `~/.claude/agents/{NAME}.md` or `~/.claude/commands/{NAME}.md`
- `REPORTS_DIR` = `{MEMORY}/reports/`
- `BUNDLES` = `{REPORTS_DIR}/runs/`
- `RUN_REPORTS` = `{REPORTS_DIR}/run-reports/`
- `DECISIONS_FILE` = `{MEMORY}/decisions.md`
- `OBSERVATIONS_FILE` = `{MEMORY}/observations.md`
- `DEDUP_FILE` = `{REPORTS_DIR}/08-deduplicated.md`
- `VERIFIED_FILE` = `{REPORTS_DIR}/09-verified.md`

# Workflow

## Phase 0: Resolve & Load

1. `mkdir -p {BUNDLES} {RUN_REPORTS}`. If `{REPORTS_DIR}/fix-plan.md` exists (previous partially-applied run) → ask via AskUserQuestion: **Apply pending fix-plan** (run Phase 6 on it now; on success delete it, then continue fresh) / **Discard** (delete it). Then clear stale artifacts: `find {REPORTS_DIR} -name "0*.md" -delete; find {BUNDLES} {RUN_REPORTS} -mindepth 1 -delete 2>/dev/null; mkdir -p {BUNDLES} {RUN_REPORTS}`.
2. Parse `$ARGUMENTS`: token 1 = NAME (strip leading `/` and trailing `.md`); remaining tokens: positive integer → RUNS = min(value, 20); `all` → RUNS = 20; `solo` → SOLO = true; no integer → RUNS = 10.
3. Resolve NAME:
   - `~/.claude/agents/{NAME}.md` exists → KIND = agent; `~/.claude/commands/{NAME}.md` exists → KIND = command; both exist → AskUserQuestion which one.
   - Neither → case-insensitive substring search over `ls ~/.claude/agents ~/.claude/commands`: 1 hit → AskUserQuestion "Found '{hit}' — tune this?" **Yes** / **No** (No → stop); 2–4 hits → AskUserQuestion; >4 → list them, stop; 0 hits → if NAME is a built-in agent type (Explore, Plan, general-purpose, claude, etc.) → "built-in agent — no local .md to tune" → stop; else → "not found" + list available names → stop.
   - NAME = `system-tune` → allowed; note edits take effect on the next invocation.
4. **Build TARGET_SET** (skip if SOLO → TARGET_SET = {TARGET}): collect child agents of TARGET — every `~/.claude/agents/{x}.md` whose name appears in TARGET's text as a spawn reference (`subagent_type: {x}`, `agents/{x}.md`, or the name as first word of a wrapper prompt). Recurse into each child file (visited-set guards cycles). Built-in types among children (Explore, Plan, …) are noted but have no file. Show the chain before proceeding: `{target} → {child}, {child}; {child} → …`. If TARGET_SET > 8 files → state the file count and expected extra cost in one line and proceed full-chain (rerun with `solo` to skip the chain).
5. NEIGHBORHOOD = files outside TARGET_SET referencing any TARGET_SET name: `grep -l` over `~/.claude/commands/*.md ~/.claude/agents/*.md`.

## Phase 1: Discover & Extract (bash only, no agents)

### Discovery — KIND = agent (union of 3 channels, mtime-sorted, take RUNS newest)

```bash
# A: native spawns
grep -l "\"agentType\":\"$NAME\"" $P/*/*/subagents/*.meta.json 2>/dev/null | sed 's/\.meta\.json$/.jsonl/'
# B1: prompt-file spawns (general-purpose + "Read instructions at agents/NAME.md") — first record only
for f in $P/*/*/subagents/agent-*.jsonl; do head -1 "$f" 2>/dev/null | grep -q "agents/$NAME\.md" && echo "$f"; done
# B2: wrapper spawns (super-agent/codex contract: first prompt word = agent name)
for f in $P/*/*/subagents/agent-*.jsonl; do head -1 "$f" 2>/dev/null | grep -q "\"content\":\"$NAME[\\\\ ]" && echo "$f"; done
```

### Discovery — KIND = command

```bash
grep -l "\"attributionSkill\":\"$NAME\"" $P/*/*.jsonl 2>/dev/null   # top-level sessions only
```
One session = one run sample. Take RUNS newest by mtime. The current session's own transcript is excluded.

### Freshness gate (both kinds)

LAST_EDIT = newest file mtime across TARGET_SET (`stat -f %m {paths} | sort -n | tail -1`). A discovered run whose transcript mtime ≤ LAST_EDIT is STALE — it executed an older version of the instructions; analyzing it re-litigates text that already changed. Exclude STALE runs from bundling. If fresh runs < 3 and STALE > 0 → AskUserQuestion: **Static-only** (set STATIC_ONLY) / **Include stale** (bundle them; warn once that RULE_VIOLATION/DEAD_RULE findings may target already-fixed behavior) / **Stop** ("collect fresh runs, then re-tune").

### Bundle per run → `{BUNDLES}/{NN}-{id8}/`

For channels A/B1 (transcript T, agent id ID, parent `S = $(dirname $(dirname T)).jsonl`):
```bash
TUID=$(jq -r '.toolUseId // empty' "${T%.jsonl}.meta.json")           # may be absent
if [ -n "$TUID" ]; then grep -m1 "\"tool_use_id\":\"$TUID\"" "$S"; else grep -m1 "\"agentId\":\"$ID\"" "$S"; fi > .record.json
jq '{src,parent paths} + (.toolUseResult|{agentType,status,totalDurationMs,totalTokens,totalToolUseCount,toolStats}) + {ts:.timestamp,cwd,branch:.gitBranch}' .record.json > 00-meta.json
jq -r '.toolUseResult.prompt' .record.json | head -c 20000 > 01-input-prompt.txt
jq -r '.toolUseResult.content | if type=="array" then map(.text//"")|join("\n") else tostring end' .record.json | head -c 20000 > 02-final-output.txt
jq -r 'select(.type=="assistant")|.message.content[]?|select(type=="object" and .type=="tool_use")|[.name,(.input|tostring|gsub("\n";" ")|.[0:200])]|@tsv' "$T" | nl -ba > 03-tool-sequence.tsv
jq -r 'select(.type=="assistant")|.message.content[]?|select(type=="object" and .type=="text")|.text[0:500]+"\n---"' "$T" > 04-assistant-text.txt
jq -r 'select(.type=="user")|.message.content[]?|select(type=="object" and .type=="tool_result" and .is_error==true)|(.content|tostring|.[0:300])' "$T" > 05-errors.txt
LN=$(grep -n "\"agentId\":\"$ID\"" "$S" | head -1 | cut -d: -f1)
sed -n "$((LN+1)),$((LN+40))p" "$S" | jq -c '{t:.type, text:[.message.content[]?|select(type=="object" and .type=="text")|.text[0:300]], spawns:[.message.content[]?|select(type=="object" and .type=="tool_use" and .name=="Agent")|{st:.input.subagent_type,d:.input.description}]}' > 06-downstream.txt
jq -s '[.[]|select(.type=="assistant")|.message.usage//empty]|{out:(map(.output_tokens)|add), cache_read:(map(.cache_read_input_tokens)|add), cache_create:(map(.cache_creation_input_tokens)|add), llm_steps:length}' "$T" > 07-usage.json
```

For channel B2 (wrapper transcript W): `01` = wrapper's first-record content minus the agent-name line; `00`/`02`/`06` from the wrapper's parent record as above. The real execution is a separate headless session — locate it: take a distinctive ~120-char snippet of the task body, `grep -lF` over `$P/*/*.jsonl` (exclude the parent session); match = candidate whose first `"type":"user"` record content starts with the task body and whose timestamp is within 10 minutes of the wrapper's. Found → extract `03/04/05/07` from it; not found → write `inner trace: UNAVAILABLE (wrapped run)` to `03` and skip `04/05/07`.

For KIND = command (session S): `00` = `{ts, cwd, branch, lines}`; `01` = `<command-args>` from the `<command-name>/{NAME}` marker record; `03/04` from records matching `"attributionSkill":"{NAME}"`; `05` = their error tool_results; plus `08-questions.txt` = AskUserQuestion tool_use inputs paired with the user answers; `06` = user free-text records after the last attributed record (corrections). Child invocations: Agent tool_use records with `"attributionSkill":"{NAME}"` — note `attributionSkill` exists only on the tool_use side; join each result via its `id` → `"tool_use_id"`.

### Child bundles (skip if SOLO)

Per run, for each child invocation: real child name = `subagent_type`, unless `subagent_type` is `super-agent`/`codex` → first word of `.input.prompt`. For children in TARGET_SET, write light bundle `{run}/children/{child}-{id8}/`: `00-meta.json` + `01-input-prompt.txt` + `02-final-output.txt` from the joined tool_use/tool_result pair. Full bundle (via the child's own transcript, `agentId` → `subagents/agent-{agentId}.jsonl`) only when its `status` ≠ completed or downstream shows correction/respawn — max 3 full child bundles per run.

Write `{REPORTS_DIR}/runs-manifest.md`: one row per run (`bundle | channel | ts | status | tokens | children: n`) + discovery totals per channel + stale-excluded count. 0 runs to bundle and the freshness gate didn't already ask → AskUserQuestion: **Static-only** (set STATIC_ONLY, Phase 2 without behavioral row, skip Phase 3) / **Stop**. Fewer than RUNS → proceed, note the count.

## Phase 2: Analyze

Spawn in parallel (per the spawn rule in # Rules, + Input block):

| Agent instructions | model | Input files | Output |
|---|---|---|---|
| `agents/audit-consistency.md` | sonnet | TARGET_SET + NEIGHBORHOOD | `01-consistency.md` |
| `agents/audit-redundancy.md` | sonnet | TARGET_SET + NEIGHBORHOOD | `02-redundancy.md` |
| `agents/audit-optimization.md` | sonnet | TARGET_SET | `03-optimization.md` |
| `agents/tune-run-analyzer.md` × ceil(R/3) | sonnet | see analyzer Input block below | `run-{NN}.md` |

If STATIC_ONLY: skip the `tune-run-analyzer` row (the behavioral row); spawn only the three static validators.

Input block for the three static validators (matches their `# Input` contracts):
```
Input:
  files: {newline-separated TARGET_SET + NEIGHBORHOOD paths; TARGET_SET only for audit-optimization}
  scope: all
  output: {REPORTS_DIR}/{output filename from the table}
```
Input block per tune-run-analyzer instance (fields match its `# Input`):
```
Input:
  target_file: {TARGET}
  kind: {KIND}
  chain_files: {TARGET_SET child paths, or "none"}
  bundle_dirs: {newline-separated, 1–3 bundle dirs for this instance}
  output_dir: {RUN_REPORTS}
```
Append this appendix to the three static validators' prompts (replaces system-audit's severity block; not used for tune-run-analyzer):
```
Severity: CRITICAL = wrong output/broken contract in real use; MEDIUM = recurring friction, contract drift, misleading instruction; LOW = bloat, dead text, token waste.
Report only findings involving {TARGET_SET paths}; optimization and bloat-removal findings ARE in scope but must cite concrete text. Do NOT report: theoretical edge cases, defensive hardening, style preferences without token or clarity impact.
A clean report is a success — if the files already meet the bar, return zero findings rather than stylistic rewrites. Every finding must name its concrete cost: quantified token waste (quote the span AND the shorter equivalent), a contradiction (quote both sides), or an ambiguity with two stated divergent readings. "Could be clearer/tighter" without measurable cost is not a finding.
```
Wait for all analyzers before Phase 3.

## Phase 3: Synthesize

Spawn `tune-synthesizer` (`subagent_type: general-purpose`, `model: fable`):
```
Read instructions at ~/.claude/agents/tune-synthesizer.md.
Input:
  target_set: {TARGET_SET}
  run_reports_dir: {RUN_REPORTS}
  bundles_dir: {BUNDLES}
  neighborhood: {NEIGHBORHOOD or "none"}
  output: {REPORTS_DIR}/04-behavior.md
```
Skip this phase if STATIC_ONLY.

## Phase 4: Aggregate & Verify

1. Spawn `audit-deduplicator` (`subagent_type: general-purpose`, `model: sonnet`): `reports_dir: {REPORTS_DIR}`, `decisions_file: {DECISIONS_FILE}`.
2. Spawn `tune-verifier` (`subagent_type: general-purpose`, `model: fable`): `findings_file: {DEDUP_FILE}`, `reports_dir: {REPORTS_DIR}`, `target_set: {TARGET_SET}`, `output_file: {VERIFIED_FILE}`.
3. Read `{VERIFIED_FILE}` and the `## Statistics` section of `{DEDUP_FILE}` (source of the filtered-by-skip-list count). 0 verified → "Chain {target} clean over N runs." → Phase 7. Else show overview: N verified (C/M/L), N FP, N insufficient, N filtered by skip-list.

## Phase 5: Review

Classify each verified finding per `~/.claude/docs/ASK_POLICY.md`: **Business** — removes or weakens a rule/guardrail, or the options cannot be ranked without the user's priorities; **Technical** — everything else, including findings with alternatives where one is dominant (you would recommend it without hesitation) — auto-accept the recommendation; the post-loop digest is the user's override channel. No clear recommendation → Business.

Technical findings → step 3 directly, no question, recommendation = agreed change. Then for each Business finding (critical → medium → low):

1. Present: severity, ID, type, runs cited, target file, evidence quotes, recommendation. Show the Rule-Coverage / Chain-Contract matrix row when relevant. Read source files on-demand.
2. AskUserQuestion: **Fix** / **Reject** / **Skip**.
3. Fix → agree on the exact change; read the target section first to verify the action fits existing structure. Append to `{REPORTS_DIR}/fix-plan.md`:
   ```
   ## Fix {ID}: {title}
   - **Target:** {file path}
   - **Type:** {finding type if present, e.g. CONTRACT_DRIFT}
   - **Action:** {REPLACE/DELETE/ADD with explicit CURRENT and REPLACEMENT text}
   - **Context:** {discussion summary}
   ```
4. Reject → brief reason. Initialize DECISIONS_FILE with `## Rejected` header if missing, append:
   `- [YYYY-MM-DD] [tune] {ID} {files}: {description} — reason: "{reason}"`
5. Skip → initialize `## Skipped` header in DECISIONS_FILE if missing, append:
   `- [YYYY-MM-DD] [tune] {ID} {files}: {description}`. Skipped findings are filtered by the deduplicator on future runs (same as rejected); clearing the section resurfaces them.

Progress: `[3/N | next: B-02 — description]`. After all: show a digest of auto-accepted Technical fixes (`{ID} — {target} — {one-line action}`) — silently applied ≠ invisible; user may demote any line to the Business loop before proceeding. Then: fix-plan.md exists → Phase 6, else → Phase 7.

## Phase 6: Apply & Chain Check

1. Spawn `audit-applier` (`subagent_type: general-purpose`, `model: sonnet`): `fix_plan: {REPORTS_DIR}/fix-plan.md`.
2. Parse CHANGED_FILES → CHANGED_MD (.md only). Not empty → spawn `validator-doc-system` (`model: sonnet`) per the spawn rule in # Rules, Input: `changed_files: {CHANGED_MD}`. CLEAN → continue; ISSUES → show user, append agreed corrections as new `## Fix` blocks to fix-plan.md, re-run audit-applier, re-validate (max 2 extra cycles).
3. **Chain check**: if >1 TARGET_SET file changed, or any applied fix was CONTRACT_DRIFT → spawn `audit-consistency` (`model: sonnet`) with `files: {CHANGED_FILES + every TARGET_SET/NEIGHBORHOOD file that references or is referenced by a CHANGED_FILE — grep -l both directions}`, `scope: all`, `output: {REPORTS_DIR}/10-chain-check.md`, prompt appendix: `Verify parent↔child contracts still align after recent edits — spawn prompts vs # Input sections, # Output specs vs what parents parse. Report only misalignments.` Findings → show user, AskUserQuestion: **Fix chain issues** / **Skip**. Fix → append as `## Fix` blocks to a new fix-plan.md, re-run step 1 (once); Skip → continue to step 4.
4. `git -C ~/.claude add {CHANGED_FILES} && git commit -m "tune: {target} — {N} change(s)"`.

## Phase 7: Record & Cleanup

Append to OBSERVATIONS_FILE (create if missing, 20 entries max):
```
## YYYY-MM-DD — {target} ({kind}, chain: N files | solo)
- runs: N analyzed (window {oldest}..{newest}), child runs: N, channels: A:N B1:N B2:N
- findings: raw N → dedup N → verified N (C:N M:N L:N), FP: N, filtered: N
- fixed: N (files: {list}), rejected: N, skipped: N
- notes: {one-line key pattern}
```
Apply succeeded → `find {BUNDLES} {RUN_REPORTS} -mindepth 1 -delete 2>/dev/null; rm -f {REPORTS_DIR}/*.md`. Apply failed/partial → keep `fix-plan.md`, delete the rest.

Final: "Tuned {target}: fixed N, rejected N, skipped N."

# Edge Cases

- 0 runs → static-only or stop; fresh < 3 with stale present → freshness-gate choice (both Phase 1).
- Built-in agent as TARGET → stop (Phase 0). Built-in/external types among children → analyzed only via their invocations from the parent (prompt contract + downstream fate), no file findings.
- All findings filtered by skip-list → "All known issues reviewed. Clear skip-list?"
- DECISIONS_FILE >100 entries → warn, suggest cleanup.
- Analyzer fails → skip it; tune-run-analyzer batch fails → continue with remaining run reports (<3 reports → pattern thresholds unreachable: warn, present only CRITICAL singles).
- audit-applier fails mid-apply → report partial progress; fix-plan retention per Phase 7.
- User interrupts Phase 5 → rejects saved, fix-plan partial → pending-fix-plan path next run.
- Self-target → edits apply next invocation; current session's transcript excluded from discovery.

# Start

Phase 0.
