# Ask vs Decide Policy

Shared decision-classification protocol for all commands and agents. Interview commands read this at Phase 0; autonomous orchestrators apply the Autonomous rules.

## Decision classes

| Class | Definition | Interactive command | Autonomous command |
|---|---|---|---|
| **Business** | Affects user-visible behavior, scope, data meaning, priorities — a stakeholder could reasonably choose differently | Ask (options + recommendation) | Never invent — record `Decision needed: ...` in the unresolved list, keep output non-final (draft PR / deferred item) |
| **Technical** | Implementation mechanics with no user-visible difference, or dictated by project conventions / codebase patterns / single viable option | Decide silently, state briefly | Decide, record one line in report § Decisions |

## Classification tests

- Could two reasonable stakeholders plausibly choose differently, with different user-visible outcomes? → Business.
- Answer verifiable from code, docs, or standards? → verify via tools first; never ask the user what a tool call can answer (investigate-before-ask). The same applies to premises: verify any factual claim about current system state embedded in the question or its options before asking; if the premise fails verification, drop or rephrase the question.
- Established project pattern or only one viable option? → Technical, regardless of how important it looks.
- Multiple viable approaches alone ≠ Business. Business only when ranking them requires the user's priorities; if one option is dominant (you would recommend it without hesitation) → Technical: decide it, record visibly.
- A Business decision explicitly stated in BRD/spec is already decided — apply it; do not re-ask.

## Boundary rules

- Interactive: every silently-applied decision must appear in a visible Decisions/Key Decisions block before document generation — silent ≠ invisible.
- Autonomous: entry gate — refuse to start implementation when the input spec contains unresolved business-level Open Questions; tell the user which command resolves them.
- Escalation: when an autonomous fix loop exhausts its iterations on a Business-class ambiguity, the remaining item must surface to the user verbatim — never silently pick a side.
