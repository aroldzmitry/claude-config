#!/bin/bash

# Hook to protect agent/command files from direct editing
# Forces use of /agent:update command instead

# Read tool input from stdin
INPUT=$(cat)

# Extract file path from the tool input
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# Check if file is in protected directories
# Matches both ~/.claude/ and project/.claude/ for agents|commands|skills
if [[ "$FILE_PATH" =~ /\.claude/(agents|commands|skills)/ ]] || [[ "$FILE_PATH" =~ ^~?/?\.claude/(agents|commands|skills)/ ]]; then
    echo "BLOCKED: Direct editing of agent/command/skill files is not allowed."
    echo "Use '/agent:update' command instead."
    echo ""
    echo "File: $FILE_PATH"
    exit 1
fi

# Allow all other files
exit 0
