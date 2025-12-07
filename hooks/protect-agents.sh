#!/bin/bash

# Hook to protect agent/command files from direct editing
# Forces use of /agent:update command instead

# Allow agent-update executor to bypass protection via marker file
MARKER_FILE="$HOME/.claude/.agent-update-active"
if [[ -f "$MARKER_FILE" ]]; then
    exit 0
fi

# Read tool input from stdin
INPUT=$(cat)

# Extract file path from the tool input
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# Check if file is in protected directories
# Matches both ~/.claude/ and project/.claude/ for agents|commands|skills
if [[ "$FILE_PATH" =~ /\.claude/(agents|commands|skills)/ ]] || [[ "$FILE_PATH" =~ ^~?/?\.claude/(agents|commands|skills)/ ]]; then
    # Output JSON format required by Claude Code hooks
    cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "Direct editing of agent/command/skill files is not allowed. Use '/agent:update' command instead. File: $FILE_PATH"
  }
}
EOF
    exit 0
fi

# Allow all other files
exit 0
