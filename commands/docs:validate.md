---
description: Validate user flow documentation against related artifacts for consistency and completeness
argument-hint: <user-flow-file-path>
allowed-tools: Read, Glob, Grep, AskUserQuestion
model: sonnet
---

# Documentation Validator

Validate user flow file against related artifacts: test cases, checklists, work plans. Report inconsistencies, missing files, coverage gaps with quality score.

## Input

`$ARGUMENTS` contains path to user flow file. If empty, use AskUserQuestion to request path.

## Process

### Step 1: Validate Flow File

Read user flow file. If file not found or unreadable, report error and exit.

Check flow structure:
- Required sections: System Context, Goals, Happy Path, Alternative Paths, Negative Scenarios
- If malformed (missing sections, broken markdown), add to issues list with specific errors
- Continue validation with parseable sections

### Step 2: Locate Related Files

From user flow path, derive:
- Area: parent directory name (e.g., `docs/userFlows/auth/login.md` → `auth`)
- Flow name: file name without extension

Search for related files:
- Checklist: `docs/checklists/{area}/{flow-name}.md`
- Test cases: `docs/testCases/{area}/{flow-name}.md`
- Work plan: `docs/workPlans/{flow-name}-work-plan.md`

### Step 3: Missing Document Detection

For each expected file:
- If not found → add to `missing_files` list with expected path
- If found but unreadable/malformed → add to `malformed_files` list
- If found and valid → add to `found_files` list for validation

### Step 4: Parse Documents

For each found file, extract:
- **User flow**: Goals, Happy Path steps, Alternative Paths (A1, A2...), Negative Scenarios (N1, N2...), Success Criteria, Component Mapping
- **Checklist**: CL-IDs with Source references, Coverage Summary
- **Test cases**: TC-IDs with Covers references, Priority levels
- **Work plan**: REQ-IDs with status (Done/Partial/Missing)

### Step 5: ID Cross-Reference Validation

Check ID consistency:

1. **Flow → Checklist**: Every flow section (Goal, Happy Path, Alternative, Negative) should have ≥1 CL-ID referencing it
2. **Flow → Test cases**: Every flow section should have ≥1 TC-ID with Covers field referencing it
3. **Checklist → Test cases**: CL-IDs should map to TC-IDs covering same flow sections
4. **Work plan → Flow**: REQ-IDs should trace back to flow requirements

Report orphaned IDs (IDs in artifacts that don't trace to flow).

### Step 6: Bidirectional Traceability Check

Verify links work both directions:
- Forward: Flow section → finds CL-ID → finds TC-ID
- Backward: TC-ID → references CL-ID or flow section → exists in flow

Report broken links.

### Step 7: Coverage Gap Detection

Identify flow sections without coverage:
- Happy Path steps without test cases
- Alternative Paths without test cases
- Negative Scenarios without test cases
- Goals without checklist items

### Step 8: Consistency Validation

Use string matching only (no semantic analysis). Check for contradictions:

**Navigation/Redirect checks:**
- Extract URLs/routes from flow Success Criteria and Exit Paths
- Compare with Expected Results in test cases
- Contradiction example: Flow says "redirect to /home" but test expects "/dashboard"

**Error message checks:**
- Extract error messages from flow Negative Scenarios
- Compare with test case Expected Results (exact string match)
- Contradiction example: Flow specifies "Email already exists" but test expects "User already registered"

**State/behavior checks:**
- Extract UI states from flow Component Mapping
- Compare with test case assertions
- Contradiction example: Flow says "button disabled during loading" but test expects "button shows spinner"

**Success criteria checks:**
- Extract observable outcomes from flow Success Criteria
- Compare with checklist Expected Results
- Contradiction example: Flow says "toast notification appears" but checklist says "redirect immediately"

### Step 9: Calculate Quality Score

Score 0-10 based on weighted criteria:

| Criterion | Weight | Scoring |
|-----------|--------|---------|
| Files present | 25% | 0=none, 5=some, 10=all |
| Coverage completeness | 25% | 10 - (gaps / total_sections * 10) |
| Traceability | 25% | 10 - (broken_links / total_links * 10) |
| Consistency | 25% | 10 - (contradictions * 2), min 0 |

Final score = weighted average, rounded to 1 decimal.

Score interpretation:
- 9-10: Excellent, documentation fully aligned
- 7-8: Good, minor gaps or issues
- 5-6: Fair, needs attention
- 3-4: Poor, significant gaps
- 0-2: Critical, major inconsistencies

### Step 10: Output Report

Print validation report to console:

```
Validation Report: {flow-name}
Quality Score: {X.X}/10 ({interpretation})

Files:
- User flow: {path}
- Checklist: {path | MISSING}
- Test cases: {path | MISSING}
- Work plan: {path | MISSING}

Missing Files: {count}
{list with expected paths}

Malformed Files: {count}
{list with parse errors}

ID Cross-Reference:
- Flow sections: {count}
- Checklist items: {count} ({orphaned} orphaned)
- Test cases: {count} ({orphaned} orphaned)
- Work plan requirements: {count}

Coverage Gaps: {count}
{list: flow section → missing artifact type}

Traceability Issues: {count}
{list: broken links with source → target}

Consistency Issues: {count}
{list with specific contradictions found}

Status: {PASS | FAIL | WARN}
```

Status rules:
- PASS (score ≥8): All files present, no critical gaps
- WARN (score 5-7): Minor issues, orphaned IDs, optional sections missing
- FAIL (score <5): Missing files, coverage gaps, or contradictions

## Rules

- Continue validation even if some files missing or malformed
- Report all issues found, not just first
- Use exact string matching for consistency checks (no semantic inference)
- ID patterns: CL-### for checklist, TC-XXX-### for test cases, REQ-### for work plan
- Skip sections explicitly marked as out-of-scope
- Only validate and report, never modify files
