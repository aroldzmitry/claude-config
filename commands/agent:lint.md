---
description: "Validate an agent or command for quality and conflicts. Always uses web research and deep reasoning."
argument-hint: <file-path>
---

# Agent Lint

Validate the following item: $ARGUMENTS

## Argument Parsing

Parse `$ARGUMENTS` to extract the **target**: file path or agent/command name.

## Execution

**Always use Task tool** to delegate validation:

```
Task(subagent_type="agent-lint", prompt="Validate [target]. Use web research to find best practices for Claude Code commands and agent design patterns. Use deep reasoning mode: ultrathink")
```

Do NOT perform validation inline — always delegate to the agent-lint subagent via Task tool.
