# Improvement History

## 2025-12-06 - agent-lint.md (Log Format Update)

**Source:** /agent:update
**Change:** Updated suggestions log format in step 6 from detailed multi-field format with title, severity, description, and status to simplified format with issue, severity, selected status, and recommendations. This aligns with the actual logging format used by agent:improve workflow.
**Status:** Applied

---

## 2025-12-06 - agent-update.md (Error Handling Section)

**Source:** /agent:update
**Change:** Added Error Handling section with comprehensive error scenario table. Defines clear error messages and actions for: file not found, invalid frontmatter, missing fields, backup failures, edit failures, and old_string not found. All errors must include full file path for debugging.
**Status:** Applied

---

## 2025-12-06 - agent-update.md (Step 3 Apply Enhancement)

**Source:** /agent:update
**Change:** Enhanced Step 3: Apply section to specify explicit parsing instructions. Agent must now parse old_string and new_string blocks from prompt and use exact values with Edit tool. Added error handling for missing blocks.
**Status:** Applied

---

## 2025-12-06 - agent-update.md (Input Format Specification)

**Source:** /agent:update
**Change:** Updated Input Format section to specify exact structure: command must provide file_path, old_string (in triple backticks), and new_string (in triple backticks) instead of just "[change description]". This makes the executor's job clearer by receiving ready-to-apply Edit tool parameters.
**Files:**
- `~/.claude/agents/agent-update.md`
**Backups:**
- `~/.claude/agents/.backups/agent-update.md.bak1`
- `~/.claude/agents/.backups/agent-update.md.bak2`
**Status:** Applied

---

## 2025-12-06 - agent:lint.md (Always Enable Research & Deep Reasoning)

**Source:** /agent:update
**Change:** Removed --r flag entirely. Web research and ultrathink are now always enabled for all validations. Simplified argument parsing to only extract target file path. Updated description to reflect always-on behavior.
**Files:**
- `~/.claude/commands/agent:lint.md`
**Backups:**
- `~/.claude/commands/.backups/agent:lint.md.bak1`
- `~/.claude/commands/.backups/agent:lint.md.bak2`
**Status:** Applied

---

## 2025-12-06 - agent-lint.md (Model Upgrade & Web Research)

**Source:** /agent:update
**Change:** Upgraded model from `sonnet` to `opus` with `ultrathink: true` enabled. Changed web research from optional (flag-based) to mandatory - now always searches for similar agents and best practices before generating suggestions.
**Files:**
- `~/.claude/agents/agent-lint.md`
**Backups:**
- `~/.claude/agents/.backups/agent-lint.md.bak1`
- `~/.claude/agents/.backups/agent-lint.md.bak2`
**Status:** Applied

---

## 2025-12-06 - agent-update.md (Simplification to Pure Executor)

**Source:** /agent:update (direct)
**Change:** Completely simplified agent-update.md from 268 lines to 89 lines (-67%). Removed all decision-making, confirmation, and user interaction logic - now pure executor that receives confirmed tasks from /agent:update command. Removed AskUserQuestion, WebSearch tools. Kept only core execution: validate, backup, apply, log, report.
**Files:**
- `~/.claude/agents/agent-update.md`
**Backups:**
- `~/.claude/agents/.backups/agent-update.md.bak1`
- `~/.claude/agents/.backups/agent-update.md.bak2`
**Status:** Applied

---

## 2025-12-06 - agent-update.md, agent:update.md (Subagent Architecture Fix)

**Source:** /agent:improve → /agent:update
**Changes:**
1. agent-update.md (subagent):
   - Added CRITICAL note: subagent cannot ask user questions
   - Updated Workflow to clarify architecture (command confirms, subagent executes)
   - Modified Step 6 to MANDATORY immediate execution with explicit steps
2. agent:update.md (command):
   - Added Confirmation flow section (command level)
   - Updated Task calls to include "CONFIRMED" prefix
   - Clarified responsibility separation between command and subagent

**Files:**
- `~/.claude/agents/agent-update.md`
- `~/.claude/commands/agent:update.md`

**Backups:**
- `~/.claude/agents/.backups/agent-update.md.bak1`
- `~/.claude/commands/.backups/agent:update.md.bak1`

**Status:** Applied

---

## 2025-12-06 - agent:create.md (lint improvements)

**Source:** /agent:lint → direct edit
**Changes:**
1. Added YAML frontmatter with description and argument-hint
2. Step 3: /docs agents now via SlashCommand, web research mandatory
3. Step 6: validation now uses `/agent:lint {path} --r ultrathink`

**Status:** Applied

---

## 2025-12-06 - agent:create.md, agent:update.md (Optimization Recommendations)

**Source:** /agent:improve → /agent:update
**Changes:**
1. Added "Writing for Claude (not humans)" section — what Claude needs/doesn't need
2. Added "Before Writing" checklist — 4-point optimization check
3. Added "Optimization Check" to agent:update.md — Modify > Add > New Section priority

**Files:**
- `~/.claude/commands/agent:create.md` — recommendations 1, 2
- `~/.claude/commands/agent:update.md` — recommendations 1, 2, 3

**Status:** Applied

---

## 2025-12-06 - agent:create.md (Phase 2 restoration)

**Source:** /agent:update (direct)
**Change:** Restored Validate with Agent Lint section + Code Reviewer Example (+50 lines)
**Status:** Applied

---

## 2025-12-06 - agent:update.md (Phase 2 restoration)

**Source:** /agent:update (direct)
**Change:** Restored Change Size Guidelines + Examples (+50 lines)
**Status:** Applied

---

## 2025-12-06 - agent:improve.md (Phase 2 restoration)

**Source:** /agent:update (direct)
**Change:** Restored Step 2.5 Duplicate Check + Example Flow (+45 lines)
**Status:** Applied

---

## 2025-12-06 - agent-lint.md (Phase 2 restoration)

**Source:** /agent:update (direct)
**Change:** Restored Completeness & Severity Threshold + Examples (+55 lines)
**Status:** Applied

---

## 2025-12-06 - agent:create.md (restoration)

**Source:** /agent:update (direct)
**Change:** Restored Prompting Best Practices + Thinking Mode + Anti-Patterns (+30 lines)
**Status:** Applied

---

## 2025-12-06 - agent:update.md (restoration)

**Source:** /agent:update (direct)
**Change:** Restored Thinking Mode + Web Research + Migration + Anti-Patterns (+40 lines)
**Status:** Applied

---

## 2025-12-06 - agent:improve.md (restoration)

**Source:** /agent:update (direct)
**Change:** Restored Context Management + FORBIDDEN tools sections (+15 lines)
**Status:** Applied

---

## 2025-12-06 - agent-lint.md (restoration)

**Source:** /agent:update (direct)
**Change:** Restored Suggestions Tracking section (+30 lines)
**Status:** Applied

---

## 2025-12-06 - Global Agents/Commands Optimization

**Source:** /agent:update (direct)
**Changes:**
Token optimization — removed redundant examples, JSON templates, duplicate sections:

| File | Before | After | Reduction |
|------|--------|-------|-----------|
| agent:create.md | 460 | 140 | -70% |
| agent:update.md | 409 | 119 | -71% |
| agent-lint.md | 394 | 153 | -61% |
| agent:improve.md | 343 | 157 | -54% |
| **Total** | **1606** | **569** | **-65%** |

**Status:** Applied

---

## 2025-12-05 - agent:improve.md

**Source:** /agent:update (from /agent:lint recommendations)
**Changes:**
1. Added explicit web research triggers (when to research vs skip)
2. Added Step 1.5: Check for Duplicate Recommendations
**Status:** Applied

## 2025-12-05 - agent:update.md (3 improvements)

**Source:** /agent:update (from /agent:lint recommendations)
**Changes:**
1. Added "Thinking Mode for Complex Changes" section with complexity signals table
2. Enhanced "Web Research for Complex Changes" with concrete search query examples
3. Added "Step 0.5: Detect Rollback Request" for quick rollback access via keywords
**Status:** Applied

## 2025-12-05 - agent:improve.md

**Source:** /agent:update (from /agent:improve)
**Changes:**
1. Added explicit FORBIDDEN tools list (Edit, Write, NotebookEdit)
2. Added self-check instruction to stop and save to suggestions.md instead
**Status:** Applied

## 2025-12-05 - agent-lint.md

**Source:** /agent:update (from /agent:improve)
**Changes:**
1. Replaced Improvement Suggestions output format to enforce severity threshold — Low issues get brief one-line mentions, Medium+ get full format
**Status:** Applied

## 2025-12-05 - agent:lint.md (command)

**Source:** /agent:update (from /agent:improve)
**Changes:**
1. Added Argument Parsing section with `think`/`ultrathink` flag support
2. Updated Execution section to pass thinking mode to agent-lint subagent
**Status:** Applied
