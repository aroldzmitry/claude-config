# tool:improve

Improve existing tools (agents, commands, skills) by analyzing conversation history.

## Usage

```
/tool:improve [additional context]
```

**Arguments:** Optional context about what to improve.

## How it works

1. Scans conversation for tool errors, user corrections, or user-provided solutions
2. Shows candidates to choose from
3. Confirms understanding of the problem
4. **Researches best practices** (MUST use WebSearch) — quality over speed, find optimal solutions
5. Presents options for user to select
6. Implements selected solution
7. Checks cross-tool impact — if other tools reference the modified tool, asks user how to resolve
8. Updates documentation if it exists in `~/.claude/docs/`
9. Commits and pushes (for user-level files)
10. Reports files: `[A]` created, `[M]` updated, `[D]` deleted

## Example

```
User: [executes /tool:create which produces incorrect output]
User: This should include validation step

User: /tool:improve

Claude: Found issues in:
1. tool:create — user correction about missing validation
2. Enter custom

User: 1

Claude: [describes problem, confirms, researches, implements fix]
```
