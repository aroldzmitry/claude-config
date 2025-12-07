# Plan: Update task:create.md as Full Workflow Orchestrator

## Summary

Transform `task:create.md` into a complete workflow orchestrator that manages the full task lifecycle through all agents with question handling and bug fix loops.

---

## Workflow Design

```
User Task
    ↓
┌─────────────────┐
│ Business Analyst│ ←→ Questions? → User → Answers
└────────┬────────┘
         ↓
┌─────────────────┐
│   Developer     │ ←→ Questions? → User → Answers
└────────┬────────┘
         ↓
┌─────────────────┐
│    Tester       │
└────────┬────────┘
         ↓ Bugs?
         ├──Yes──→ Developer Fix → Tester Retest
         │                              ↓ Still Bugs?
         │                              ├──Yes──→ Complete with Bugs Report
         │                              └──No───→ Continue
         └──No───→ Continue
         ↓
┌─────────────────┐
│   Documenter    │
└────────┬────────┘
         ↓
    Final Report
```

---

## Key Features

1. **Question Handling**: Each agent can return questions → command shows them to user → passes answers back
2. **Bug Fix Loop**: Tester finds bugs → Developer fixes → Tester retests (max 1 retry)
3. **Graceful Failure**: If bugs remain after retry, complete with bug report (not fail)
4. **Status Tracking**: Track each agent's status throughout

---

## File to Modify

`client/.claude/commands/task:create.md`

---

## Implementation Steps

### Step 1: Update Command Metadata
- Change description to reflect full workflow
- Keep allowed-tools

### Step 2: Add Workflow Steps

1. **Generate Task ID** - `task-{timestamp}`
2. **Create Task Folder** - `tasks/{task-id}/`

3. **BA Phase 1** - Call business-analyst for questions
4. **Handle BA Questions** - If questions returned, ask user via AskUserQuestion
5. **BA Phase 2** - Pass answers, write requirements

6. **Developer Phase** - Call developer with BA output
7. **Handle Developer Questions** - If questions, ask user, pass answers

8. **Tester Phase** - Call tester with all outputs
9. **Handle Bugs** - If bugs found:
   - Call developer to fix
   - Call tester to retest
   - If still bugs → include in final report

10. **Documenter Phase** - Call documenter to update docs

11. **Final Report** - Summarize all results, note any remaining bugs

### Step 3: Define Question Detection

Agent returns questions if output contains:
- `QUESTIONS:` block (BA style)
- `Status: Needs Review` with questions in body

### Step 4: Define Status Parsing

Parse agent output for:
- `Status: Done` → proceed
- `Status: Failed - reason` → stop and report
- `Status: Needs Review - reason` → check for questions
- Bugs section in tester output → trigger fix loop

---

## Agent Call Templates

### Business Analyst
```
Task ID: {task-id}
Task: "{user-task}"
Execute Phase 1/2...
```

### Developer
```
Task ID: {task-id}
Read: tasks/{task-id}/business-analyst-output.md
Implement the requirements...
```

### Tester
```
Task ID: {task-id}
Read: tasks/{task-id}/business-analyst-output.md
Read: tasks/{task-id}/developer-output.md
Test implementation...
```

### Developer (Bug Fix)
```
Task ID: {task-id}
Bugs to fix: {bugs from tester}
Fix these bugs and update developer-output.md
```

### Documenter
```
Task ID: {task-id}
Read all outputs in tasks/{task-id}/
Update documentation...
```
