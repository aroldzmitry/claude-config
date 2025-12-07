---
description: Explore a task from multiple angles, gather insights via web research, provide different perspectives
argument-hint: <topic or task description>
model: opus
---

# Task Investigator

Explore a task or problem from multiple perspectives, gather insights, and help crystallize thinking.

## Input

Topic from `$ARGUMENTS`. If empty, use `AskUserQuestion` to get the topic.

## Workflow

### 1. Understand the Topic

Parse `$ARGUMENTS` and identify:
- Core problem/question
- Domain (technical, business, personal, creative)
- Implicit constraints or context
- **Hidden assumptions in the question**

**Challenge the question itself:**
- Is this the right question to ask?
- What alternatives might the user not be considering?
- Is there a simpler solution they might be missing?

### 1.5. Discovery Questions (BEFORE research)

Before doing any research, use `AskUserQuestion` to understand context:

**Required questions (pick 2-3 most relevant):**
| Context | Question |
|---------|----------|
| Team | Solo / Small team / Enterprise? |
| State | What exists already? |
| Goal | Primary objective? |
| Constraints | Budget/time limits? |

**Rules:**
- Ask 2-3 questions MAX via `AskUserQuestion`
- Use multiple choice options where possible
- Skip if answer is obvious from $ARGUMENTS
- DO NOT proceed to web research until context is clear

### 2. Multi-Angle Analysis

Think through these lenses (use "ultrathink"):

| Perspective | Questions to Explore |
|-------------|---------------------|
| **Problem** | What exactly needs solving? What's the root cause? |
| **Stakeholders** | Who benefits? Who's affected? What do they care about? |
| **Constraints** | Time, budget, technical, political limitations? |
| **Risks** | What could go wrong? What's the worst case? |
| **Alternatives** | What other approaches exist? Why not those? |
| **Prior Art** | Has this been solved before? What can we learn? |

### 3. Web Research (MANDATORY)

**Tailor search to discovered context:**
- Solo developer → search "solo/small team [topic]"
- Enterprise → search "[topic] at scale"
- Existing stack → include their tech in query

Use `WebSearch` to find:
- Similar problems **in similar contexts**
- Best practices **for their scale**
- Common pitfalls
- Expert opinions

Synthesize findings, don't just list links.
**Filter out irrelevant results** (e.g., enterprise stats for solo dev).

### 4. Generate Insights

Produce:
- **Key insight** — the non-obvious realization
- **Reframe** — alternative way to think about the problem
- **Quick wins** — low-effort high-impact actions
- **Deep work** — what requires serious investment
- **Open questions** — what still needs answers

### 5. Present Summary

Display to user:

```
## Investigation: {topic}

### Core Problem
[One sentence]

### Key Insight
[The non-obvious takeaway]

### Perspectives Considered
- [Bullet list of angles explored]

### From Research
- [Key findings with context]

### Recommendations
1. **Quick win:** [action]
2. **Deep work:** [action]
3. **Explore further:** [question]

### Open Questions
- [What still needs answering]
```

### 6. Offer to Save

After presenting summary, add:

> If you want to save this investigation, reply "save" or "yes".

If user replies affirmatively:
1. Create file at `~/.claude/investigations/{date}-{slug}.md`
2. Add metadata (date, topic, sources)
3. Confirm: "Saved to [path]"

Otherwise, proceed without saving.

## Rules

- DO: Challenge assumptions in the original question
- DO: Provide actionable next steps
- DO: Cite sources from web research
- DO: Be honest about uncertainty
- DON'T: Give generic advice
- DON'T: Skip web research
- DON'T: Over-promise outcomes

## Output Quality

Good investigation:
- Surfaces something user hadn't considered
- Connects to real-world examples
- Provides clear next action

Bad investigation:
- Restates the obvious
- Generic platitudes
- No concrete recommendations
