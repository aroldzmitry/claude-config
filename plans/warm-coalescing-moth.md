# /doc:validator Command

## Overview

Create a global slash command that analyzes Claude documents (agents, commands, prompts) for functional necessity, redundancy, and ROI of each section.

## Command Details

| Field | Value |
|-------|-------|
| Name | `/doc:validator` |
| Location | `~/.claude/commands/doc:validator.md` |
| Model | opus (via prompt instruction) |
| Features | ultrathink, WebSearch (auto-triggered) |

## Purpose

Analyze documents to find:
- **Redundant content** - what LLM already knows (research: 65% of prompts are redundant)
- **Low-value sections** - complexity without proportional benefit
- **Improvement opportunities** - what can be simplified or removed
- **ROI analysis** - token cost vs functional value

## Difference from /agent:lint

| /agent:lint | /doc:validator |
|-------------|----------------|
| Quality & conflicts | Functional necessity |
| Structure compliance | ROI per section |
| Standards check | Redundancy analysis |
| Surface-level | Deep content analysis |

## Core Analysis Steps (in command prompt)

1. **Read document** completely
2. **WebSearch** for current best practices on the topic
3. **Identify each section/instruction**
4. **Probe each instruction:**
   - Would Claude behave differently without it?
   - Is this LLM's default behavior?
   - Token cost vs value added
5. **Classify findings:**
   - REMOVE: Redundant/default behavior
   - SIMPLIFY: Over-engineered instructions
   - KEEP: Essential unique instructions
   - IMPROVE: Could be more efficient

## Output Format

```markdown
# Validation Report: {document}

**File:** {path}
**Analyzed:** {date}
**Token estimate:** {before} → {after} ({reduction}%)

## Summary
{1-2 sentences}

## Findings

### REMOVE (Redundant)
| Section | Reason | Tokens |
|---------|--------|--------|
| ... | LLM default | ~50 |

### SIMPLIFY
| Section | Issue | Suggestion |
|---------|-------|------------|
| ... | Over-detailed | ... |

### KEEP (Essential)
| Section | Reason |
|---------|--------|
| ... | Unique constraint |

## Recommended Actions
1. {priority action}
2. ...
```

## Research Basis

Based on:
- [65.2% of prompt requirements are redundant](https://arxiv.org/html/2505.13360v1)
- [LLM prompt optimization techniques](https://towardsdatascience.com/4-techniques-to-optimize-your-llm-prompts-for-cost-latency-and-performance/)
- [LLMAuditor framework](https://arxiv.org/html/2402.09346v3)

## File to Create

`~/.claude/commands/doc:validator.md`
