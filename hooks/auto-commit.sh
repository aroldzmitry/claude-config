#!/bin/bash

# PostToolUse hook: auto-commit changes to ~/.claude/ after Write/Edit
# Only commits files NOT in .gitignore

CLAUDE_DIR="$HOME/.claude"

# Read tool input from stdin
INPUT=$(cat)

# Extract file path from the tool input
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# Check if file is in ~/.claude/
if [[ "$FILE_PATH" != "$CLAUDE_DIR"* ]]; then
    exit 0
fi

# Check if file is tracked by git (respects .gitignore)
cd "$CLAUDE_DIR"
if ! git ls-files --error-unmatch "$FILE_PATH" &>/dev/null && \
   ! git ls-files --others --exclude-standard | grep -q "^${FILE_PATH#$CLAUDE_DIR/}$"; then
    # File is gitignored, skip
    exit 0
fi

# Check if there are changes to commit
if git diff --quiet HEAD -- "$FILE_PATH" 2>/dev/null && \
   ! git ls-files --others --exclude-standard | grep -q "^${FILE_PATH#$CLAUDE_DIR/}$"; then
    # No changes
    exit 0
fi

# Extract filename for commit message
FILENAME=$(basename "$FILE_PATH")

# Auto-commit
git add "$FILE_PATH"
git commit -m "Auto-commit: $FILENAME" --quiet 2>/dev/null || true

exit 0
