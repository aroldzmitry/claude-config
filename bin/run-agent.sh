#!/usr/bin/env bash
set -euo pipefail

# Runs an agent's instructions through Claude CLI or Codex CLI via supervised-run.sh.
# Usage: run-agent.sh [--backend claude|codex] [--model MODEL] <agent-name> [task-body]
#
# Reads ~/.claude/agents/<agent-name>.md, strips YAML frontmatter,
# extracts model/tools, calls supervised-run.sh with the chosen backend.
# --model overrides the model from agent frontmatter (claude backend only).
# Returns the agent's JSON result line on stdout.

BACKEND="claude"
MODEL_OVERRIDE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --backend) BACKEND="$2"; shift 2 ;;
    --model) MODEL_OVERRIDE="$2"; shift 2 ;;
    *) break ;;
  esac
done

if [[ $# -lt 1 ]]; then
  echo "ERROR: usage: run-agent.sh [--backend claude|codex] <agent-name> [task-body]" >&2
  exit 1
fi

AGENT_NAME="$1"
TASK_BODY="${2:-}"
AGENT_FILE="$HOME/.claude/agents/${AGENT_NAME}.md"

if [[ ! -f "$AGENT_FILE" ]]; then
  echo "ERROR: agent ${AGENT_NAME} not found"
  exit 0
fi

# Extract YAML frontmatter (between first and second ---)
FRONTMATTER=$(awk '/^---$/{n++; next} n==1{print} n>=2{exit}' "$AGENT_FILE")

# Extract body (everything after second ---)
INSTRUCTIONS=$(awk '/^---$/{n++; next} n>=2{print}' "$AGENT_FILE")

case "$BACKEND" in
  claude)
    # Parse model from frontmatter (default: sonnet), allow override
    MODEL=$(echo "$FRONTMATTER" | awk -F': *' '/^model:/{gsub(/"/, "", $2); print $2}')
    MODEL="${MODEL_OVERRIDE:-${MODEL:-sonnet}}"

    # Parse tools from frontmatter (default: Read,Glob,Grep,Write,Edit,Bash)
    TOOLS=$(echo "$FRONTMATTER" | awk -F': *' '/^tools:/{gsub(/"/, "", $2); print $2}')
    TOOLS="${TOOLS:-Read,Glob,Grep,Write,Edit,Bash}"

    # No --done-pattern: with background Task subagents, claude -p emits a
    # "type":"result" line at EVERY turn end — including intermediate turns
    # that ended while a spawned child is still running — and exits only after
    # the real final result. Matching the first result line killed the process
    # mid-run, truncating the response to "I'll wait for the notification".
    # Natural process exit is the completion signal.
    # No --stall-timeout: the stream is legitimately silent while a background
    # child runs (validators: 10-25 min); --timeout is the backstop.
    ~/.claude/bin/supervised-run.sh \
      --timeout 3600 \
      -- env -u CLAUDECODE claude -p \
      --verbose --output-format stream-json \
      --append-system-prompt "$INSTRUCTIONS" \
      --model "$MODEL" \
      --tools "$TOOLS" \
      --dangerously-skip-permissions \
      "$TASK_BODY"
    ;;

  codex)
    # Combine instructions + task body into single prompt
    PROMPT="${INSTRUCTIONS}

# Task

${TASK_BODY}"

    # No --done-pattern: codex exec exits on completion. A done-pattern on
    # '"type":"item.completed"' would kill codex after its FIRST item
    # (reasoning/tool call), before the final message and file writes.
    # --cd pins the agent's working root: without it codex inherits this
    # shell's cwd, and relative paths in the task body (output_file) resolve
    # somewhere unintended, so reports land outside the dir the caller globs.
    CODEX_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
    ~/.claude/bin/supervised-run.sh \
      --stall-timeout 600 \
      --timeout 3600 \
      -- codex exec --full-auto --ephemeral --json \
      --cd "$CODEX_ROOT" \
      "$PROMPT"
    ;;

  *)
    echo "ERROR: unknown backend '$BACKEND' (use claude or codex)" >&2
    exit 1
    ;;
esac
