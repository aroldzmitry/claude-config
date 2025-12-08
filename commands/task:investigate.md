---
description: Explore a task from multiple angles, gather insights via web research, provide different perspectives. Use when user asks to investigate, research, or explore a topic.
argument-hint: <topic or task description>
model: opus
allowed-tools: Read, Glob, Grep, WebSearch, WebFetch, AskUserQuestion, Write
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

### 1.5. Discovery Questions

Use `AskUserQuestion` to gather context before research (2-3 questions max):
- Team size: Solo / Small team / Enterprise
- Current state: What exists already?
- Goal: Primary objective?
- Constraints: Budget/time limits?

Skip if obvious from $ARGUMENTS. Do not proceed to research until context is clear.

### 2. Multi-Angle Analysis

Think deeply through these lenses (use extended thinking):

- **Problem** — What exactly needs solving? Root cause?
- **Stakeholders** — Who benefits? Who's affected?
- **Constraints** — Time, budget, technical limits?
- **Risks** — What could go wrong? Worst case?
- **Alternatives** — Other approaches? Why not those?
- **Prior Art** — Solved before? What can we learn?

### 3. Web Research

Tailor search to discovered context:
- Solo developer → "solo/small team [topic]"
- Enterprise → "[topic] at scale"
- Include their tech stack in query

Use `WebSearch` to find similar problems in similar contexts, best practices for their scale, common pitfalls, expert opinions.

Synthesize findings, don't just list links. Filter out irrelevant results.

### 4. Generate Insights

Produce:
- **Key insight** — the non-obvious realization
- **Reframe** — alternative way to think about the problem
- **Quick wins** — low-effort high-impact actions
- **Deep work** — what requires serious investment
- **Open questions** — what still needs answers

### 5. Present Summary

Output structured summary with sections: Core Problem (1 sentence), Key Insight (non-obvious takeaway), Perspectives Considered (bullet list), From Research (key findings with sources), Recommendations (quick win + deep work + explore further), Open Questions.

### 6. Offer to Save

Use `AskUserQuestion` to ask if user wants to save the investigation.

If yes: Create file at `~/.claude/investigations/{date}-{slug}.md` with metadata (date, topic, sources). Confirm path.

## Rules

- Challenge assumptions in the question
- Provide actionable next steps
- Cite sources from web research
- Be honest about uncertainty
- Never give generic advice
- Never skip web research

## Error Handling

| Error | Action |
|-------|--------|
| Empty $ARGUMENTS | Use `AskUserQuestion` to get topic |
| WebSearch no results | Note limitation, proceed with analysis based on knowledge |
| User doesn't answer discovery questions | Use reasonable defaults, note assumptions |
| Save fails | Report error, continue without saving |
