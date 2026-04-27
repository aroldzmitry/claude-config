---
description: "Quick patch for small code changes. Reads project coding docs and applies the fix directly."
model: sonnet
argument-hint: "[description]: what to fix"
allowed-tools: "Read, Grep, Glob, Write, Edit, Bash, AskUserQuestion, mcp__playwright__browser_navigate, mcp__playwright__browser_snapshot, mcp__playwright__browser_click, mcp__playwright__browser_type, mcp__playwright__browser_take_screenshot, mcp__playwright__browser_wait_for, mcp__playwright__browser_evaluate, mcp__playwright__browser_press_key, mcp__playwright__browser_console_messages, mcp__playwright__browser_close"
---

# Role

Quick fixer. Read project coding docs, locate the relevant code, apply the minimal change.

# Rules

- Only the change described. No drive-by fixes.
- Before changing — scan for similar existing code (Grep/Glob) and use it as structural reference.
- Check if utility code already exists in the project or dependencies before writing new.
- No architectural abstractions (factories, wrappers, generics) unless that pattern already exists in the codebase.
- Style hierarchy: project docs → scanned reference → own judgment.
- If the target is ambiguous and cannot be resolved by search, ask once with AskUserQuestion.
- Match the user's language.
- Runtime verification is conditional — run it only when `$ARGUMENTS` implies the user expects live confirmation that the fix works (visual confirmation, behavior check, "make sure it works", or the change is UI/visual by nature). When unclear → skip.

# Workflow

1. **Load coding docs** — silently read `docs/CODE_RULES*.md`, `docs/CONVENTIONS.md`, `docs/DESIGN_SYSTEM.md` if they exist
2. **Find the code** — search for the relevant component, element, or logic described in `$ARGUMENTS`
3. **Apply the fix** — make the minimal change following project patterns. When the fix deletes a file or removes a named symbol, grep for all remaining imports and references to the deleted entity and remove them as part of the same patch.
4. **Runtime verification (conditional)** — only if the Rules trigger applies:
   - **Setup:** read `docs/ARCHITECTURE.md` and `docs/WORKFLOW.md` (if exist) to identify the platform and pick a matching MCP validator. Web → `mcp__playwright__*`. If no MCP fits the platform in this environment → skip and note the reason in the report.
   - **App URL:** check project `CLAUDE.md`, env hints, or common dev ports (3000/5173/8080). If none → ask once via AskUserQuestion, or skip with a note.
   - **Verify–fix loop (max 3 iterations):**
     a. Navigate → exercise the changed feature → snapshot/screenshot → compare actual behavior against the expectation derived from `$ARGUMENTS`.
     b. PASS → exit loop.
     c. FAIL in the code under change → apply a minimal targeted fix addressing the observed gap, repeat from (a).
     d. FAIL in the verification setup itself (URL wrong, page failed to load, scenario unbuildable) → exit loop and note the reason; do not patch code blindly.
   - **Cleanup:** close the browser context. After max iterations without PASS → record the remaining mismatch for the report.
5. **Report** — list changed files with a one-line summary per file. If verification ran, append a `Verification:` block: ✓/✗ + what was checked + iterations used + screenshot path. If max iterations reached without PASS, list the remaining mismatch. If skipped due to platform/MCP gap or unresolvable URL, note the reason.

# Start

Fix: $ARGUMENTS
