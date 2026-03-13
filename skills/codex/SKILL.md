---
description: "Runs agent instructions through Codex CLI. Reads agent .md as system prompt, passes task prompt to codex exec."
argument-hint: "<agent-name> <prompt>"
allowed-tools: "Read, Bash, Glob"
model: sonnet
---

# Codex Agent Runner

Run any agent's instructions through Codex CLI.

**Input:** $ARGUMENTS

## Workflow

1. Parse `$ARGUMENTS`: first word = `AGENT_NAME`, rest = `PROMPT`.

2. Read `~/.claude/agents/{AGENT_NAME}.md`. If not found → "Agent `{AGENT_NAME}` not found in ~/.claude/agents/". Stop.

3. Strip YAML frontmatter (everything between first `---` and second `---`, inclusive).

4. Construct combined text:

       {agent instructions without frontmatter}

       # Task

       {PROMPT}

5. Write combined text to `/tmp/codex_{AGENT_NAME}.txt`.

6. Run:

       codex exec -s read-only --ephemeral -o /tmp/codex_{AGENT_NAME}_out.txt - < /tmp/codex_{AGENT_NAME}.txt 2>/dev/null

7. Check result:
   - Output file exists and non-empty → Read and return contents of `/tmp/codex_{AGENT_NAME}_out.txt`.
   - Output file empty or missing → "Codex error: agent returned no output. Run with `2>&1` instead of `2>/dev/null` to debug."
