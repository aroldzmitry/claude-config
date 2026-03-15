#!/usr/bin/env bash
set -euo pipefail

# Async agent launcher for super-agent.
# Two modes:
#   launch <agent-name> [task-body]  → prints SESSION_DIR, agent runs in background
#   poll <session-dir>               → prints WAITING, or agent response + cleanup

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MODE="${1:?usage: launch-agent.sh launch|poll <args>}"
shift

case "$MODE" in
  launch)
    AGENT_NAME="${1:?agent name required}"
    TASK_BODY="${2:-}"
    AGENT_FILE="$HOME/.claude/agents/${AGENT_NAME}.md"

    # Quick check before backgrounding — no session dir created if agent missing
    if [[ ! -f "$AGENT_FILE" ]]; then
      echo "ERROR: agent ${AGENT_NAME} not found"
      exit 0
    fi

    SESSION_DIR=$(mktemp -d /tmp/claude_agent.XXXXXX)

    # Background: run agent, extract response, write .done marker
    (
      EXIT_CODE=0
      "$SCRIPT_DIR/run-claude-agent.sh" "$AGENT_NAME" "$TASK_BODY" \
        > "$SESSION_DIR/output.txt" 2>"$SESSION_DIR/error.txt" \
        || EXIT_CODE=$?

      # Extract plain text from JSON result line: {"type":"result","result":"..."}
      if [[ -s "$SESSION_DIR/output.txt" ]]; then
        python3 -c "
import sys, json
raw = open('$SESSION_DIR/output.txt').read().strip()
for line in raw.splitlines():
    line = line.strip()
    if not line:
        continue
    try:
        d = json.loads(line)
        if d.get('type') == 'result':
            print(d.get('result', ''))
            sys.exit(0)
    except (json.JSONDecodeError, KeyError):
        pass
# Fallback: return raw output
print(raw)
" > "$SESSION_DIR/response.txt" 2>/dev/null || \
          cp "$SESSION_DIR/output.txt" "$SESSION_DIR/response.txt"
      fi

      echo "$EXIT_CODE" > "$SESSION_DIR/.done"
    ) &

    echo "$!" > "$SESSION_DIR/.pid"
    echo "$SESSION_DIR"
    ;;

  poll)
    SESSION_DIR="${1:?session dir required}"

    if [[ ! -d "$SESSION_DIR" ]]; then
      echo "ERROR: session not found"
      exit 0
    fi

    if [[ -f "$SESSION_DIR/.done" ]]; then
      # Done — output response and cleanup
      cat "$SESSION_DIR/response.txt" 2>/dev/null || cat "$SESSION_DIR/output.txt" 2>/dev/null || true
      rm -rf "$SESSION_DIR"
    elif PID=$(cat "$SESSION_DIR/.pid" 2>/dev/null) && [[ -n "$PID" ]] && ! kill -0 "$PID" 2>/dev/null; then
      # Process died without .done marker — abnormal termination
      echo "ERROR: agent process died unexpectedly"
      cat "$SESSION_DIR/error.txt" 2>/dev/null || true
      rm -rf "$SESSION_DIR"
    else
      echo "WAITING"
    fi
    ;;

  *)
    echo "ERROR: unknown mode $MODE (use launch or poll)" >&2
    exit 1
    ;;
esac
