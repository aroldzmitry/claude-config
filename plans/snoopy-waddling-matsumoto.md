# Plan: Restore Critical Functionality (Phase 2)

## Goal
Restore critical missing functionality using `/agent:update` for each file.

## Current State
- Total: 681 lines (42% of original 1606)
- Target: ~825 lines (51% of original)

## Files to Update

### 1. `~/.claude/agents/agent-lint.md`
**Current:** 184 lines → **Target:** ~225 lines (+40)

**Restore via `/agent:update agent-lint`:**
- Completeness & Severity Threshold section
- Anti-pattern: Doc bloat rule
- Examples (PASS/FAIL report samples)

### 2. `~/.claude/commands/agent:improve.md`
**Current:** 173 lines → **Target:** ~195 lines (+22)

**Restore via `/agent:update agent:improve`:**
- Step 1.5: Check for Duplicate Recommendations
- Example Flow

### 3. `~/.claude/commands/agent:update.md`
**Current:** 154 lines → **Target:** ~185 lines (+30)

**Restore via `/agent:update agent:update`:**
- Change Size Guidelines table
- Examples (From Recommendations + Direct Update)

### 4. `~/.claude/commands/agent:create.md`
**Current:** 170 lines → **Target:** ~220 lines (+50)

**Restore via `/agent:update agent:create`:**
- MANDATORY GATE stop markers (3 locations)
- Detailed Step 7: Validate with Agent Lint
- Example: Code Reviewer Agent

## Execution Order
1. agent-lint (foundational)
2. agent:improve
3. agent:update
4. agent:create

## Source
Content extracted from `.bak2` files (original pre-optimization backups).
