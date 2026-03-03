---
name: figma
description: "Extract design data from Figma URL via local MCP bridge. Use when user provides a Figma URL or asks to implement a design from Figma."
argument-hint: "<figma_url>"
allowed-tools: Bash, Read, Glob, Grep
---

Extract Figma design for: $ARGUMENTS

Figma Desktop must be open with Dev Mode enabled.

## Script

Bridge script: `~/.claude/skills/figma/figma_mcp.py`

## Steps

### 1. Design Context (CSS + code structure)

```bash
python3 ~/.claude/skills/figma/figma_mcp.py "$ARGUMENTS"
```

### 2. Design Tokens (variables)

```bash
python3 ~/.claude/skills/figma/figma_mcp.py --tool get_variable_defs "$ARGUMENTS"
```

### 3. Screenshot (visual reference)

```bash
python3 ~/.claude/skills/figma/figma_mcp.py --tool get_screenshot "$ARGUMENTS"
```

Then read the saved screenshot file (`~/.claude/skills/figma/figma_screenshot.png`) to see the visual.

### 4. Metadata (node hierarchy) — only if needed for complex nodes

```bash
python3 ~/.claude/skills/figma/figma_mcp.py --tool get_metadata "$ARGUMENTS"
```

## Output

Present:

- Component structure from design context
- Design tokens/variables used
- Screenshot for visual reference
- Key dimensions, colors, typography extracted
