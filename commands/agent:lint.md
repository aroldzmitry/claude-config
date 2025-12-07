---
description: "Validate an agent, command, or skill for quality and conflicts. Always uses web research and deep reasoning."
argument-hint: <file-path>
---

# Agent Lint

Delegate to agent-lint subagent:

```
Task(subagent_type="agent-lint", prompt="Validate $ARGUMENTS. Use web research for best practices. Use deep reasoning: ultrathink")
```
