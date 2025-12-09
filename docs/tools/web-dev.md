# web:dev

TDD web developer agent. Clarifies requirements, writes tests first, implements minimal code.

## Usage

Invoke via Task tool with `subagent_type="web:dev"` or directly in conversation.

## Parameters

Input: task description OR file path to task spec

## Workflow

1. Clarify → 2. Write tests (red) → 3. Implement (green) → 4. Quality checks → 5. Commit

## Example

```
Task(subagent_type="web:dev", prompt="Add export button to dashboard")
```
