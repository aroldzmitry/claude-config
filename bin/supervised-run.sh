#!/usr/bin/env bash
set -euo pipefail

CHECK_INTERVAL=2
DONE_PATTERN=""
TIMEOUT=0
STALL_TIMEOUT=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --interval)      CHECK_INTERVAL="$2"; shift 2 ;;
    --done-pattern)  DONE_PATTERN="$2"; shift 2 ;;
    --timeout)       TIMEOUT="$2"; shift 2 ;;
    --stall-timeout) STALL_TIMEOUT="$2"; shift 2 ;;
    --) shift; break ;;
    *) break ;;
  esac
done

if [[ $# -eq 0 ]]; then
  echo "Usage: supervised-run.sh [--interval SEC] [--done-pattern PATTERN] [--timeout SEC] [--stall-timeout SEC] -- COMMAND..." >&2
  exit 1
fi

PARENT_PID=$PPID
PARENT_START=$(ps -o lstart= -p "$PARENT_PID" 2>/dev/null)

kill_tree() {
  local pid=$1
  local children
  children=$(pgrep -P "$pid" 2>/dev/null) || true
  for child in $children; do
    kill_tree "$child"
  done
  kill "$pid" 2>/dev/null || true
  sleep 0.5
  kill -9 "$pid" 2>/dev/null || true
}

# All state in memory — no temp files
declare -a TAIL_BUF=()
DONE_LINE=""
KILL_REASON=""
START_EPOCH=$(date +%s)
LAST_ACTIVITY=$START_EPOCH

# Anonymous pipe via process substitution (no FIFO file)
# script -q /dev/null creates a PTY so child processes use line buffering
# (without PTY, Node.js fully buffers stdout in pipes, causing stall timeouts)
exec 3< <(exec script -q /dev/null "$@" 2>&1)
CMD_PID=$!

# Cleanup children on external kill (e.g., Bash tool timeout)
trap 'kill_tree "$CMD_PID" 2>/dev/null; exit 143' TERM INT

while true; do
  if IFS= read -t "$CHECK_INTERVAL" -r line <&3; then
    # Strip PTY artifacts: trailing CR and backspaces from script(1)
    line="${line%$'\r'}"
    while [[ "$line" == *$'\x08'* ]]; do line="${line//?$'\x08'/}"; done
    TAIL_BUF+=("$line")
    (( ${#TAIL_BUF[@]} > 20 )) && TAIL_BUF=("${TAIL_BUF[@]:1}")
    LAST_ACTIVITY=$(date +%s)

    if [[ -n "$DONE_PATTERN" ]] && [[ "$line" == *"$DONE_PATTERN"* ]]; then
      DONE_LINE="$line"
      sleep 5
      kill_tree "$CMD_PID" 2>/dev/null || true
      break
    fi
  else
    if ! kill -0 "$CMD_PID" 2>/dev/null; then
      while IFS= read -t 1 -r line <&3; do
        line="${line%$'\r'}"
        while [[ "$line" == *$'\x08'* ]]; do line="${line//?$'\x08'/}"; done
        TAIL_BUF+=("$line")
        (( ${#TAIL_BUF[@]} > 20 )) && TAIL_BUF=("${TAIL_BUF[@]:1}")
      done
      break
    fi

    NOW_EPOCH=$(date +%s)

    current_start=$(ps -o lstart= -p "$PARENT_PID" 2>/dev/null) || true
    if [[ "$current_start" != "$PARENT_START" ]]; then
      KILL_REASON="parent process died"
      kill_tree "$CMD_PID"
      break
    fi

    if [[ "$STALL_TIMEOUT" -gt 0 ]] && (( NOW_EPOCH - LAST_ACTIVITY >= STALL_TIMEOUT )); then
      KILL_REASON="stall timeout (${STALL_TIMEOUT}s without output)"
      kill_tree "$CMD_PID"
      break
    fi

    if [[ "$TIMEOUT" -gt 0 ]] && (( NOW_EPOCH - START_EPOCH >= TIMEOUT )); then
      KILL_REASON="global timeout (${TIMEOUT}s elapsed)"
      kill_tree "$CMD_PID"
      break
    fi
  fi
done

exec 3<&-
wait "$CMD_PID" 2>/dev/null && EXIT_CODE=$? || EXIT_CODE=$?

# Output contract: result or error, nothing else
if [[ -n "$KILL_REASON" ]]; then
  echo "SUPERVISED-RUN: killed — $KILL_REASON" >&2
  if (( ${#TAIL_BUF[@]} > 0 )); then printf '%s\n' "${TAIL_BUF[@]}" >&2; fi
  exit 1
elif [[ -n "$DONE_LINE" ]]; then
  echo "$DONE_LINE"
  exit 0
elif [[ "$EXIT_CODE" -ne 0 ]]; then
  echo "SUPERVISED-RUN: command failed with exit code $EXIT_CODE" >&2
  if (( ${#TAIL_BUF[@]} > 0 )); then printf '%s\n' "${TAIL_BUF[@]}" >&2; fi
  exit "$EXIT_CODE"
else
  if (( ${#TAIL_BUF[@]} > 0 )); then printf '%s\n' "${TAIL_BUF[@]}"; fi
  exit 0
fi
