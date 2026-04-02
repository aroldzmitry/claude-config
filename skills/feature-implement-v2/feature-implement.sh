#!/usr/bin/env bash
set -euo pipefail

# Feature implementation orchestrator — script-based.
# Replaces the LLM-orchestrated feature-implement.md command.
# Usage: feature-implement.sh [--no-commit] [--validator-model MODEL] <feature-name>

# ── Parse flags ────────────────────────────────────────────────────────────────

NO_COMMIT=false
MODEL_OVERRIDE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-commit) NO_COMMIT=true; shift ;;
    --model) MODEL_OVERRIDE="$2"; shift 2 ;;
    *) break ;;
  esac
done

# ── Constants ──────────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BIN_DIR="$HOME/.claude/bin"
FEATURE="${1:?Usage: feature-implement.sh [--no-commit] [--model MODEL] <feature-name>}"
SPEC_DIR="temp/$FEATURE"

# ── State ──────────────────────────────────────────────────────────────────────

unresolved_steps=()
test_decision=""
ai_iter=0
test_iter=0
model_flag=""
[[ -n "$MODEL_OVERRIDE" ]] && model_flag="--model $MODEL_OVERRIDE"

# ── Helpers ────────────────────────────────────────────────────────────────────

die() { echo "ERROR: $*" >&2; exit 1; }

log_phase() { echo -e "\n[Phase $1: $2]"; }

log() { echo "$*"; }

# Run an agent synchronously and extract plain text from JSON result.
# Usage: run_agent [--backend codex] [--model MODEL] <agent-name> <task-body>
run_agent() {
  local backend="claude" model_flag=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --backend) backend="$2"; shift 2 ;;
      --model) model_flag="--model $2"; shift 2 ;;
      *) break ;;
    esac
  done

  local agent_name="${1:?agent name required}"
  local task_body="${2:-}"

  local output exit_code=0
  output=$("$BIN_DIR/run-agent.sh" --backend "$backend" $model_flag "$agent_name" "$task_body") || exit_code=$?

  if (( exit_code != 0 )); then
    echo "ERROR: agent $agent_name failed (exit code $exit_code)" >&2
    echo "ERROR: agent $agent_name failed"
    return 1
  fi

  # Extract text from JSON result line (same logic as launch-agent.sh)
  python3 -c "
import sys, json
raw = sys.stdin.read().strip()
for line in raw.splitlines():
    line = line.strip()
    if not line:
        continue
    try:
        d = json.loads(line)
        if d.get('type') == 'result':
            print(d.get('result', '')); sys.exit(0)
        if d.get('type') == 'item.completed':
            item = d.get('item', {})
            text = item.get('text', '')
            if not text:
                content = item.get('content', [])
                if isinstance(content, list):
                    parts = [c.get('text','') for c in content if isinstance(c, dict)]
                    text = ''.join(parts)
            if text: print(text); sys.exit(0)
    except (json.JSONDecodeError, KeyError, AttributeError):
        pass
print(raw)
" <<< "$output"
}

# Poll an async session until complete.
# Usage: wait_session <session-dir>
wait_session() {
  local session_dir="$1"
  while true; do
    local result
    result=$("$BIN_DIR/launch-agent.sh" poll "$session_dir")
    if [[ "$result" != "WAITING" ]]; then
      echo "$result"
      return
    fi
    sleep 5
  done
}

# Extract step blocks from a plan file as JSON array.
# Each element: {"n": "1", "title": "...", "body": "..."}
extract_steps() {
  local plan_file="$1"
  python3 - "$plan_file" << 'PYEOF'
import re, json, sys

text = open(sys.argv[1]).read()
pattern = r'(### Step \d+:.*?)(?=### Step \d+:|$)'
matches = re.findall(pattern, text, re.DOTALL)
steps = []
for m in matches:
    header = m.split('\n')[0]
    num_match = re.search(r'Step (\d+)', header)
    if not num_match:
        continue
    num = num_match.group(1)
    title = header.split(':', 1)[1].strip() if ':' in header else ''
    steps.append({'n': num, 'title': title, 'body': m.strip()})
print(json.dumps(steps))
PYEOF
}

# Compute changed files from git status, excluding deletions and non-source files.
compute_changed_files() {
  git status --porcelain | while IFS= read -r line; do
    local xy="${line:0:2}"
    local file="${line:3}"

    # Skip deletions (staged: "D ", working-tree: " D")
    [[ "${xy:0:1}" == "D" ]] && continue
    [[ "${xy:1:1}" == "D" ]] && continue

    # Skip non-source files
    case "$file" in
      *.lock) continue ;;
      *.png|*.jpg|*.jpeg|*.gif|*.svg|*.ico|*.webp) continue ;;
      *.woff|*.woff2|*.ttf|*.eot|*.otf) continue ;;
      *.mp4|*.webm|*.mov|*.avi) continue ;;
      *.min.*|*.map) continue ;;
      *.d.ts|*.generated.*|*.snap) continue ;;
      dist/*|build/*|vendor/*|node_modules/*|temp/*) continue ;;
    esac

    echo "$file"
  done
}

# Stage files for commit, applying same exclusion filters.
stage_files() {
  git status --porcelain | while IFS= read -r line; do
    local xy="${line:0:2}"
    local file="${line:3}"

    # Skip non-source files
    case "$file" in
      *.lock|*.png|*.jpg|*.jpeg|*.gif|*.svg|*.ico|*.webp) continue ;;
      *.woff|*.woff2|*.ttf|*.eot|*.otf) continue ;;
      *.mp4|*.webm|*.mov|*.avi) continue ;;
      *.min.*|*.map) continue ;;
      *.d.ts|*.generated.*|*.snap) continue ;;
      dist/*|build/*|vendor/*|node_modules/*|temp/*) continue ;;
    esac

    # Working-tree deletion (second char D)
    if [[ "${xy:1:1}" == "D" ]]; then
      git rm --cached "$file" 2>/dev/null || true
      continue
    fi

    # Already-staged deletion (first char D, second space) — skip
    [[ "${xy:0:1}" == "D" && "${xy:1:1}" == " " ]] && continue

    # Everything else
    git add "$file"
  done
}

# ── Phase 0: Load & Validate ──────────────────────────────────────────────────

phase_0() {
  local dirty
  dirty=$(git diff --stat HEAD 2>/dev/null)
  [[ -n "$dirty" ]] && die "Working tree has uncommitted changes. Commit or stash first."

  [[ ! -f "$SPEC_DIR/technical-requirements.md" ]] && die "Run /feature-tech $FEATURE first."

  # Check which optional spec files exist
  local specs=("technical-requirements.md")
  [[ -f "$SPEC_DIR/business-requirements.md" ]] && specs+=("business-requirements.md")
  [[ -f "$SPEC_DIR/ui-requirements.md" ]] && specs+=("ui-requirements.md")
  [[ -f "$SPEC_DIR/test-cases.md" ]] && specs+=("test-cases.md")
  log "Spec files: ${specs[*]}"
}

# ── Phase 1: Planning ─────────────────────────────────────────────────────────

phase_1() {
  log_phase 1 "Planning"

  # Create plan
  log "[Creating implementation plan...]"
  local planner_response
  planner_response=$(run_agent $model_flag planner "feature: $FEATURE
spec_dir: $SPEC_DIR")

  [[ ! -f "$SPEC_DIR/implementation-plan.md" ]] && die "Planner failed to produce implementation plan. Re-run."

  # Extract test decision
  test_decision=$(echo "$planner_response" | grep -o 'TEST: .*' || echo "TEST: write")
  log "[Plan created. $test_decision]"

  # Dual-LLM plan validation
  mkdir -p "$SPEC_DIR/validation/plan/"

  log "[Validating plan (Claude + Codex)...]"
  local claude_session codex_session
  claude_session=$("$BIN_DIR/launch-agent.sh" launch $model_flag plan-validator \
    "feature: $FEATURE
spec_dir: $SPEC_DIR
output_file: $SPEC_DIR/validation/plan/claude.md")
  codex_session=$("$BIN_DIR/launch-agent.sh" launch --backend codex plan-validator \
    "feature: $FEATURE
spec_dir: $SPEC_DIR
output_file: $SPEC_DIR/validation/plan/codex.md")

  local claude_response codex_response
  claude_response=$(wait_session "$claude_session")
  codex_response=$(wait_session "$codex_session")

  # Check results
  local needs_revision=false
  [[ "$claude_response" == *"HAS_ISSUES"* ]] && needs_revision=true
  [[ "$codex_response" == *"HAS_ISSUES"* ]] && needs_revision=true
  # Codex NO_OUTPUT = clean

  if $needs_revision; then
    log "[Plan has issues — revising...]"
    planner_response=$(run_agent $model_flag planner "feature: $FEATURE
spec_dir: $SPEC_DIR
revision_dir: $SPEC_DIR/validation/plan/")

    # Re-extract test decision after revision
    local new_test
    new_test=$(echo "$planner_response" | grep -o 'TEST: .*' || echo "")
    [[ -n "$new_test" ]] && test_decision="$new_test"
    log "[Plan revised. $test_decision]"
  else
    log "[Plan validation: clean]"
  fi
}

# ── Phase 2: Implementation ───────────────────────────────────────────────────

phase_2() {
  log_phase 2 "Implementation"

  local steps_json
  steps_json=$(extract_steps "$SPEC_DIR/implementation-plan.md")
  local total
  total=$(echo "$steps_json" | jq length)

  (( total == 0 )) && die "implementation-plan.md has no steps"

  for i in $(seq 0 $((total - 1))); do
    local n title body
    n=$(echo "$steps_json" | jq -r ".[$i].n")
    title=$(echo "$steps_json" | jq -r ".[$i].title")
    body=$(echo "$steps_json" | jq -r ".[$i].body")

    log "[Step $n/$total: $title]"

    local response
    response=$(run_agent $model_flag coder "mode: implement
feature: $FEATURE
spec_dir: $SPEC_DIR
step_number: $n
step_total: $total
step_body: $body") || {
      unresolved_steps+=("Step $n: $title — agent crashed")
      continue
    }

    if [[ "$response" == *"UNRESOLVED"* ]]; then
      local summary
      summary=$(echo "$response" | grep -o 'UNRESOLVED: .*' | sed 's/UNRESOLVED: //')
      unresolved_steps+=("Step $n: $title — $summary")
      log "[Step $n: UNRESOLVED — $summary]"
    else
      log "[Step $n: DONE]"
    fi
  done
}

# ── Phase 3: Test Writing ─────────────────────────────────────────────────────

phase_3() {
  log_phase 3 "Test Writing"

  if [[ "$test_decision" == *"skip"* ]]; then
    local reason
    reason=$(echo "$test_decision" | sed 's/TEST: skip — //' | sed 's/TEST: skip/no reason given/')
    log "[Tests: skipped — $reason]"
    return
  fi

  if [[ ! -f "$SPEC_DIR/test-cases.md" ]]; then
    log "[Generating test cases...]"
    local tp_response
    tp_response=$(run_agent $model_flag test-planner "feature: $FEATURE
spec_dir: $SPEC_DIR") || true

    if [[ "$tp_response" == *"ERROR"* ]]; then
      log "[Tests: planner error — $tp_response]"
      return
    fi
  fi

  log "[Writing tests...]"
  local tw_response
  tw_response=$(run_agent $model_flag test-writer "feature: $FEATURE
spec_dir: $SPEC_DIR") || true

  if [[ "$tw_response" == *"ERROR"* ]]; then
    log "[Tests: error — $tw_response]"
  else
    log "[Tests: $tw_response]"
  fi
}

# ── Phase 4: Validation Cycle ─────────────────────────────────────────────────

phase_4() {
  log_phase 4 "Validation"

  local changed_files
  changed_files=$(compute_changed_files)
  if [[ -z "$changed_files" ]]; then
    log "[No changed files to validate]"
    return
  fi

  local files_formatted
  files_formatted=$(echo "$changed_files" | sed 's/^/- /')

  while true; do
    log "[Running global validation (iter: test=$test_iter ai=$ai_iter)...]"

    local gv_response
    gv_response=$(run_agent $model_flag global-validator "feature: $FEATURE
spec_dir: $SPEC_DIR
skip_spec: false
files:
$files_formatted") || {
      unresolved_steps+=("Validation: global-validator crashed")
      break
    }

    if [[ "$gv_response" == "NO_ISSUES" || "$gv_response" == *"NO_ISSUES"* ]]; then
      log "[Validation: clean]"
      break
    fi

    # Rate limit or auth errors — skip validation, don't count as failure
    if [[ "$gv_response" == *"hit your limit"* || "$gv_response" == *"rate limit"* || "$gv_response" == *"AUTH_ERROR"* ]]; then
      log "[Validation: skipped — $gv_response]"
      unresolved_steps+=("Validation: skipped due to rate limit or auth error")
      break
    fi

    log "[Validation: $gv_response]"

    # Determine category
    local category=""
    if [[ "$gv_response" == *"(test)"* ]]; then
      category="test"
      ((test_iter++)) || true
      if (( test_iter >= 5 )); then
        unresolved_steps+=("Test: HAS_ISSUES after $test_iter fix cycles")
        log "[Test fix limit reached ($test_iter/5)]"
        break
      fi
    else
      category="ai"
      ((ai_iter++)) || true
      if (( ai_iter >= 2 )); then
        unresolved_steps+=("AI: HAS_ISSUES after $ai_iter fix cycles")
        log "[AI fix limit reached ($ai_iter/2)]"
        break
      fi
    fi

    # Generate fix plan
    log "[Generating fix plan...]"
    local planner_fix_response
    planner_fix_response=$(run_agent $model_flag planner "feature: $FEATURE
spec_dir: $SPEC_DIR
issues_file: validation/issues.md") || {
      unresolved_steps+=("Validation: fix planner crashed")
      break
    }

    if [[ ! -f "$SPEC_DIR/validation/fix-plan.md" ]]; then
      log "[No fix plan produced — stopping validation cycle]"
      break
    fi

    # Extract and execute fix steps
    local fix_steps_json
    fix_steps_json=$(extract_steps "$SPEC_DIR/validation/fix-plan.md")
    local fix_total
    fix_total=$(echo "$fix_steps_json" | jq length)

    if (( fix_total == 0 )); then
      log "[Fix plan has 0 steps — stopping validation cycle]"
      break
    fi

    log "[Applying $fix_total fix steps...]"
    for i in $(seq 0 $((fix_total - 1))); do
      local n title body
      n=$(echo "$fix_steps_json" | jq -r ".[$i].n")
      title=$(echo "$fix_steps_json" | jq -r ".[$i].title")
      body=$(echo "$fix_steps_json" | jq -r ".[$i].body")

      log "[Fix step $n/$fix_total: $title]"
      local response
      response=$(run_agent $model_flag coder "mode: implement
feature: $FEATURE
spec_dir: $SPEC_DIR
step_number: $n
step_total: $fix_total
step_body: $body") || {
        continue  # coder crash → next step
      }

      if [[ "$response" == *"UNRESOLVED"* ]]; then
        local summary
        summary=$(echo "$response" | grep -o 'UNRESOLVED: .*' | sed 's/UNRESOLVED: //')
        unresolved_steps+=("Fix step $n: $title — $summary")
      fi
    done

    # Recompute changed files for next validation round
    changed_files=$(compute_changed_files)
    if [[ -z "$changed_files" ]]; then
      log "[No changed files after fixes]"
      break
    fi
    files_formatted=$(echo "$changed_files" | sed 's/^/- /')
  done
}

# ── Phase 5: Finalize ─────────────────────────────────────────────────────────

phase_5() {
  log_phase 5 "Finalize"

  if $NO_COMMIT; then
    log "[--no-commit: skipping stage/commit. Changed files:]"
    git diff --stat HEAD 2>/dev/null || true
    print_report
    return
  fi

  # Stage files
  stage_files

  # Check if there's anything staged
  local stats
  stats=$(git diff --cached --stat)
  if [[ -z "$stats" ]]; then
    log "[No files staged — nothing to commit]"
  else
    # Derive commit message from technical-requirements.md
    local commit_desc
    commit_desc=$(python3 -c "
import re, sys
text = open(sys.argv[1]).read()
m = re.search(r'^#{1,2}\s+(.+)', text, re.MULTILINE)
if m:
    desc = m.group(1).strip()[:72]
    print(desc)
else:
    print(sys.argv[2])
" "$SPEC_DIR/technical-requirements.md" "$FEATURE")

    # Attempt commit with hook failure retry
    local commit_attempts=0
    while (( commit_attempts < 3 )); do
      if git commit -m "feat: $commit_desc" 2>/tmp/fi_commit_err.txt; then
        log "[Committed: feat: $commit_desc]"
        break
      fi
      ((commit_attempts++))

      if (( commit_attempts >= 3 )); then
        unresolved_steps+=("Commit hook failure after $commit_attempts attempts")
        log "[Commit failed after $commit_attempts attempts]"
        break
      fi

      log "[Commit hook failed (attempt $commit_attempts) — fixing...]"

      # Re-stage after formatter changes (macOS xargs has no -r flag)
      git diff --cached --name-only | xargs git add 2>/dev/null || true

      # Write hook errors to issues.md
      {
        echo ""
        echo "[open] Commit hook failure:"
        cat /tmp/fi_commit_err.txt 2>/dev/null || true
      } >> "$SPEC_DIR/validation/issues.md"

      # Call coder fix-ai
      run_agent $model_flag coder "mode: fix-ai
feature: $FEATURE
spec_dir: $SPEC_DIR
report_file: validation/issues.md" || true

      # Re-stage
      stage_files
    done
  fi

  # Create warnings folder if unresolved
  if (( ${#unresolved_steps[@]} > 0 )); then
    mkdir -p "temp/$FEATURE-warnings"

    # Write warnings technical-requirements.md
    {
      echo "# Unresolved Issues from $FEATURE"
      echo ""
      local idx=1
      for issue in "${unresolved_steps[@]}"; do
        echo "## $idx. $issue"
        echo ""
        ((idx++))
      done

      # Include open validation issues if available
      if (( ai_iter > 0 || test_iter > 0 )) && [[ -f "$SPEC_DIR/validation/issues.md" ]]; then
        echo "## Validation Context"
        echo ""
        grep '^\[open\]' "$SPEC_DIR/validation/issues.md" 2>/dev/null || true
      fi
    } > "temp/$FEATURE-warnings/technical-requirements.md"

    touch "temp/$FEATURE-warnings/NEXT--feature-fix"
  fi

  # Move spec dir to done
  rm -f "$SPEC_DIR"/NEXT--* 2>/dev/null || true
  mv "$SPEC_DIR" "${SPEC_DIR}-done"
  mkdir -p temp/done
  mv "${SPEC_DIR}-done" temp/done/

  # Print report
  print_report
}

# ── Report ─────────────────────────────────────────────────────────────────────

print_report() {
  local file_count
  file_count=$(git diff --stat HEAD~1 2>/dev/null | tail -1 | grep -o '[0-9]* file' | grep -o '[0-9]*' || echo "?")

  local test_status="written"
  [[ "$test_decision" == *"skip"* ]] && test_status="skipped"

  echo ""
  echo "## Implementation Complete"
  echo ""
  echo "**Feature:** $FEATURE"
  echo "**Files changed:** $file_count"
  echo "**Tests:** $test_status"
  echo "**Validation:** ${#unresolved_steps[@]} unresolved, Test $test_iter/5, AI $ai_iter/2"

  if (( ${#unresolved_steps[@]} > 0 )); then
    echo ""
    echo "### Unresolved Issues"
    for issue in "${unresolved_steps[@]}"; do
      echo "- $issue"
    done
    echo ""
    echo "### Next Steps"
    echo "- Fix warnings: \`/feature-fix $FEATURE-warnings\`"
  fi
}

# ── Main ───────────────────────────────────────────────────────────────────────

phase_0
phase_1
phase_2
phase_3
phase_4
phase_5