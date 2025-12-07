#!/bin/bash

# PostToolUse hook: auto-commit changes to ~/.claude/ after Write/Edit
# Only commits files NOT in .gitignore
# Matches agent-update behavior: {type}: {filename} + git push

CLAUDE_DIR="$HOME/.claude"

# Read tool input from stdin
INPUT=$(cat)

# Extract file path from the tool input
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# Check if file is in ~/.claude/
if [[ "$FILE_PATH" != "$CLAUDE_DIR"* ]]; then
    exit 0
fi

cd "$CLAUDE_DIR"

# Get relative path for git operations
REL_PATH="${FILE_PATH#$CLAUDE_DIR/}"

# Check if file is tracked by git (respects .gitignore)
if ! git ls-files --error-unmatch "$REL_PATH" &>/dev/null && \
   ! git ls-files --others --exclude-standard | grep -q "^${REL_PATH}$"; then
    # File is gitignored, skip
    exit 0
fi

# Determine operation type based on git status
IS_NEW_FILE=false
IS_DELETED=false

if git ls-files --others --exclude-standard | grep -q "^${REL_PATH}$"; then
    IS_NEW_FILE=true
    TYPE="Add"
elif [[ ! -f "$FILE_PATH" ]]; then
    IS_DELETED=true
    TYPE="Remove"
else
    TYPE="Update"
fi

# Check if there are changes to commit
if ! $IS_NEW_FILE && ! $IS_DELETED; then
    if git diff --quiet HEAD -- "$REL_PATH" 2>/dev/null; then
        # No changes
        exit 0
    fi
fi

# Extract filename for commit message
FILENAME=$(basename "$FILE_PATH")

# Commit with descriptive message
git add "$REL_PATH"
git commit -m "${TYPE}: ${FILENAME}" --quiet 2>/dev/null || true

# Push to remote (non-blocking, ignore failures)
git push --quiet 2>/dev/null &

exit 0
