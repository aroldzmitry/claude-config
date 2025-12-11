#!/usr/bin/env python3
"""
Bash Command Validator Hook
Blocks dangerous git operations and other destructive commands.
Exit code 2 = block the command
Exit code 0 = allow the command
"""
import json
import sys
import re

# Read input from Claude
input_data = json.load(sys.stdin)
command = input_data.get("tool_input", {}).get("command", "")

# Dangerous patterns that should always be blocked
BLOCKED_PATTERNS = [
    # Git destructive operations
    (r"\bgit\s+reset\b", "git reset is forbidden - use 'git revert' instead"),
    (r"\bgit\s+push\s+--force\b", "git push --force is forbidden - preserves history"),
    (r"\bgit\s+push\s+-f\b", "git push -f is forbidden - use regular push"),
    (r"\bgit\s+push\s+--force-with-lease\b", "git push --force-with-lease requires explicit approval"),
    (r"\bgit\s+rebase\b", "git rebase rewrites history - use merge instead"),
    (r"\bgit\s+filter-branch\b", "git filter-branch rewrites entire history"),

    # Dangerous file operations
    (r"\brm\s+-rf\s+/", "rm -rf on root paths is forbidden"),
    (r"\brm\s+-r\s+/", "rm -r on root paths is forbidden"),

    # System operations
    (r"\bsudo\s+rm\b", "sudo rm is forbidden - too dangerous"),
    (r"\bchmod\s+777\b", "chmod 777 is forbidden - security risk"),
]

# Check command against blocked patterns
for pattern, reason in BLOCKED_PATTERNS:
    if re.search(pattern, command, re.IGNORECASE):
        print(f"❌ BLOCKED: {reason}", file=sys.stderr)
        print(f"Command: {command}", file=sys.stderr)
        sys.exit(2)  # Exit code 2 blocks the command

# Allow the command
sys.exit(0)
