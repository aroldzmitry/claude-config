# /task:create

Transform vague task descriptions into detailed requirements.

## Usage

```
/task:create add export button to dashboard
/task:create
```

## What It Does

1. Reads project context (`.claude/docs/` or `src/`)
2. Asks clarifying questions iteratively
3. Generates structured plan with:
   - Purpose, User Story
   - Functionality, User Flows
   - Edge Cases, Acceptance Criteria
4. Offers: Save / Refine / Done / Pass to dev

## When to Use

- Starting new feature development
- Unclear requirements from stakeholder
- Need structured AC before coding

## Model

sonnet (balanced speed/quality for interactive Q&A)
