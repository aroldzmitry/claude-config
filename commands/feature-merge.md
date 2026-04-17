---
description: "Update branch with default branch, pre-merge validate, merge PR, cleanup worktree and branch."
model: sonnet
argument-hint: "[feature-name]: feature name (e.g. BUG-foo). Omit to pick from open PRs."
allowed-tools: "Bash, Read, Task"
disable-model-invocation: true
---

# Role

PR merge and cleanup orchestrator. Updates feature branch with master, validates, merges the PR, and removes worktree + branch.

# Workflow

## Phase 0: Resolve

1. Resolve `FEATURE`:
   - If `$ARGUMENTS` not empty → `FEATURE = $ARGUMENTS`
   - If `$ARGUMENTS` is empty:
     - Run: `gh pr list --state open --json number,title,headRefName,isDraft --jq '.[]'`
     - If result is empty → stop: "No open PRs found."
     - If exactly 1 result → log "Only one open PR found — proceeding with #N title [branch]"; set `FEATURE = headRefName stripped of leading "feat/" prefix`; proceed to step 2.
     - Display numbered list (1-based):
       ```
       Open PRs:
       1. #N — title [branch] (draft)
       2. #N — title [branch]
       ...
       ```
       Show `(draft)` suffix if `isDraft = true`.
     - Ask user: "Which PR to merge? Enter number or 'all' to merge all sequentially:"
     - Wait for user input.
     - If response is `all`:
       1. Set `MERGE_ALL = true`, `PR_LIST = all listed PRs in order`, `MERGE_RESULTS = []`, `SKIPPED_LIST = []`.
       2. Run Phase 0 steps 2–3 once (set REPO_ROOT, DEFAULT_BRANCH, check not in worktree).
       3. For each PR in `PR_LIST`:
          a. Set `FEATURE = headRefName stripped of leading "feat/" prefix`.
          b. Run Phase 0 steps 4–5 (derive `BRANCH`, `WORKTREE_DIR`, `PR`).
          c. If `PR.isDraft = true` → append `feat/$FEATURE — #$PR.number — skipped (draft, in progress)` to `SKIPPED_LIST`; continue to next PR.
          d. Run Phase 1 (Pre-Merge). On any stop condition: if `MERGE_RESULTS` is not empty output "Merged so far:\n{MERGE_RESULTS entries, one per line}\n"; if `SKIPPED_LIST` is not empty output "Skipped:\n{SKIPPED_LIST entries, one per line}\n"; output "Stopped on feat/$FEATURE: {stop reason}" then stop.
          e. Run Phase 2 (Merge). On any stop condition: if `MERGE_RESULTS` is not empty output "Merged so far:\n{MERGE_RESULTS entries, one per line}\n"; if `SKIPPED_LIST` is not empty output "Skipped:\n{SKIPPED_LIST entries, one per line}\n"; output "Stopped on feat/$FEATURE: {stop reason}" then stop.
          f. Run Phase 3 (Sync).
          g. Run Phase 4 (Cleanup).
          h. Append `feat/$FEATURE — #$PR.number — merged` to `MERGE_RESULTS`.
       4. Run Phase 5 (see MERGE_ALL branch in Phase 5).
     - Otherwise → select PR by number. `FEATURE = selected headRefName stripped of leading "feat/" prefix`
2. `REPO_ROOT = git rev-parse --show-toplevel`
   `DEFAULT_BRANCH = gh repo view --json defaultBranchRef --jq '.defaultBranchRef.name' 2>/dev/null`
   `[[ -z "$DEFAULT_BRANCH" ]] && DEFAULT_BRANCH=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's/refs\/remotes\/origin\///')`
   `[[ -z "$DEFAULT_BRANCH" ]] && DEFAULT_BRANCH="main"`
3. Check not running inside a worktree:
   `GIT_DIR = git rev-parse --git-dir`
   `COMMON_DIR = git rev-parse --git-common-dir`
   If `GIT_DIR != COMMON_DIR` → stop: "Run `/feature-merge` from the main project directory, not from a worktree."
4. Set derived variables:
   ```
   BRANCH = feat/$FEATURE
   WORKTREE_DIR = $REPO_ROOT/.worktrees/$FEATURE
   ```
5. Find PR:
   `PR = gh pr list --head $BRANCH --state all --json number,state,url,isDraft --jq '.[0]'`
   If PR empty or null → stop: "No PR found for branch feat/$FEATURE. Was /feature-fix or /feature-implement run with this name?"

## Phase 1: Pre-Merge

Skip entirely if `PR.state != open` or `PR.isDraft = true`.

Set `VALIDATE_ROOT = $WORKTREE_DIR` if it exists, otherwise `VALIDATE_ROOT = $REPO_ROOT`.
Set `PREMERGE_CYCLE = 0`. Set `NO_OP_CYCLES = 0`.

**BUILD_SETUP(DIR):** If `<DIR>/docs/WORKFLOW.md` exists, read it. Find the first section whose heading contains "Setup" or "Worktree" (case-insensitive); if no such section exists, skip. Run each shell command listed in that section from `<DIR>`.

1. Update branch with latest `$DEFAULT_BRANCH`:
   - If `$WORKTREE_DIR` exists:
     `git -C $WORKTREE_DIR fetch origin && git -C $WORKTREE_DIR merge origin/$DEFAULT_BRANCH --no-edit`
   - Else:
     `git fetch origin && git checkout $BRANCH && git merge origin/$DEFAULT_BRANCH --no-edit`
   - If merge has conflicts:
     - Set `CONFLICT_CYCLE = 0`.
     - While `CONFLICT_CYCLE < 2`:
       - Collect conflicted files: `git -C $VALIDATE_ROOT diff --name-only --diff-filter=U`
       - Write `/tmp/premerge_fix/$FEATURE/conflicts/issues.md` — one `[open]` entry per conflicted file: path + "resolve git merge conflict markers; prefer $BRANCH version for deleted/refactored code."
       - Spawn `coder` via Task(super-agent):
         ```
         coder
         mode: fix-ai
         feature: $FEATURE
         spec_dir: /tmp/premerge_fix/$FEATURE/conflicts
         worktree_dir: $VALIDATE_ROOT
         report_file: issues.md
         ```
       - If `git -C $VALIDATE_ROOT diff --name-only --diff-filter=U` is empty:
         - `git -C $VALIDATE_ROOT add -A && git -C $VALIDATE_ROOT commit -m "fix: resolve merge conflicts with $DEFAULT_BRANCH" && git push origin $BRANCH`
         - Break loop; proceed to step 2.
       - Increment `CONFLICT_CYCLE`.
     - Stop: "Branch $BRANCH has unresolved conflicts after 2 attempts. Resolve manually and re-run `/feature-merge $FEATURE`."
   - `git push origin $BRANCH`

2. Run BUILD_SETUP($VALIDATE_ROOT).

3. Spawn in parallel via Task:
   - `static-checker` with prompt: `error_file: /tmp/premerge_static.txt\nworking_dir: $VALIDATE_ROOT`
   - `test-runner` with prompt: `error_file: /tmp/premerge_tests.txt\nworking_dir: $VALIDATE_ROOT`

4. If `static-checker` returns `CLEAN` and `test-runner` returns `PASS` → proceed to Phase 2.

5. If any failures:
   - If `PREMERGE_CYCLE >= 3` → stop: "Pre-merge validation failed after 3 fix attempts. Fix manually and re-run `/feature-merge $FEATURE`."
   - Read errors from `/tmp/premerge_static.txt` and `/tmp/premerge_tests.txt` (whichever exist). Write them to `/tmp/premerge_fix/$FEATURE/validation/issues.md` as `[open]` entries (one entry per distinct logical error; group related lines belonging to the same failure into one entry).
   - Spawn `coder` via Task(super-agent) with prompt:
     ```
     coder
     mode: fix-ai
     feature: $FEATURE
     spec_dir: /tmp/premerge_fix/$FEATURE
     worktree_dir: $VALIDATE_ROOT
     report_file: validation/issues.md
     ```
   - Run `git -C $VALIDATE_ROOT status --short`. If output is non-empty:
     - `git -C $VALIDATE_ROOT add -A && git -C $VALIDATE_ROOT commit -m "fix: pre-merge validation (attempt $((PREMERGE_CYCLE+1)))" && git push origin $BRANCH`
     - Increment `PREMERGE_CYCLE`; reset `NO_OP_CYCLES = 0`
   - Else: increment `NO_OP_CYCLES`; if `NO_OP_CYCLES >= 2` → stop: "Tests failing but no fixes identified after 2 no-op attempts. Tests may be flaky — re-run `/feature-merge $FEATURE` or fix manually."
   - Go to step 3.

## Phase 2: Merge

- If `PR.state = merged` → skip to Phase 3.
- If `PR.state = closed` → stop: "PR was closed without merging. Reopen it or clean up manually: `git push origin --delete feat/$FEATURE && git branch -D feat/$FEATURE`"
- If `PR.state = open`:
  - If `PR.isDraft = true` → stop: "PR is still draft — feature-fix or feature-implement did not complete. Finish the feature or close the PR manually."
  - Run: `gh pr merge $PR.url --merge`
  - If fails → stop: "PR merge failed: {error}. Resolve the issue and re-run `/feature-merge $FEATURE`."
  - Verify: `gh pr view $PR.url --json state` → must be `merged`.

## Phase 3: Sync

```
git checkout $DEFAULT_BRANCH
git pull
```

Run BUILD_SETUP($REPO_ROOT).

## Phase 4: Cleanup

```
if [ -d "$WORKTREE_DIR" ]; then
  git worktree remove "$WORKTREE_DIR" --force
fi

git branch -d $BRANCH 2>/dev/null || git branch -D $BRANCH 2>/dev/null || true
git push origin --delete $BRANCH 2>/dev/null || true

if [ -d "$REPO_ROOT/.worktrees" ] && [ -z "$(ls -A "$REPO_ROOT/.worktrees")" ]; then
  rmdir "$REPO_ROOT/.worktrees"
fi
```

If `MERGE_ALL != true` → proceed to Phase 5.

## Phase 5: Report

If `MERGE_ALL = true`:
```
## Merge Complete

**Features:** (each entry from MERGE_RESULTS)
- feat/NAME — #N — merged
...
**Skipped:** (each entry from SKIPPED_LIST, omit section if empty)
- feat/NAME — #N — skipped (draft, in progress)
...
**Now on:** $DEFAULT_BRANCH (updated)
```

Otherwise:
```
## Merge Complete

**Feature:** $FEATURE
**PR:** #$PR.number — merged
**Branch:** feat/$FEATURE — deleted
**Worktree:** .worktrees/$FEATURE — removed
**Now on:** $DEFAULT_BRANCH (updated)
```
