---
description: "Deep code review of uncommitted changes with quality scoring"
model: opus
allowed-tools: Read, Glob, Grep, Bash(git diff:*), Bash(git status:*), Task
---

# Code Review Orchestrator

Orchestrate parallel sub-agent reviews for uncommitted changes. Aggregate results into unified report.

## Workflow

### Step 0: Start Timer

Record current timestamp before starting. You will calculate elapsed time at the end.

### Step 1: Gather Changed Files

```bash
git diff --name-only HEAD
```

If no output: respond "No uncommitted changes found." and STOP.

Filter to code files only: `ts, tsx, js, jsx, css, scss, html, json`
Skip: node_modules, dist, build, .min.js, .generated.

### Step 2: Check proj_index

Read `.claude/proj_index/00-INDEX.md`

If missing: respond "Project index not found at .claude/proj_index/" and STOP.

### Step 3: Launch Review Agents

Launch ALL 7 agents IN PARALLEL using Task tool in a SINGLE message:

```
Task(subagent_type="review:readability", prompt="Review these files for readability: {file_list}. Working directory: {cwd}")
Task(subagent_type="review:patterns", prompt="Review these files for patterns compliance: {file_list}. Working directory: {cwd}")
Task(subagent_type="review:modularity", prompt="Review these files for modularity: {file_list}. Working directory: {cwd}")
Task(subagent_type="review:complexity", prompt="Review these files for complexity: {file_list}. Working directory: {cwd}")
Task(subagent_type="review:security", prompt="Review these files for security: {file_list}. Working directory: {cwd}")
Task(subagent_type="review:dry", prompt="Review these files for DRY violations: {file_list}. Working directory: {cwd}")
Task(subagent_type="review:performance", prompt="Review these files for performance: {file_list}. Working directory: {cwd}")
```

Replace `{file_list}` with actual file paths, one per line.
Replace `{cwd}` with current working directory.

### Step 4: Parse Results

For each agent result, extract:
- Score (regex: `Score: (\d+\.\d+)/10.0`)
- Issues (all lines starting with `[Critical]` or `[Major]`)

If agent failed or score not found:
- Log: `[WARN] {agent_name} failed, skipping category`
- Exclude from weighted calculation

### Step 5: Calculate Overall Score

Weights:
| Category | Weight |
|----------|--------|
| Readability | 18% |
| Patterns | 18% |
| Modularity | 18% |
| Complexity | 13% |
| Security | 13% |
| DRY | 10% |
| Performance | 10% |

If category skipped: redistribute its weight proportionally to remaining categories.

Formula: `overall = sum(score_i * weight_i) / sum(weight_i for successful categories)`

### Step 6: Collect Stats

After all agents complete:
- Calculate elapsed time: `end_time - start_time`
- Sum token usage from all agent results (input + output tokens)

### Step 7: Output Report

Plain text format:

```
Code Review: {N} files analyzed

Score: {X.X}/10.0

Issues ({total_count}):

[{Severity}][{Category}] {file}:{line}
  {Description}
  → {Recommendation}

Summary:
  Readability: {X.X}  |  Patterns: {X.X}     |  Modularity: {X.X}
  Complexity: {X.X}   |  Security: {X.X}     |  DRY: {X.X}
  Performance: {X.X}

{warnings if any agents failed}

---
Stats: {elapsed_time}s | ~{total_tokens} tokens
```

If no issues: "No issues found. Score: 10.0/10.0" (still include stats line)

## Rules

- MUST launch all 7 agents in SINGLE message (parallel execution)
- Wait for ALL agents to complete before aggregating
- Deduplicate issues if same file:line reported by multiple agents
- Sort issues by severity (Critical first, then Major)
- Do NOT report Minor issues (agents already filter them out)
