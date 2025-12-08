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
4. Researches best practices for solutions
5. Presents options for user to select
6. Implements selected solution
7. Commits and pushes (for user-level files)

## Example

```
User: [executes /agent:create which produces incorrect output]
User: This should include validation step before creating

User: /tool:improve

Claude: Found issues in:
1. agent:create — user correction about missing validation step
2. Enter custom

User: 1

Claude: [describes problem, confirms, researches, implements fix]
```

## Difference from /agent:improve

| Feature | tool:improve | agent:improve |
|---------|--------------|---------------|
| Conversation scanning | Proactive | On request |
| Shows candidates | Yes | No |
| Applies changes | Yes | No (saves suggestions) |
| Git integration | Yes | No |
