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
import subprocess

# Read input from Claude
try:
    input_data = json.load(sys.stdin)
except json.JSONDecodeError:
    sys.exit(2)
command = input_data.get("tool_input", {}).get("command", "")


def get_current_branch():
    try:
        result = subprocess.run(
            ["git", "branch", "--show-current"],
            capture_output=True, text=True, timeout=5
        )
        return result.stdout.strip()
    except Exception:
        return None


MAIN_BRANCHES = {"main", "master", "develop", "dev"}

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

    # .env file access
    (r"\bcat\s+[^\s]*\.env", "Reading .env files via cat is forbidden — use secure env management"),
    (r"\b(grep|head|tail|sed|awk)\b.*\.env", "Reading .env files is forbidden — use secure env management"),

    # System operations
    (r"\bsudo\s+rm\b", "sudo rm is forbidden - too dangerous"),
    (r"\bchmod\s+777\b", "chmod 777 is forbidden - security risk"),

    # Pipe-to-shell attacks
    (r"\bcurl\b.*\|\s*(ba)?sh", "curl pipe to shell is forbidden - execute downloaded scripts explicitly"),
    (r"\bwget\b.*\|\s*(ba)?sh", "wget pipe to shell is forbidden - execute downloaded scripts explicitly"),

    # Dangerous rm targets
    (r"\brm\s+(-rf|-fr)\s*(~|\$HOME|/home/)", "rm home directory is forbidden"),
    (r"\brm\b.*\.\.", "rm with path traversal (..) is forbidden"),
    (r"\brm\s+(-rf|-fr)\s*[\"']*~?/?\.claude", "rm -rf on .claude directory is forbidden"),

    # Dangerous git operations
    (r"\bgit\s+push\s+.*\s+\+", "git force push via refspec (+) is forbidden"),
    (r"\bgit\s+clean\s+.*-f", "git clean -f is forbidden - use explicit file removal"),
]

# Main-branch-only blocked patterns (merge, cherry-pick, amend, direct push)
MAIN_BRANCH_BLOCKED_PATTERNS = [
    (r"\bgit\s+merge\b", "git merge on main branch is forbidden - use PRs"),
    (r"\bgit\s+cherry-pick\b", "git cherry-pick on main branch is forbidden - use PRs"),
    (r"\bgit\s+commit\b.*--amend\b", "git commit --amend on main branch is forbidden - rewrites history"),
    # Direct push: "git push", "git push origin", "git push origin master/main/develop/dev"
    (r"\bgit\s+push(\s+(origin|upstream))?\s*(main|master|develop|dev)?\s*$", "direct push to main branch is forbidden - use PRs"),
]

# Check command against global blocked patterns
for pattern, reason in BLOCKED_PATTERNS:
    if re.search(pattern, command, re.IGNORECASE):
        print(f"❌ BLOCKED: {reason}", file=sys.stderr)
        print(f"Command: {command}", file=sys.stderr)
        sys.exit(2)

# Check main-branch-specific patterns
if re.search(r"\bgit\b", command, re.IGNORECASE):
    branch = get_current_branch()
    if branch and branch in MAIN_BRANCHES:
        for pattern, reason in MAIN_BRANCH_BLOCKED_PATTERNS:
            if re.search(pattern, command, re.IGNORECASE):
                print(f"❌ BLOCKED (main branch): {reason}", file=sys.stderr)
                print(f"Command: {command}", file=sys.stderr)
                sys.exit(2)

# Allow the command
sys.exit(0)
