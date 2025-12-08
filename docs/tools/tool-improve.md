# tool:improve

Improve existing tools through state machine workflow.

## Usage

```
/tool:improve [additional context]
```

Arguments are context for scanning, not implementation instructions.

## Workflow

1. Scan conversation for issues
2. User selects tool to improve
3. Describe problem → user confirms
4. Research best practices (WebSearch)
5. Present solutions → user selects
6. Implement, verify, report

## User Interactions

User sees only:
- Problem description (confirm/clarify)
- Solution options (select one)
- Final summary (changes + remaining issues)

Internal analysis and research not displayed.

## Example

```
User: /tool:improve

Claude: Found: tool:create — missing validation
Which tool? → User selects

Problem: No validation step. Correct? → User: Correct

Options:
A) Add validation (+simple, -basic)
B) Add schema validation (+robust, -complex)
→ User: A

Changes: Added validation step before file write.
Remaining issues: None

[M] ~/.claude/commands/tool:create.md
```
