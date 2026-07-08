#!/usr/bin/env bash
set -euo pipefail

# Async agent launcher.
# Three modes:
#   launch [--backend claude|codex] <agent-name> [task-body]  → prints SESSION_DIR, agent runs in background
#   poll <session-dir>               → prints WAITING, or agent response + cleanup
#   wait <session-dir> [--max SEC]   → blocks up to SEC (default 110), then behaves like poll.
#                                      Cannot hang: bounded loop of 2s sleeps + file checks only;
#                                      the Bash tool's own timeout (120s) is the outer backstop.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MODE="${1:?usage: launch-agent.sh launch|poll|wait <args>}"
shift

case "$MODE" in
  launch)
    BACKEND="claude"
    MODEL_FLAG=""
    while [[ $# -gt 0 ]]; do
      case "$1" in
        --backend) BACKEND="${2:?--backend requires a value}"; shift 2 ;;
        --model) MODEL_FLAG="--model $2"; shift 2 ;;
        *) break ;;
      esac
    done

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
      "$SCRIPT_DIR/run-agent.sh" --backend "$BACKEND" $MODEL_FLAG "$AGENT_NAME" "$TASK_BODY" \
        > "$SESSION_DIR/output.txt" 2>"$SESSION_DIR/error.txt" \
        || EXIT_CODE=$?

      # Extract plain text from JSON result line
      if [[ -s "$SESSION_DIR/output.txt" ]]; then
        python3 -c "
import sys, json
raw = open('$SESSION_DIR/output.txt').read().strip()
results = []          # claude result events — one per turn end; answer = LAST
agent_messages = []   # final assistant messages (codex)
any_texts = []        # any item text — fallback
for line in raw.splitlines():
    line = line.strip()
    if not line:
        continue
    try:
        d = json.loads(line)
        # claude backend: {\"type\":\"result\",\"result\":\"...\"} — emitted at
        # EVERY turn end (intermediate turns wait on background children);
        # the agent's answer is the LAST result event, never the first
        if d.get('type') == 'result':
            results.append(d.get('result', ''))
            continue
        # codex backend: {\"type\":\"item.completed\",\"item\":{...}}
        if d.get('type') == 'item.completed':
            item = d.get('item', {})
            # text may be top-level in item, or nested in content
            text = item.get('text', '')
            if not text:
                content = item.get('content', [])
                if isinstance(content, list):
                    parts = [c.get('text', '') for c in content if isinstance(c, dict)]
                    text = ''.join(parts)
            if text:
                kind = item.get('type') or item.get('item_type') or ''
                if 'message' in kind:
                    agent_messages.append(text)
                any_texts.append(text)
    except (json.JSONDecodeError, KeyError, AttributeError):
        pass
if results:
    print(results[-1])
    sys.exit(0)
# codex emits one item.completed per item (reasoning, tool call, message) —
# the agent's answer is the LAST assistant message, not the first item
if agent_messages:
    print(agent_messages[-1])
    sys.exit(0)
if any_texts:
    print(any_texts[-1])
    sys.exit(0)
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

  wait)
    SESSION_DIR="${1:?session dir required}"
    shift
    MAX_WAIT=110
    [[ "${1:-}" == "--max" ]] && MAX_WAIT="${2:?--max requires a value}"

    DEADLINE=$(( $(date +%s) + MAX_WAIT ))
    while [[ ! -f "$SESSION_DIR/.done" ]]; do
      # Session gone or process died → fall through to poll for the error path
      [[ ! -d "$SESSION_DIR" ]] && break
      if PID=$(cat "$SESSION_DIR/.pid" 2>/dev/null) && [[ -n "$PID" ]] && ! kill -0 "$PID" 2>/dev/null; then
        break
      fi
      if (( $(date +%s) >= DEADLINE )); then
        echo "WAITING"
        exit 0
      fi
      sleep 2
    done
    # Done, died, or gone — delegate to poll logic below
    exec "$0" poll "$SESSION_DIR"
    ;;

  poll)
    SESSION_DIR="${1:?session dir required}"

    if [[ ! -d "$SESSION_DIR" ]]; then
      echo "ERROR: session not found"
      exit 0
    fi

    if [[ -f "$SESSION_DIR/.done" ]]; then
      # Done — surface non-zero exit codes, then output response and cleanup
      EXIT_CODE=$(cat "$SESSION_DIR/.done" 2>/dev/null || echo "")
      if [[ -n "$EXIT_CODE" && "$EXIT_CODE" != "0" ]]; then
        echo "ERROR: agent exited with code $EXIT_CODE"
        # The SUPERVISED-RUN reason header is the FIRST stderr line — surface it
        # even when 200 buffered tail lines push it out of tail's window
        grep -m 2 '^SUPERVISED-RUN:' "$SESSION_DIR/error.txt" 2>/dev/null || true
        tail -n 20 "$SESSION_DIR/error.txt" 2>/dev/null || true
      fi
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
    echo "ERROR: unknown mode $MODE (use launch, poll, or wait)" >&2
    exit 1
    ;;
esac
