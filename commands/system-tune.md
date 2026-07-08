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
- AskUserQuestion timeout (no answer): analysis gates (Phase 0–1 choices) → proceed with the option you would recommend and note it in the final summary. Decision gates (purpose checkpoint, Phase 5 finding decisions, Phase 6 validator/chain-check fixes, REGRESSED fixes) → never decide for the user: leave the item undecided (no decisions.md entry), continue the pipeline, apply/commit only what is already authorized (auto-accepted Technical fixes and explicitly answered Fix decisions), and end the run with an "Unanswered questions" list restating each timed-out question — the user answers later and the fixes are applied then.
- Match user's language. AskUserQuestion for structured decisions, plain text for open-ended discussion.
- Never Read a raw `.jsonl` — extraction uses grep/jq/sed slices only.
- Targeted edits only: every fix action is REPLACE/DELETE/ADD of a specific span with explicit CURRENT/REPLACEMENT — never a file or section rewrite.
- Spawn models strictly per the Phase tables: extraction/static/dedup/apply = `sonnet`; synthesis/verification = `fable`; if the spawn fails with a model-availability error → retry once with `opus`.
- Every agent spawn uses `subagent_type: general-purpose`; prompt = `Read instructions at ~/.claude/agents/{agent}.md. Follow all rules, checks, output format.` + the Input fields listed at the spawn site, optionally followed by one short run-context note (staleness of bundles, already-applied fix IDs, execution constraints) — nothing else. This applies to ALL phases (2–6).
- Shell variables holding raw jsonl records break on `echo` (control characters) — always pipe via temp file: `grep -m1 ... > $BUNDLE/.record.json`, then `jq ... $BUNDLE/.record.json`.

# Conventions

- `P` = `~/.claude/projects`
- `MEMORY` = `~/.claude/agent-memory/system-tune`
- `TARGET` = resolved path of the tuning subject: `~/.claude/agents/{NAME}.md` or `~/.claude/commands/{NAME}.md`
- `REPORTS_DIR` = `{MEMORY}/reports/`
- `BUNDLES` = `{REPORTS_DIR}/runs/`
- `RUN_REPORTS` = `{REPORTS_DIR}/run-reports/`
- `DECISIONS_FILE` = `{MEMORY}/decisions.md`
- `PURPOSE_FILE` = `{MEMORY}/purpose.md`
- `FIXES_FILE` = `{MEMORY}/fixes.md` (ledger of applied fixes awaiting outcome confirmation)
- `STATE_FILE` = `{MEMORY}/state.md` (per-target `last_analyzed` watermark)
- `OBSERVATIONS_FILE` = `{MEMORY}/observations.md`
- `DEDUP_FILE` = `{REPORTS_DIR}/08-deduplicated.md`
- `VERIFIED_FILE` = `{REPORTS_DIR}/09-verified.md`

# Workflow

## Phase 0: Resolve & Load

1. `mkdir -p {BUNDLES} {RUN_REPORTS}`. If `{REPORTS_DIR}/fix-plan.md` exists (previous partially-applied run) → ask via AskUserQuestion: **Apply pending fix-plan** (run Phase 6 on it now; on success delete it, then continue fresh) / **Discard** (delete it). Then clear stale artifacts: `find {REPORTS_DIR} -name "0*.md" -delete; find {BUNDLES} {RUN_REPORTS} -mindepth 1 -delete 2>/dev/null; mkdir -p {BUNDLES} {RUN_REPORTS}`.
2. Parse `$ARGUMENTS`: token 1 = NAME (strip leading `/` and trailing `.md`); remaining tokens: positive integer → RUNS = min(value, 20); `all` → RUNS = 20; `solo` → SOLO = true; no integer → RUNS = 10.
3. Resolve NAME:
   - `~/.claude/agents/{NAME}.md` exists → KIND = agent; `~/.claude/commands/{NAME}.md` exists → KIND = command; both exist → AskUserQuestion which one.
   - Neither → case-insensitive substring search over `ls ~/.claude/agents ~/.claude/commands`: 1 hit → AskUserQuestion "Found '{hit}' — tune this?" **Yes** / **No** (No → stop); 2–4 hits → AskUserQuestion "Multiple matches found. Which did you mean?" with each hit as a labeled option + **None of these** (→ stop); >4 → list them, stop; 0 hits → if NAME is a built-in agent type (Explore, Plan, general-purpose, claude, etc.) → "built-in agent — no local .md to tune" → stop; else → "not found" + list available names → stop.
   - NAME = `system-tune` → allowed; note edits take effect on the next invocation.
4. **Build TARGET_SET** (skip if SOLO → TARGET_SET = {TARGET}): collect child agents of TARGET — every `~/.claude/agents/{x}.md` whose name appears in TARGET's text as a spawn reference (`subagent_type: {x}`, `agents/{x}.md`, or the name as first word of a wrapper prompt). Recurse into each child file (visited-set guards cycles). Wrapper targets (no static child references, e.g. super-agent/codex): script files TARGET invokes by path (`~/.claude/bin/*.sh`) join TARGET_SET as analysis surface, and after Phase 1 discovery the runtime delegates observed in the bundled runs (real child name per the child-bundle rule) join TARGET_SET too — re-show the chain then. Built-in types among children (Explore, Plan, …) are noted but have no file. Show the chain before proceeding: `{target} → {child}, {child}; {child} → …`. If TARGET_SET > 8 files → state the file count and expected extra cost in one line and proceed full-chain (rerun with `solo` to skip the chain).
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

LAST_EDIT = newest file mtime across TARGET_SET (`stat -f %m {paths} | sort -n | tail -1`). A discovered run whose transcript mtime ≤ LAST_EDIT is STALE — it executed an older version of the instructions; analyzing it re-litigates text that already changed. Exclude STALE runs from bundling. If fresh runs < 3 and STALE > 0 → include the stale runs (warn once that RULE_VIOLATION/DEAD_RULE findings may target already-fixed behavior; mark them STALE in the manifest). Do not ask — "Include stale" is the standing default; static-only remains reachable via the 0-runs gate.

### Early exit — nothing new since last tune

After the freshness gate: read the `- {NAME}: last_analyzed={epoch}` line from {STATE_FILE} (skip this check if absent). If LAST_EDIT ≤ last_analyzed AND the newest fresh run's transcript mtime ≤ last_analyzed → the full pipeline would re-analyze exactly what the previous tune already saw. AskUserQuestion: **Stop** (Recommended — "no new runs and no edits since last tune; use the target, then re-tune") / **Re-analyze anyway** (proceed).

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

For KIND = command (session S): `00` = `{ts, cwd, branch, lines}`; `01` = `<command-args>` from the `<command-name>/{NAME}` marker record; `03/04` from records matching `"attributionSkill":"{NAME}"`; `05` = their error tool_results; `02` = text blocks of the last attributed assistant record; `07` = the usage aggregate (same jq as the A/B1 recipe) over attributed assistant records; plus `08-questions.txt` = AskUserQuestion tool_use inputs paired with the user answers; `06` = user free-text records after the last attributed record (corrections). Compute attributed/total session line counts; if unattributed records follow the last attributed one, write `gap: attributed N/M lines — post-gap phases unobservable` into `00-meta.json` and the run's manifest row (post-gap records may belong to an unrelated resumed conversation — extend extraction past the gap only while they continue this same run: no new `<command-name>` marker, and the records are task-notifications for this run's children or reference this run's {REPORTS_DIR} artifacts; stop at the first record that fails this test). Child invocations: Agent tool_use records with `"attributionSkill":"{NAME}"` — note `attributionSkill` exists only on the tool_use side; join each result via its `id` → `"tool_use_id"`.

### Child bundles (skip if SOLO)

Per run, for each child invocation: real child name = `subagent_type`, unless `subagent_type` is `super-agent`/`codex` → first word of `.input.prompt`. For children in TARGET_SET, write light bundle `{run}/children/{child}-{id8}/`: `00-meta.json` + `01-input-prompt.txt` + `02-final-output.txt` from the joined tool_use/tool_result pair. Full bundle (via the child's own transcript, `agentId` → `subagents/agent-{agentId}.jsonl`) only when its `status` ≠ completed or downstream shows correction/respawn — max 3 full child bundles per run.

Write `{REPORTS_DIR}/runs-manifest.md`: one row per run (`bundle | channel | ts | status | tokens | children: n`) + discovery totals per channel + stale-excluded count. 0 runs to bundle and the freshness gate didn't already ask → AskUserQuestion: **Static-only** (set STATIC_ONLY, Phase 2 without behavioral row) / **Stop**. Fewer than RUNS → proceed, note the count.

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
Report only findings involving {TARGET_SET paths}. A clean report is a success: if the files already meet the bar, return zero findings.
CONVERGENCE RULE — this is the bar that makes repeated runs on the same file stop finding things. A finding is valid ONLY if its fix REMOVES a distinct identifiable unit or repairs an objective defect:
  - a duplicated block/rule stated in two places (quote both locations),
  - a dead reference — a phase/variable/file/agent/section that no longer exists,
  - a direct contradiction (quote both sides),
  - a purpose-coherence gap — the target's stated purpose (`description` or `# Role`) contradicted by what its workflow actually specifies (quote both sides: the claim and the diverging step),
  - a vague term whose two divergent readings you can both state explicitly,
  - a whole sentence or clause that adds no constraint not already stated elsewhere.
A rewrite that PRESERVES an instruction while only making it shorter or "clearer" is NOT a finding — even if it saves tokens. That supply of rephrasings is infinite and never converges; it is exactly the "improvement for improvement's sake" this command must not produce. Do not propose rephrasings, reorderings, or stylistic polish of text that must stay. If the only remaining candidates are meaning-preserving rewrites, the file is done — return zero.
Every finding must include an `- **Impact:**` line — the concrete benefit: which wrong behavior the defect causes (or can cause, with the divergent readings named), or how much dead/duplicated text is removed. "Cleaner", "clearer", "more consistent style" is not an impact. ADD recommendations must state their ongoing cost (the added text is loaded on every future run) and why the benefit outweighs it.
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
  pending_fixes: {lines matching " {NAME} " from {FIXES_FILE}, or "none"}
  output: {REPORTS_DIR}/04-behavior.md
```
If STATIC_ONLY: still spawn, but pass `run_reports_dir: none` and `bundles_dir: none` — the synthesizer runs in static mode (purpose & boundaries assessment + BOUNDARY_* findings only, no behavioral findings).

## Phase 4: Aggregate & Verify

1. Spawn `audit-deduplicator` (`subagent_type: general-purpose`, `model: sonnet`): `reports_dir: {REPORTS_DIR}`, `decisions_file: {DECISIONS_FILE}`.
2. Spawn `tune-verifier` (`subagent_type: general-purpose`, `model: fable`): `findings_file: {DEDUP_FILE}`, `reports_dir: {REPORTS_DIR}`, `target_set: {TARGET_SET}`, `output_file: {VERIFIED_FILE}`.
3. Read `{VERIFIED_FILE}` and the `## Statistics` section of `{DEDUP_FILE}` (source of the filtered-by-skip-list count). 0 verified → "Chain {target} clean over N runs." → Phase 5 (purpose checkpoint + fix outcomes only, skip the finding loop) → Phase 7. Else show overview: N verified (C/M/L), N FP, N insufficient, N marginal, N filtered by skip-list.

## Phase 5: Review

Classify each verified finding per `~/.claude/docs/ASK_POLICY.md`: **Business** — removes or weakens a rule/guardrail, or the options cannot be ranked without the user's priorities; **Technical** — everything else, including findings with alternatives where one is dominant (you would recommend it without hesitation) — auto-accept the recommendation; the post-loop digest is the user's override channel. No clear recommendation → Business.

**Purpose checkpoint (fires at most once, before the finding loop).** Read `04-behavior.md` → `## Purpose & boundaries`. FINGERPRINT = `md5 -q` of a temp file holding the target's frontmatter `description` value + `# Role` section text. Route by verdicts:
- All three verdicts positive (`clear`/`aligned`/`clean`) → relay the `declared` and `system role` lines to the user in one short message (no question) and go to the loop.
- Any non-clean verdict, and {PURPOSE_FILE} has a `confirmed {NAME} {FINGERPRINT}` entry with no run-quoted friction newer than that entry's date → one line "purpose confirmed {date}; re-raised only on text change or new friction" → loop.
- Otherwise present in one message: declared purpose, revealed purpose, the target's role in the system (each caller and what it expects — from the Chain-Contract Matrix when runs exist, and NEIGHBORHOOD), and every non-clean verdict with its quotes. Discuss in plain text until the disagreement is concrete, then AskUserQuestion: **Purpose is right** (append `- [YYYY-MM-DD] confirmed {NAME} {FINGERPRINT}` to {PURPOSE_FILE}, create with `## Confirmed` header if missing; proceed) / **Correct it** (agree the exact `description`/`# Role` wording — keep discussing until it reads unambiguously to both sides; append a `## Fix` block to `{REPORTS_DIR}/fix-plan.md` per the format below; no confirmation record — the corrected text re-assesses under its own fingerprint next run) / **Defer** (record nothing, proceed).

This checkpoint is the only place the command questions the goal itself; BOUNDARY_* findings (responsibility overlaps/gaps with neighbors) go through the normal finding loop and are always Business — redistributing responsibility is the user's call.

**Fix outcomes (after the purpose checkpoint, before the finding loop).** Read `04-behavior.md` → `## Fix outcomes`; skip if "none pending" or "not checkable". Show one line per fix, then update {FIXES_FILE}:
- CONFIRMED → delete the entry (the fix proved out; observations keeps the history).
- NOT_CONFIRMED → increment the entry's `checks:` counter; at `checks: 2` delete the entry and note it as unverifiable in the Phase 7 observations line.
- REGRESSED → AskUserQuestion per fix: **Revert** (reconstruct the original span from `git -C ~/.claude show {commit from the entry}`, append a reverse `## Fix` block to `{REPORTS_DIR}/fix-plan.md`, delete the entry) / **Keep** (delete the entry — current state accepted despite the regression).

Technical findings → step 3 directly, no question, recommendation = agreed change. Then for each Business finding (critical → medium → low):

1. Present: severity, ID, type, runs cited, target file, evidence quotes, impact, recommendation. Show the Rule-Coverage / Chain-Contract matrix row when matrices exist (non-STATIC_ONLY) and the finding appears in a matrix row. Read source files on-demand.
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

Progress: `[3/N | next: B-02 — description]`. After all: show a digest of auto-accepted Technical fixes (`{ID} — {target} — {one-line action} — {impact}`) — silently applied ≠ invisible; user may demote any line to the Business loop before proceeding. Then: fix-plan.md exists → Phase 6, else → Phase 7.

## Phase 6: Apply & Chain Check

1. Spawn `audit-applier` (`subagent_type: general-purpose`, `model: sonnet`): `fix_plan: {REPORTS_DIR}/fix-plan.md`.
2. Parse CHANGED_FILES → CHANGED_MD (.md only). Not empty → spawn `validator-doc-system` (`model: sonnet`) per the spawn rule in # Rules, Input: `changed_files: {CHANGED_MD}`. CLEAN → continue; ISSUES → for each issue: if it falls outside the applied fix spans, or a Phase 2 analyzer already examined and cleared that content → note it in one line and do not ask. Otherwise classify per the Phase 5 rule: Technical → append a `## Fix` block to fix-plan.md without asking and show the user one line `{target} — {action}`; Business → show, AskUserQuestion **Fix** / **Skip**. Before each re-run: overwrite fix-plan.md so it contains only the new `## Fix` blocks (applied blocks never carry over to a later cycle), then re-run audit-applier and re-validate (max 2 extra cycles).
3. **Chain check**: if >1 TARGET_SET file changed, or any applied fix was CONTRACT_DRIFT → spawn `audit-consistency` (`model: sonnet`) with `files: {CHANGED_FILES + every TARGET_SET/NEIGHBORHOOD file that references or is referenced by a CHANGED_FILE — grep -l both directions}`, `scope: all`, `output: {REPORTS_DIR}/10-chain-check.md`, prompt appendix: `Verify parent↔child contracts still align after recent edits — spawn prompts vs # Input sections, # Output specs vs what parents parse. Report only misalignments.` Findings → show user, AskUserQuestion: **Fix chain issues** / **Skip**. Fix → overwrite fix-plan.md with a fresh file containing only the chain-check `## Fix` blocks, re-run step 1 (once); Skip → continue to step 4.
4. `git -C ~/.claude add {CHANGED_FILES} && git commit -m "tune: {target} — {N} change(s)"`. Then for each applied fix whose finding cited runs (behavioral — its effect is only observable at runtime), append to {FIXES_FILE} (create with `## Pending` header if missing):
   `- [YYYY-MM-DD] {NAME} {ID} {type} {file}: {one-line action} — expect: {impact one-liner} — commit {short hash} — checks: 0`
   Static-evidence fixes (deleted duplicate, dead reference) get no entry — their effect is verified at apply time.

## Phase 7: Record & Cleanup

Append to OBSERVATIONS_FILE (create if missing, 20 entries max):
```
## YYYY-MM-DD — {target} ({kind}, chain: N files | solo)
- runs: N analyzed (window {oldest}..{newest}), child runs: N, channels: A:N B1:N B2:N
- findings: raw N → dedup N → verified N (C:N M:N L:N), FP: N, filtered: N
- fixed: N (files: {list}), rejected: N, skipped: N
- fix outcomes: confirmed N, unverifiable N, regressed N (kept/reverted) — omit line if none checked
- notes: {one-line key pattern}
```
Update {STATE_FILE} (create if missing): replace the `- {NAME}:` line (or append) with `- {NAME}: last_analyzed={newest bundled transcript mtime, epoch} [{YYYY-MM-DD}]`. Skip if STATIC_ONLY (no runs analyzed — the watermark must not advance).
Apply succeeded → `find {BUNDLES} {RUN_REPORTS} -mindepth 1 -delete 2>/dev/null; rm -f {REPORTS_DIR}/*.md`. Apply failed/partial → keep `fix-plan.md`, delete the rest.

Final: "Tuned {target}: fixed N, rejected N, skipped N."

# Edge Cases

- 0 runs → static-only or stop; fresh < 3 with stale present → stale runs included by default (both Phase 1).
- Built-in agent as TARGET → stop (Phase 0). Built-in/external types among children → analyzed only via their invocations from the parent (prompt contract + downstream fate), no file findings.
- All findings filtered by skip-list → "All known issues reviewed. Clear skip-list?"
- DECISIONS_FILE >100 entries → warn, suggest cleanup.
- Analyzer fails → skip it; tune-run-analyzer batch fails → continue with remaining run reports (<3 reports → pattern thresholds unreachable: warn, present only CRITICAL singles).
- Phase 3–6 pipeline agent fails, or returns DONE without its declared output file existing (always check with `ls`) → respawn once with the same Input; second failure → stop, report partial state per Phase 7.
- audit-applier fails mid-apply → report partial progress; fix-plan retention per Phase 7.
- User interrupts Phase 5 → rejects saved, fix-plan partial → pending-fix-plan path next run.
- Self-target → edits apply next invocation; current session's transcript excluded from discovery.

# Start

Phase 0.
