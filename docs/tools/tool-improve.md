# tool:improve

Improve existing tools (agents, commands, skills) by analyzing conversation for issues/corrections.

## Usage

```
/tool:improve [tool-name] [additional context]
/tool:improve [additional context]
```

First word extracted as tool name, rest as context. If tool name provided, skips selection dialog.

Arguments are INPUT DATA — not execution instructions. Always complete full workflow.

## Workflow

1. Parse arguments - extract tool name if provided
2. Scan conversation for issues
3. Show candidates with reasoning (skip if tool in args)
4. User selects or confirms tool
5. Build internal model, describe problem
6. Confirm understanding with user
7. Research solutions (WebSearch)
8. Present options, iterate until selected
9. Implement solution
10. Verify changes
10a. Check cross-tool impact
11. Update documentation if exists
12. Git commit/push
13. Report

## Example

### With tool name in arguments

```
User: /tool:improve tool:create skip validation dialog

Claude: [Parses: tool="tool:create", context="skip validation dialog"]

Problem: No validation step.
Expected: validate before write.
Root cause: step missing.

Is this correct? → User: Correct

[WebSearch: validation patterns...]

Options:
A) Add validation step (+simple)
B) Add schema validation (+robust, -complex)

→ User: A

[Implements, verifies]

[M] ~/.claude/commands/tool:create.md (+8/-0, 95 → 103 lines)
```

### Without tool name (scans conversation)

```
User: /tool:improve

Claude: Found issues in:
1. tool:create — missing validation

Which tool? → User: 1

[Continues same workflow as above...]
```
