# tool:create

Create Claude Code tools (agents, commands, skills) with step-by-step user validation.

## Usage

```
/tool:create [name] [description]
```

Arguments are optional — missing params will be asked interactively.

## Workflow

1. Parse arguments, ask missing params (scope, type, model)
2. Confirm understanding — show summary, flow, output, dialogs
3. Check duplicates — find similar tools, discuss options
4. Research — WebSearch for best practices
5. Create file — write concise tool optimized for Claude
6. Requirements check — verify file matches user requirements
7. Validate — run /agent:lint
8. Document — create docs in nearest .claude/docs/
9. Report — file path, line count, docs path

## Example

```
User: /tool:create pr-summary

Claude: Creating tool "pr-summary"
Scope? → User: Global
Type? → User: command

Purpose: Generate PR summary from changes.
Steps: 1) Get diff 2) Analyze 3) Format output

Outputs: markdown summary, stats

Is this correct? → User: Yes

[Checks duplicates — none found]
[WebSearch: PR summary best practices...]

Options:
A) Simple diff summary (+fast)
B) With AI analysis (+detailed, -slower)

→ User: B

[Creates file, validates with /agent:lint]

[A] ~/.claude/commands/pr-summary.md
[A] ~/.claude/docs/tools/pr-summary.md
```
