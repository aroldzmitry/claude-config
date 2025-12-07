# Command Improvements History

## 2025-12-05 - agent:create.md (update)

**Idea:** Replace manual validation checklist with agent-check subagent call
**Change:** Step 7 now invokes agent-check for automated validation, then applies recommendations based on whether they align with user's original request or need user confirmation
**Status:** Applied

## 2025-12-05 - agent:lint.md
**Issue:** agent-lint system agent couldn't find global scope files (e.g., agent:improve in ~/.claude/)
**Change:** Added Scope Hierarchy section with instructions to search both project (.claude/) and global (~/.claude/) scopes
**Status:** Pending validation

## 2025-12-05 - agent:lint.md (update)
**Issue:** Claude executed validation inline instead of spawning subagent via Task tool
**Change:** Added explicit Execution section requiring Task tool delegation with example syntax
**Status:** Pending validation

## 2025-12-05 - agent:improve.md (update)
**Idea:** Add 4 improvements from agent-lint validation
**Change:**
1. Step 0: prioritized auto-detect with edge case for dual-scope files
2. Step 2.5: context management for long sessions (100+ messages)
3. Step 7.5: added empirical validation checks
4. Step 7.75: progressive disclosure for complex changes
**Status:** Applied

## 2025-12-05 - agent:update.md (update)

**Source:** agent-lint validation suggestion #3
**Change:** Added "Web Research for Complex Changes" subsection to Step 3 with trigger table and guidance for using WebSearch before proposing complex or unprecedented changes
**Status:** Applied

## 2025-12-06 - agent:update.md (update)

**Source:** /agent:update
**Change:** Updated Step 6 delegation prompt from "CONFIRMED. Apply to [full_file_path]:" to "CONFIRMED. Update [full_file_path]:" for consistency with executor subagent expectations
**Status:** Applied

## 2025-12-06 - agent:improve.md (update)

**Source:** /agent:update
**Change:** Added YAML frontmatter with description and argument-hint fields for command metadata
**Status:** Applied

## 2025-12-06 - agent:improve.md (update)

**Source:** /agent:update
**Change:** Updated Rules section to allow Write tool ONLY for suggestions.md output, while maintaining prohibition on Edit tool and direct file modifications
**Status:** Applied

## 2025-12-07 - agent:create.md (update)

**Source:** /agent:update
**Change:** Updated Step 6 git commit message format from "Create agent: {agent-name}" to "Create {type}: {name} - {short-description}" with template variables for type, name, and short-description
**Status:** Applied

## 2025-12-07 - agent:lint.md (update)

**Source:** /agent:update
**Change:** Added blank line before YAML frontmatter opening delimiter
**Status:** Applied
