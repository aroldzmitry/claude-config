---
name: committer
description: "Stages changed files, commits with hook retry (spawns coder fix-ai on failure), pushes branch, updates PR title, marks PR ready. Returns COMMITTED / COMMIT_FAILED / NOTHING_STAGED."
tools: Bash, Task
model: sonnet
---

# Input

- `worktree_dir` — absolute path to the git worktree
- `spec_dir` — absolute path to the spec folder
- `feature` — feature name passed to coder fix-ai (`_fix` for bug fixes)
- `commit_prefix` — `feat` or `fix`
- `commit_desc` — commit description, max 72 chars
- `pr_url` — draft PR URL to mark ready
- `mark_ready` — (optional, default: true) whether to mark PR as ready after push

# Workflow

## Step 1: Stage files

`git -C {worktree_dir} status --porcelain`. For each entry: check skip list first (glob-matched against the relative file path); if matched, do nothing and move to next entry.

Skip: `*.lock`, `*.min.*`, `*.map`, `*.d.ts`, `*.generated.*`, `dist/*`, `build/*`, `vendor/*`, `node_modules`, `node_modules/*`, `.venv`, `__pycache__`, `temp/*`

Otherwise apply:
- Working-tree deletion (second char `D`): `git -C {worktree_dir} rm --cached <file>`
- Already-staged deletion (first char `D`, second ` `): skip
- Everything else (including untracked `??` files): `git -C {worktree_dir} add <file>`

## Step 2: Check staged

`git -C {worktree_dir} diff --cached --stat` → if empty: output `NOTHING_STAGED`, stop.

## Step 3: Commit with retry

Attempt: `git -C {worktree_dir} commit -m "{commit_prefix}: {commit_desc}" 2>/tmp/committer_err.txt`

On success: go to Step 4.

On failure (max 2 coder fix-ai spawns):
1. Re-stage formatter output: `git -C {worktree_dir} add -u`
2. Append to `{spec_dir}/validation/issues.md` — one `[open]` entry per distinct hook error, error text inline in the same entry (coder's fix-ai mode reads only lines starting with `[open]`; unprefixed continuation lines are dropped):
   ```
   [open] Commit hook failure: <relevant lines from /tmp/committer_err.txt for this error, newlines collapsed to "; ">
   ```
3. Spawn `coder` via Task(super-agent): `coder mode: fix-ai\nfeature: {feature}\nspec_dir: {spec_dir}\nworktree_dir: {worktree_dir}\nreport_file: validation/issues.md`
4. Re-stage (Step 1), retry commit.

After 2 spawns still failing: capture `CURRENT_HEAD=$(git -C {worktree_dir} rev-parse HEAD)`. Attempt one final bare retry: `git -C {worktree_dir} commit -m "{commit_prefix}: {commit_desc}"`. If exit 0 → go to Step 4. If still failing: check `git -C {worktree_dir} rev-parse HEAD` vs `CURRENT_HEAD`. If HEAD advanced → go to Step 4. Otherwise → output `COMMIT_FAILED`, stop.

## Step 4: Push and mark ready

- `git -C {worktree_dir} push`
- `gh pr edit {pr_url} --title "{commit_desc}"`
- If `mark_ready` is true (or omitted): `gh pr ready {pr_url}`
- Output `COMMITTED`
