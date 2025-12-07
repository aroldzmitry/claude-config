---
description: "Analyze document for functional necessity, redundancy, and ROI. Uses ultrathink and web research."
argument-hint: <file-path>
---

# Doc Validator

Analyze document for functional necessity and optimization opportunities.

## Input

Parse `$ARGUMENTS` to get target file path.

## Execution

Think step by step using ultrathink mode.

### Step 1: Read Document

Read the target file completely. Identify:
- Document type (agent, command, CLAUDE.md, other)
- Total approximate token count
- All distinct sections/instructions

### Step 2: Research Best Practices

Use WebSearch to find:
- Current best practices for this type of document
- What LLMs naturally do without explicit instructions
- Common redundancy patterns in prompts

Search queries:
- "Claude Code {document-type} best practices 2025"
- "LLM prompt redundancy optimization"

### Step 3: Analyze Each Section

For each section/instruction, evaluate:

| Question | Impact |
|----------|--------|
| Would Claude behave differently without this? | If NO → REMOVE |
| Is this LLM's default behavior? | If YES → REMOVE |
| Token cost vs value added? | If low ROI → SIMPLIFY |
| Is this duplicated elsewhere? | If YES → REMOVE |
| Could this be said more concisely? | If YES → SIMPLIFY |

### Step 4: Classify Findings

- **REMOVE**: Redundant content, LLM defaults, duplicates
- **SIMPLIFY**: Over-detailed instructions, verbose examples
- **KEEP**: Essential unique constraints, project-specific rules
- **IMPROVE**: Inefficient but necessary content

## Output Format

```markdown
# Validation Report: {filename}

**File:** {path}
**Analyzed:** {date}
**Token estimate:** {before} → {after} ({reduction}%)

## Summary
{1-2 sentences on overall document quality}

## Findings

### REMOVE (Redundant)
| Section | Reason | ~Tokens |
|---------|--------|---------|
| ... | LLM default | 50 |

### SIMPLIFY
| Section | Issue | Suggestion |
|---------|-------|------------|
| ... | Over-detailed | ... |

### KEEP (Essential)
| Section | Reason |
|---------|--------|
| ... | Unique constraint |

### IMPROVE
| Section | Current | Better |
|---------|---------|--------|
| ... | ... | ... |

## Recommended Actions
1. {highest impact action}
2. ...

## Research Sources
- {links from WebSearch}
```

## Rules

- Always use WebSearch before making recommendations
- Be specific about WHY something is redundant
- Estimate token savings for each recommendation
- Don't recommend removing project-specific constraints
- Focus on high-impact changes (>5% token reduction)

## Anti-Patterns to Detect

| Pattern | Why It's Bad |
|---------|--------------|
| "Remember to..." | LLM retains context |
| JSON/Markdown syntax examples | LLM knows formats |
| Multiple examples of same pattern | One example enough |
| Restating obvious tool behavior | Tool docs exist |
| "Important: ..." for everything | Dilutes importance |
| Decorative formatting (---, ===) | Wastes tokens |
