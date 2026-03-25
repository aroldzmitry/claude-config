#!/usr/bin/env bash
set -euo pipefail

# Runs an agent's instructions through Claude CLI or Codex CLI via supervised-run.sh.
# Usage: run-agent.sh [--backend claude|codex] <agent-name> [task-body]
#
# Reads ~/.claude/agents/<agent-name>.md, strips YAML frontmatter,
# extracts model/tools, calls supervised-run.sh with the chosen backend.
# Returns the agent's JSON result line on stdout.

BACKEND="claude"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --backend) BACKEND="$2"; shift 2 ;;
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
    # Parse model from frontmatter (default: sonnet)
    MODEL=$(echo "$FRONTMATTER" | awk -F': *' '/^model:/{gsub(/"/, "", $2); print $2}')
    MODEL="${MODEL:-sonnet}"

    # Parse tools from frontmatter (default: Read,Glob,Grep,Write,Edit,Bash)
    TOOLS=$(echo "$FRONTMATTER" | awk -F': *' '/^tools:/{gsub(/"/, "", $2); print $2}')
    TOOLS="${TOOLS:-Read,Glob,Grep,Write,Edit,Bash}"

    ~/.claude/bin/supervised-run.sh \
      --done-pattern '"type":"result"' \
      --stall-timeout 600 \
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

    ~/.claude/bin/supervised-run.sh \
      --done-pattern '"type":"item.completed"' \
      -- codex exec --full-auto --ephemeral --json \
      "$PROMPT"
    ;;

  *)
    echo "ERROR: unknown backend '$BACKEND' (use claude or codex)" >&2
    exit 1
    ;;
esac
