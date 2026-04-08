---
description: "Merge PR + cleanup worktree and branch. Run from main project directory after /feature-fix or /feature-implement completes."
model: sonnet
argument-hint: "<feature-name>: feature name (e.g. BUG-foo)"
allowed-tools: "Bash, Read"
disable-model-invocation: true
---

# Role

PR merge and cleanup orchestrator. Merges the feature PR and removes worktree + branch.

# Rules

- `$ARGUMENTS` is required — feature name. If empty → stop: "Usage: `/feature-merge <feature-name>`"
- Must run from main project directory, not from inside a worktree.
- Fully autonomous — no user questions.

# Workflow

## Phase 0: Resolve

1. `FEATURE = $ARGUMENTS`
2. `REPO_ROOT = git rev-parse --show-toplevel`
3. Check not running inside a worktree:
   `COMMON_DIR = git rev-parse --git-common-dir`
   If `COMMON_DIR` starts with `/` → stop: "Run `/feature-merge` from the main project directory, not from a worktree."
4. Set derived variables:
   ```
   BRANCH = feat/$FEATURE
   WORKTREE_DIR = $REPO_ROOT/.worktrees/$FEATURE
   ```
5. Find PR:
   `PR = gh pr list --head $BRANCH --state all --json number,state,url,isDraft --jq '.[0]'`
   If PR empty or null → stop: "No PR found for branch feat/$FEATURE. Was /feature-fix run with this name?"

## Phase 1: Merge

- If `PR.state = merged` → skip to Phase 2.
- If `PR.state = closed` → stop: "PR was closed without merging. Reopen it or clean up manually: `git push origin --delete feat/$FEATURE && git branch -D feat/$FEATURE`"
- If `PR.state = open`:
  - If `PR.isDraft = true` → stop: "PR is still draft — feature-fix did not complete. Finish the feature or close the PR manually."
  - Run: `gh pr merge $PR.url --merge --delete-branch`
  - If fails → stop: "PR merge failed: {error}. Resolve the issue and re-run `/feature-merge $FEATURE`."
  - Verify: `gh pr view $PR.url --json state` → must be `merged`.

## Phase 2: Sync

```
DEFAULT_BRANCH = git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's/refs\/remotes\/origin\///'
[[ -z "$DEFAULT_BRANCH" ]] && DEFAULT_BRANCH="main"
git checkout $DEFAULT_BRANCH
git pull
```

## Phase 3: Cleanup

```
# Remove worktree
if [ -d "$WORKTREE_DIR" ]; then
  git worktree remove "$WORKTREE_DIR" --force
fi

# Remove local branch (remote was deleted by --delete-branch above)
git branch -d $BRANCH 2>/dev/null || git branch -D $BRANCH 2>/dev/null || true

# Remove .worktrees/ dir if empty
if [ -d "$REPO_ROOT/.worktrees" ] && [ -z "$(ls -A "$REPO_ROOT/.worktrees")" ]; then
  rmdir "$REPO_ROOT/.worktrees"
fi
```

## Phase 4: Report

```
## Merge Complete

**Feature:** $FEATURE
**PR:** #N — merged
**Branch:** feat/$FEATURE — deleted
**Worktree:** .worktrees/$FEATURE — removed
**Now on:** $DEFAULT_BRANCH (updated)
```