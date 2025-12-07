# Plan: Improve Business Analyst Agent Description

## Problem Summary

The current BA agent produces outputs that are:
1. **Missing context-specific details** - doesn't systematically gather requirements based on task type
2. **Inconsistent depth** - some areas detailed, others vague
3. **Leaking technical details** - contains implementation language
4. **Missing universal edge cases** - doesn't systematically consider data formats, conflicts, states

## Goal

Improve `.claude/agents/business-analyst.md` to produce **comprehensive, actionable requirements for ANY task type** - whether it's UI features, API changes, data processing, or business logic.

---

## Proposed Changes

### 1. Add Task Type Classification

BA should first identify the task type to apply appropriate requirements gathering:

| Task Type | Examples | BA Focus |
|-----------|----------|----------|
| **UI Feature** | Modal, form, page, notification | What user sees, copy texts, user interactions |
| **Data Feature** | Report, export, import, calculation | User input, validation rules, success/error feedback |
| **Business Logic** | Workflow, rule change, permissions | Business rules, exceptions, who can do what |
| **External Process** | Payment, email, sync with service | User expectations during waiting, failure messages |

### 2. Add Task-Type-Specific Clarification Checklists (Business-Focused)

#### For UI Features (user perspective):
- [ ] What information should the user see?
- [ ] What are the exact texts/messages for each scenario?
- [ ] How does the user interact with this feature?
- [ ] What happens if user performs the same action twice?
- [ ] What should the user see when something goes wrong?
- [ ] Should this feature be accessible to users with disabilities?
- [ ] What happens if user has another dialog/panel open?

#### For Data Features (business rules):
- [ ] What data does the user need to provide?
- [ ] What are the business validation rules?
- [ ] What should happen if data is invalid or missing?
- [ ] What should the user see when operation succeeds?
- [ ] What should the user see when operation fails?
- [ ] Can user perform this action multiple times?

#### For Business Logic:
- [ ] What are the exact business rules/conditions?
- [ ] What are the exceptions to these rules?
- [ ] Who is allowed to perform this action?
- [ ] What triggers this logic?
- [ ] What outcome should the user expect?

#### For External Processes:
- [ ] What should user see while waiting?
- [ ] What should user see if external process fails?
- [ ] Should user be able to cancel or retry?
- [ ] How long should user wait before timeout message?

### 3. Add Universal Edge Cases Section (User-Focused)

Every BA output should consider these edge cases from **user perspective**:

**No Data / Empty Results:**
- What should user see when there's no data?
- What message should be displayed?

**Invalid/Incomplete Data:**
- What should user see if their input is invalid?
- What if some information is missing?

**Repeated Actions:**
- What if user clicks the same button twice?
- What if user submits the same form again?
- What if user triggers action while previous one is still running?

**Conflicts:**
- What if user has another dialog open?
- What if user's data became outdated?

**Failures:**
- What should user see when internet is lost?
- What should user see when server is unavailable?
- What should user see when action takes too long?
- What should user see when they don't have permission?

### 4. Strengthen Non-Technical Language Rules

Add explicit examples of what IS and IS NOT acceptable:

**❌ WRONG (Technical):**
- "Modal managed through modalService"
- "Uses enum for status types"
- "Props passed to component"
- "State stored in context"
- "Interceptor catches errors"
- "Dispatches action to store"

**✅ CORRECT (Business Language):**
- "User sees a popup dialog"
- "System supports three status types: pending, approved, rejected"
- "Dialog receives configuration from caller"
- "System remembers user's selection"
- "Application detects failed requests"
- "System updates the displayed data"

### 5. Add Conditional Output Sections (Business Language Only)

Update output format with conditional sections based on task type:

```markdown
## User Experience (when task involves user-facing feature)

### What User Sees
- Description of the visual element (e.g., "popup dialog in center of screen")
- What information is displayed to the user
- Order/priority of information

### Copy Texts
- All user-facing messages with exact wording
- Button labels, headings, placeholders
- Messages for each state (loading, error, success, empty)

### User Interactions
- How user triggers the feature
- How user dismisses/closes it
- What happens on repeated interaction

### Accessibility Needs
- Should this be accessible to users with disabilities? (yes/no)
- Any specific user group considerations?
```

```markdown
## Data & Validation (when task involves data input/processing)

### User Input
- What information user needs to provide
- Which fields are required vs optional
- What makes input valid/invalid (business rules)

### Feedback to User
- What user sees on success
- What user sees on failure
- What user sees while processing
```

---

## Files to Modify

| File | Action |
|------|--------|
| `.claude/agents/business-analyst.md` | Add task classification, checklists, conditional sections |

---

## Implementation Steps

1. **Add Task Type Classification section** - BA identifies task type first (UI, Data, Business Logic, External Process)

2. **Add Business-Focused Checklists** - Different questions for different task types, all from user perspective:
   - UI Features: what user sees, copy texts, interactions
   - Data Features: user input, validation, feedback
   - Business Logic: rules, exceptions, permissions
   - External Processes: waiting states, failure messages

3. **Add Universal Edge Cases guidance (user-focused)** - Every task should consider:
   - Empty/no data scenarios
   - Invalid input scenarios
   - Repeated actions
   - Conflicts (another dialog open)
   - Failures (network, server, timeout, permissions)

4. **Strengthen Non-Technical Language Rules** - Add clear examples of:
   - ❌ Technical language to avoid (services, enums, props, state)
   - ✅ Business language to use (user sees, system displays, action triggers)

5. **Add Conditional Output Sections** - Business-focused sections:
   - `## User Experience` (what user sees, copy texts, interactions, accessibility needs)
   - `## Data & Validation` (user input, validation rules, feedback)

6. **Update Quality Checklist** - Verify:
   - Task type identified
   - Appropriate checklist applied
   - All edge cases from user perspective
   - No technical language (no code terms)
   - Exact copy texts defined (when applicable)
   - All user-facing states documented

---

## Expected Outcome

After these changes, BA outputs will:

1. **Be systematically complete** - checklists ensure all business questions are asked
2. **Stay in BA domain** - only business requirements, no technical implementation details
3. **Adapt to task type** - different questions for UI vs data vs logic vs external processes
4. **Cover all user scenarios** - edge cases from user perspective (empty, invalid, repeated, conflicts, failures)
5. **Include actionable details** - exact copy texts, all user-facing messages, specific behaviors

This makes the BA agent produce **business-focused requirements that the Architect can then translate into technical specifications**.
