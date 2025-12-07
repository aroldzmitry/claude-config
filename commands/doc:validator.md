---
description: "Analyze document for functional necessity, redundancy, and ROI. Uses ultrathink and web research."
argument-hint: <file-path>
---

# Doc Validator

Analyze document for optimization opportunities.

## Process

1. **Read document** — identify type, token count, sections
2. **Research** — WebSearch for best practices and LLM defaults
3. **Evaluate each section:**

| Question | Impact |
|----------|--------|
| Would Claude behave differently without this? | NO → REMOVE |
| Is this LLM's default behavior? | YES → REMOVE |
| Token cost vs value? | Low ROI → SIMPLIFY |
| Duplicated elsewhere? | YES → REMOVE |

4. **Classify:** REMOVE / SIMPLIFY / KEEP / IMPROVE

## Output Format

```markdown
# Validation Report: {filename}

**File:** {path}
**Token estimate:** {before} → {after} ({reduction}%)

## Summary
{1-2 sentences}

## Findings

### REMOVE (Redundant)
| Section | Reason | Functionality Lost | ~Tokens |
|---------|--------|--------------------|---------|

### SIMPLIFY
| Section | Issue | Functionality Lost | Suggestion |
|---------|-------|--------------------|------------|

### KEEP (Essential)
| Section | Reason |
|---------|--------|

### IMPROVE
| Section | Current | Better |
|---------|---------|--------|

## Recommended Actions
1. {highest impact}

## Research Sources
- {links}
```

## Filtering Rules

Before including optimization in REMOVE or SIMPLIFY:

1. **Assess functionality loss** — What behavior changes if removed/simplified?
2. **Rate importance:** Critical / Important / Nice-to-have / None
3. **Filter output:**
   - **Critical** → Never recommend removal, move to KEEP
   - **Important** → Never recommend removal, move to KEEP with note
   - **Nice-to-have** → Show in SIMPLIFY with clear "Functionality Lost" note
   - **None** → Can be in REMOVE

| Importance | Action |
|------------|--------|
| Critical | Keep, don't suggest removal |
| Important | Keep, explain why needed |
| Nice-to-have | Can simplify, show tradeoff |
| None | Can remove |

## Anti-Patterns to Detect

| Pattern | Why Bad |
|---------|---------|
| "Remember to..." | LLM retains context |
| JSON/Markdown examples | LLM knows formats |
| Multiple same-pattern examples | One enough |
| Restating tool behavior | Tool docs exist |
| "Important:" everywhere | Dilutes importance |

## Rules

- Use WebSearch before recommending
- Estimate token savings
- Focus on >5% reduction opportunities
- Don't remove project-specific constraints
