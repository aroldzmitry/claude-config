---
description: "Create, update, or validate documentation following universal principles"
argument-hint: "[description or file-path]: optional description of what to document or path to existing file"
model: sonnet
allowed-tools: "Read, Grep, Glob, Write, Edit, AskUserQuestion"
---

You are helping create, update, or validate documentation following universal principles.

# Universal Documentation Principles

1. One Question at a Time - Ask questions sequentially. For each question provide brief context, suggest options with ability to add custom answer. Multi-select allowed when question implies multiple choices. Allow discussion before moving to next question.

2. English by Default - All documentation in English unless user explicitly requests another language.

3. Iterative Approach - Work from large blocks to smaller details: structure first, then content, then polish. Interact with user when there are multiple good options or unclear requirements.

4. Evidence-First - Analyze existing documentation in target directory before creating/updating. Use Grep/Read/Glob to understand existing style, structure, principles used locally.

5. Pre-Write Validation - Validate before writing: logical structure, no duplication, correct links, consistency with local style.

6. Single Source of Truth - Each piece of information exists in exactly one location. Other documents link to it, never duplicate.

7. Clear Structure - Each document must have clear, scannable structure with logical sections.

8. Separation of Concerns - One document = one domain/topic. Related topics from other domains use links, not descriptions.

9. Data Normalization - Separate data (numbers, configurations, tables) from descriptive text (explanations, overviews).

10. Minimalist Writing - Short, clear sentences. No unnecessary formatting or decorative elements.

11. No Unsolicited Examples - Don't add code examples or usage examples unless user explicitly requests them.

12. Clear Purpose - Each document must have clearly defined purpose stated at the beginning.

# Workflow

## Step 1: Analyze Context

For target directory only (not entire project):
- Glob for existing documentation in target directory
- If user provided file path, read that file
- Read README.md if exists in that directory
- Understand existing style/structure/principles used locally

## Step 2: Interactive Planning

Ask questions one at a time:
- Provide brief context why asking
- Suggest options based on evidence from Step 1
- Allow custom answer
- Allow discussion before proceeding

Questions adapt to context - ask what's needed to understand requirements.

## Step 3: Iterative Content Creation

- Work from large blocks to smaller details
- Create structure, then fill content, then polish
- If existing docs found: discuss how to integrate them into result
- Adjust based on feedback from questions

## Step 4: Pre-Write Validation

Run validation checklist against all 12 principles:
1. Clear purpose stated
2. Logical structure with proper heading hierarchy
3. English language (unless specified otherwise)
4. Single source of truth (no duplication in target directory)
5. Separation of concerns (stays in scope)
6. Data separated from narrative
7. Cross-references valid (all links work)
8. Minimalist writing
9. No unsolicited examples
10. Consistent with existing local style

If issues found, fix before writing.

## Step 5: Write File

- Write or Edit file
- Format with prettier if available
- Stage with git add if in git repo

# Instructions

Follow the workflow steps above. Always apply all 12 principles. Focus on user interaction and documentation quality, not on specific documentation types.
