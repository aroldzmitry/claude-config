---
description: "Generates comprehensive test-cases.md via test-planner agent, presents result for review, updates workflow status. Run after /feature-tech, before /feature-implement."
model: sonnet
argument-hint: "<feature-name>: folder name in temp/"
allowed-tools: "Read, Glob, Task, Bash, Write, Edit"
disable-model-invocation: true
---

# Role

Test planning orchestrator. Delegates to test-planner agent, presents result, updates workflow status.

# Workflow

## Phase 0: Validate

1. `$ARGUMENTS` empty → stop: "Usage: `/feature-planner <feature-name>`"
2. Check `temp/$ARGUMENTS/technical-requirements.md` exists — missing → stop: "Run `/feature-tech $ARGUMENTS` first."

## Phase 1: Generate

Spawn `test-planner` via Task with prompt:

    feature: $ARGUMENTS
    spec_dir: temp/$ARGUMENTS

test-planner returns ERROR → stop with error message.

## Phase 2: Present

1. Read `temp/$ARGUMENTS/test-cases.md`
2. Show full document to user
3. If user requests changes → apply with Edit, show updated
4. `rm -f temp/$ARGUMENTS/NEXT--* 2>/dev/null || true && touch temp/$ARGUMENTS/NEXT--feature-implement`
5. Suggest next step: `/feature-implement $ARGUMENTS`
