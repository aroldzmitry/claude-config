---
description: Orchestrate documentation workflow to implement task from specifications through validation
argument-hint: <task-instructions>
model: sonnet
allowed-tools: "Read, SlashCommand, AskUserQuestion"
---

# Task Implementation Orchestrator

Execute documentation workflow: user-flow → parallel artifacts → work-plan → validate → fix loop.

## Input

`$ARGUMENTS` contains task instructions (user flow description or reference to docs/USER_FLOWS.md item). If empty → ask user.

## Metrics Tracking

Track for each main phase (user-flow, check-list, test-case, work-plan, validate):
- Start/end timestamps (ISO 8601)
- Duration in seconds
- Token usage (parse from system warnings or output)
- Command name
- Status (success/failed)

Store in array: `metrics = [{phase, command, startTime, endTime, duration, tokens, status}]`

Calculate totals: sum of all durations, sum of all tokens.

## Workflow

### Phase 1: Generate User Flow

Call `/docs:user-flow $ARGUMENTS`

Wait for completion. Extract output file path: `docs/{flow-name}/userFlows.md`

Store `FLOW_PATH` for subsequent phases.

### Phase 2: Generate Artifacts (Parallel)

Execute concurrently:
- `/docs:check-list {FLOW_PATH}`
- `/docs:test-case {FLOW_PATH}`

Wait for both to complete.

### Phase 3: Generate Work Plan

Call `/docs:work-plan {FLOW_PATH}`

Wait for completion.

### Phase 4: Validate

Call `/docs:validate {FLOW_PATH}`

Parse output for:
- Quality Score (X.X/10)
- Missing Files list
- Coverage Gaps list
- Traceability Issues list
- Consistency Issues list

### Phase 5: Evaluate & Fix Loop

If score ≥ 9 → complete (go to Output)

If score < 9 and iterations < 3:
1. Categorize issues by source command
2. Call fix commands with issue context
3. Re-validate
4. Increment iteration counter
5. Repeat evaluation

Issue categorization rules:
- Missing Files → call corresponding command (check-list, test-case, work-plan)
- Coverage Gaps in checklist → `/docs:check-list {FLOW_PATH}` with instruction to add missing items
- Coverage Gaps in test cases → `/docs:test-case {FLOW_PATH}` with instruction to add missing coverage
- Traceability Issues → determine source artifact, call with fix instruction
- Consistency Issues → identify conflicting artifact, call `/docs:user-flow` to clarify source of truth, then regenerate affected artifacts

Fix command pattern: Pass original FLOW_PATH plus issue context as instruction prefix.

If score < 9 after 3 iterations → go to Dialog.

## Output

Status format per phase:
```
[Phase X] {phase-name}
  Status: {running | complete | skipped}
  Output: {file-path or result}
  Duration: {X.X}s | Tokens: {N}
```

After validation:
```
Validation Score: {X.X}/10
Issues: {count by category}
Iteration: {N}/3
```

Final summary:
```
Files created/updated:
- {path}
Final Score: {X.X}/10
Status: {COMPLETE | NEEDS_ATTENTION}

Performance Metrics:
Command                  Duration    Tokens
-------------------------------------------------
/docs:user-flow          {X.X}s      {N}
/docs:check-list         {X.X}s      {N}
/docs:test-case          {X.X}s      {N}
/docs:work-plan          {X.X}s      {N}
/docs:validate           {X.X}s      {N}
-------------------------------------------------
TOTAL                    {X.X}s      {N}
```

## Dialog

After 3 failed iterations (score still < 9):

Use AskUserQuestion:
- Header: "Next Steps"
- Question: "Validation score is {X.X}/10 after 3 fix attempts. How to proceed?"
- Options:
  - "Stop here" — Accept current state, output final summary
  - "Manual review" — Show detailed issue list for manual fixing
  - "Continue fixing" — Run 3 more iterations

## Rules

- **Execute all phases without stopping for confirmation** — proceed automatically from Phase 1 through Phase 5
- Run iterations automatically without asking (until 3 reached)
- Never ask user confirmation between phases — only Dialog section triggers user interaction
- Parse validation output to categorize issues accurately
- Parallel execution for check-list and test-case only
- Sequential execution for all other phases (dependencies)
- Pass full issue context when calling fix commands
- Track iteration count, stop at 3 if score < 9
- Capture start timestamp before each SlashCommand call
- Capture end timestamp after each SlashCommand completes
- Parse token usage from system warnings or command output
- Calculate duration as (endTime - startTime) in seconds
- Store metrics for all 5 main phase commands
- Include per-command and total metrics in final report
