# tool:improve

Improve existing tools through state machine workflow with mandatory checkpoints.

## Usage

```
/tool:improve [additional context]
```

**Arguments:** Optional context for scanning (NOT direct implementation instructions).

## Execution Model

Uses state machine with named artifacts. Each step:
- **requires**: artifacts from previous steps
- **outputs**: named artifacts (some displayed to user)
- **waits**: pauses for user input
- **actions**: mandatory tool calls

## Workflow

```
[ISSUES_LIST] ← Step 1: Scan conversation
      ↓
[USER_SELECTION] ← Step 2: Show candidates (waits)
      ↓
[TOOL_CONTENT] ← Step 3: Read tool
      ↓
[INTERNAL_MODEL] ← Step 4: Build model (displays)
      ↓
[QUALITY_CHECKLIST] ← Step 5: Derive checklist (displays)
      ↓
[PROBLEM_STATEMENT] ← Step 6: Describe problem (waits)
      ↓
[RESEARCH_RESULTS] ← Step 7: WebSearch (mandatory)
      ↓
[SELECTED_SOLUTION] ← Step 8: Present options (waits)
      ↓
[MODIFIED_TOOL] ← Step 9: Implement
      ↓
[CHANGE_SUMMARY] ← Step 11: Summary (displays)
      ↓
[REMAINING_ISSUES] ← Step 12: Issues (displays)
      ↓
Steps 13-15: Docs, Git, Report
```

## Checkpoints

Execution pauses at:
- Step 2: User selects tool
- Step 6: User confirms problem understanding
- Step 8: User selects solution

Mandatory actions:
- Step 7: WebSearch (cannot skip)

## Example

```
User: [tool:create produces wrong output]
User: Missing validation step

User: /tool:improve

Claude:
[ISSUES_LIST]
1. tool:create — missing validation — user correction

Which tool? → User: tool:create

[INTERNAL_MODEL]
| Purpose | Create new tools |
| ... | ... |

[QUALITY_CHECKLIST]
| Validation | Missing | Required |

Problem: No validation step. Correct? → User: Correct

[WebSearch: validation patterns...]

[COMPARISON_TABLE]
...

Options:
A) Add validation step
B) ...

→ User: A

[Implements, verifies, summarizes]
```
