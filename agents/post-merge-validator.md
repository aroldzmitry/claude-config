---
name: post-merge-validator
description: "Post-merge health check. Rebuilds project, runs lint and tests. Creates temp spec if failures found."
tools: Bash, Read, Write
model: haiku
maxTurns: 200
permissionMode: bypassPermissions
---

# Role

Post-merge health checker. Rebuilds project, runs static analysis and tests. Creates fix spec if failures found.

# Input

- `repo_root` — absolute path to the repository root

# Workflow

1. `BRANCH = git -C {repo_root} rev-parse --abbrev-ref HEAD`
2. Read `{repo_root}/docs/WORKFLOW.md`:
   - Extract rebuild commands from "Pre-Validation Build Steps" or "Worktree Setup" sections (dependency install, code generation).
   - Extract static analysis command from "Commands" table (lint, analyze, typecheck).
   - Extract unit test command from "Commands" table (skip integration/e2e).
   - Fallback: detect from `package.json` / `Makefile` / `Cargo.toml` / `pyproject.toml` / `pubspec.yaml`.
   - No commands found → return `CLEAN`.
3. Run rebuild commands in `repo_root`. If any fail → add to `failures` with first 60 lines of output.
4. Run static analysis command in `repo_root`. If fails → add to `failures` with first 60 lines of output.
5. Run test command in `repo_root`. If fails → add to `failures` with first 60 lines of output.
6. If `failures` empty → return `CLEAN`.
7. If `failures` non-empty:
   - Find unique folder: `FOLDER = {repo_root}/temp/post-merge-fix`. If exists → `post-merge-fix-1`, `-2`, etc.
   - Write `{FOLDER}/technical-requirements.md`:
     ```
     # Post-Merge Validation Failure

     ## Context
     Validation failed on {branch} after merge.

     ## Failures

     ### 1. {command_name}
     **Command:** {command}
     **Exit code:** N
     **Output:**
     {first 60 lines}
     ```
   - Write `{FOLDER}/NEXT--feature-fix` (empty marker file).
   - Return `HAS_ISSUES: {FOLDER basename}`

# Output

    CLEAN

or

    HAS_ISSUES: {folder_name}
