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

declare -a TAIL_BUF=()
DONE_LINE=""
KILL_REASON=""
START_EPOCH=$(date +%s)
LAST_ACTIVITY=$START_EPOCH

# Exit status travels via a temp file: `wait` on a process-substitution PID
# returns 127 under bash 3.2 (macOS default), so it cannot be used here.
EXIT_FILE=$(mktemp /tmp/supervised_exit.XXXXXX)

# Anonymous pipe via process substitution (no FIFO file)
# script -q /dev/null creates a PTY so child processes use line buffering
# (without PTY, Node.js fully buffers stdout in pipes, causing stall timeouts)
# stdin from /dev/null: supervised commands are batch-mode; with an inherited
# socket stdin macOS script(1) fails (tcgetattr) or misreports the exit status.
# set +e: the procsub inherits this script's `set -e`, which would abort the
# subshell on a non-zero command exit BEFORE the exit file gets written.
exec 3< <(set +e; script -q /dev/null "$@" </dev/null 2>&1; echo "$?" > "$EXIT_FILE")
CMD_PID=$!

# Cleanup children on external kill (e.g., Bash tool timeout)
trap 'kill_tree "$CMD_PID" 2>/dev/null; rm -f "$EXIT_FILE"; exit 143' TERM INT

while true; do
  if IFS= read -t "$CHECK_INTERVAL" -r line <&3; then
    # Strip PTY artifacts: trailing CR and backspaces from script(1)
    line="${line%$'\r'}"
    while [[ "$line" == *$'\x08'* ]]; do line="${line//?$'\x08'/}"; done
    TAIL_BUF+=("$line")
    (( ${#TAIL_BUF[@]} > 200 )) && TAIL_BUF=("${TAIL_BUF[@]:1}")
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
        (( ${#TAIL_BUF[@]} > 200 )) && TAIL_BUF=("${TAIL_BUF[@]:1}")
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
# Give the procsub a moment to flush the exit file on fast exits
[[ -s "$EXIT_FILE" ]] || sleep 0.2
EXIT_CODE=$(cat "$EXIT_FILE" 2>/dev/null)
rm -f "$EXIT_FILE"
# Empty file (process killed before writing it) → killed/done paths below
# decide the exit; otherwise assume clean.
EXIT_CODE="${EXIT_CODE:-0}"

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
