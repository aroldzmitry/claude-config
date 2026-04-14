---
description: "Update branch with default branch, pre-merge validate, merge PR, post-merge validate + cleanup worktree and branch."
model: sonnet
argument-hint: "[feature-name]: feature name (e.g. BUG-foo). Omit to pick from open PRs."
allowed-tools: "Bash, Read, Task"
disable-model-invocation: true
---

# Role

PR merge and cleanup orchestrator. Updates feature branch with master, validates, merges the PR, and removes worktree + branch.

# Rules

- If `$ARGUMENTS` is empty — show open PR picker (see Phase 0 step 1). Otherwise use `$ARGUMENTS` as feature name.

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
     - If response is "all" or equivalent:
       1. Set `MERGE_ALL = true`, `PR_LIST = all listed PRs in order`, `MERGE_RESULTS = []`.
       2. Run Phase 0 steps 2–3 once (set REPO_ROOT, DEFAULT_BRANCH, check not in worktree).
       3. For each PR in `PR_LIST`:
          a. Set `FEATURE = headRefName stripped of leading "feat/" prefix`.
          b. Run Phase 0 steps 4–5 (derive `BRANCH`, `WORKTREE_DIR`, `PR`).
          c. Run Phase 1 (Pre-Merge). On any stop condition: if `MERGE_RESULTS` is not empty output "Merged so far:\n{MERGE_RESULTS entries, one per line}\n"; output "Stopped on feat/$FEATURE: {stop reason}" then stop.
          d. Run Phase 2 (Merge). On any stop condition: if `MERGE_RESULTS` is not empty output "Merged so far:\n{MERGE_RESULTS entries, one per line}\n"; output "Stopped on feat/$FEATURE: {stop reason}" then stop.
          e. Run Phase 3 (Sync).
          f. Run Phase 5 (Cleanup).
          g. Append `feat/$FEATURE — #$PR.number — merged` to `MERGE_RESULTS`.
       4. Run Phase 4 (Validate) once. Note: Phase 5 (Cleanup) runs per-PR inside the loop above; Phase 4 (Validate) runs once after all merges.
       5. Run Phase 6 (see MERGE_ALL branch in Phase 6).
     - Otherwise → select PR by number. `FEATURE = selected headRefName stripped of leading "feat/" prefix`
2. `REPO_ROOT = git rev-parse --show-toplevel`
   `DEFAULT_BRANCH = git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's/refs\/remotes\/origin\///'`
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

1. Update branch with latest `$DEFAULT_BRANCH`:
   - If `$WORKTREE_DIR` exists:
     `git -C $WORKTREE_DIR fetch origin && git -C $WORKTREE_DIR merge origin/$DEFAULT_BRANCH --no-edit`
   - Else:
     `git fetch origin && git checkout $BRANCH && git merge origin/$DEFAULT_BRANCH --no-edit`
   - If merge has conflicts → stop: "Branch $BRANCH has conflicts with $DEFAULT_BRANCH. Resolve conflicts manually and re-run `/feature-merge $FEATURE`."
   - `git push origin $BRANCH`

2. Set `PREMERGE_CYCLE = 0`.

3. Spawn in parallel via Task:
   - `static-checker` with prompt: `error_file: /tmp/premerge_static.txt\nworking_dir: $VALIDATE_ROOT`
   - `test-runner` with prompt: `error_file: /tmp/premerge_tests.txt\nworking_dir: $VALIDATE_ROOT`

4. If both return `CLEAN` / `PASS` → proceed to Phase 2.

5. If any failures:
   - If `PREMERGE_CYCLE >= 3` → stop: "Pre-merge validation failed after 3 fix attempts. Fix manually and re-run `/feature-merge $FEATURE`."
   - Read errors from `/tmp/premerge_static.txt` and `/tmp/premerge_tests.txt` (whichever exist).
   - Spawn `coder` via Task with prompt: `fix pre-merge validation errors in $VALIDATE_ROOT for branch feat/$FEATURE:\n{errors}`
   - Commit fixes: `git -C $VALIDATE_ROOT add -A && git -C $VALIDATE_ROOT commit -m "fix: pre-merge validation (attempt $((PREMERGE_CYCLE+1)))" && git push origin $BRANCH`
   - Increment `PREMERGE_CYCLE` → go to step 3.

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

## Phase 4: Validate

Spawn `post-merge-validator` via Task with prompt:

    repo_root: $REPO_ROOT

- `CLEAN` → set `VALIDATE_RESULT = "clean"`. If `MERGE_ALL = true` → Phase 6. Otherwise → Phase 5.
- `HAS_ISSUES: {folder}` → set `VALIDATE_RESULT = "FAILED"`, `VALIDATE_FOLDER = {folder}` (folder is a basename, e.g. `post-merge-fix`). If `MERGE_ALL = true` → Phase 6. Otherwise → Phase 5.

## Phase 5: Cleanup

```
# Remove worktree
if [ -d "$WORKTREE_DIR" ]; then
  git worktree remove "$WORKTREE_DIR" --force
fi

# Remove local branch
git branch -d $BRANCH 2>/dev/null || git branch -D $BRANCH 2>/dev/null || true
# Remove remote branch
git push origin --delete $BRANCH 2>/dev/null || true

# Remove .worktrees/ dir if empty
if [ -d "$REPO_ROOT/.worktrees" ] && [ -z "$(ls -A "$REPO_ROOT/.worktrees")" ]; then
  rmdir "$REPO_ROOT/.worktrees"
fi
```

If not in `MERGE_ALL` loop → proceed to Phase 6.

## Phase 6: Report

If `MERGE_ALL = true`:
```
## Merge Complete

**Features:** (each entry from MERGE_RESULTS)
- feat/NAME — #N — merged
...
**Validate:** $VALIDATE_RESULT
**Now on:** $DEFAULT_BRANCH (updated)
```

Otherwise:
```
## Merge Complete

**Feature:** $FEATURE
**PR:** #N — merged
**Validate:** $VALIDATE_RESULT
**Branch:** feat/$FEATURE — deleted
**Worktree:** .worktrees/$FEATURE — removed
**Now on:** $DEFAULT_BRANCH (updated)
```

If `VALIDATE_RESULT = "FAILED"`:
```
**Next:** `/feature-fix $VALIDATE_FOLDER`
```
