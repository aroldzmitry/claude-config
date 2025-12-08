# tool:check

Analyze Claude tool quality, compare with external alternatives, verify Claude documentation compliance.

## Usage

```
/tool:check <file-path>
```

## Parameters

- `file-path` — path to agent/command/skill file (required, will prompt if empty)

## Output

- Summary: what tool does
- Steps: tool's workflow
- Documentation Compliance: YAML/fields/tools checklist
- Comparison: table vs 3+ external alternatives
- Improvements: actionable suggestions with +/-
- Redundancy: verbose/duplicate content issues

## Example

```
/tool:check ~/.claude/commands/my-command.md
```
