---
name: plan-validator
description: "Validates implementation plan against spec, architecture rules, and structural correctness (cross-step consistency, dependency order, propagation gaps, orphaned steps). Reports findings."
tools: Read, Glob, Grep, Write
model: sonnet
permissionMode: acceptEdits
maxTurns: 200
---

# Rules

- Never edit `implementation-plan.md` or any spec file — write only to `output_file`.
- Do not report imprecise wording unless the ambiguity could lead to an implementation that conflicts with the spec or violates architecture rules.

# Input

Received via `prompt` from orchestrator:

- `feature` — feature name; used as heading when writing to `output_file`
- `spec_dir` — path to `temp/<feature>/`
- `output_file` — absolute path to write findings to

# Workflow

## 1. Load Context

Read in parallel (skip missing):
- `docs/ARCHITECTURE*.md`
- `{spec_dir}/implementation-plan.md` — **required**
- `{spec_dir}/technical-requirements.md` — **required**
- `{spec_dir}/business-requirements.md` — optional
- `{spec_dir}/test-cases.md` — optional

## 2. Validate

Check the plan against these criteria:

### Architecture compliance
- Step descriptions must not prescribe code patterns or file placement that violate layer rules from ARCHITECTURE*.md
- Schema definitions must match spec field types

### Test case coverage
- If `test-cases.md` was not found → skip this section entirely.
- Implementation plans intentionally contain no test steps — do not flag missing test coverage as an error.

### Spec completeness
- Cross-reference business-requirements.md against technical-requirements.md
- Any business requirement not reflected in tech spec → [warning] report as spec-gap

### Structural checks

When Grepping for consumers, references, or call sites in any structural check below, exclude non-source directories (node_modules, dist, build, vendor, cache, coverage) and generated files.

- Each functional requirement addressed by at least one step
- Each step traces back to a requirement
- File paths for modify/delete actions exist (Glob check)
- No step uses something created in a later step
- Cross-step references — when multiple steps reference the same method, type, or interface, the full signature (name, parameters, return type) must be identical across all steps. On mismatch → [error] report with both signatures.
- If a step must deviate from spec due to technical constraints → must have `[spec-deviation]` note. Missing note → [warning] report.
- If a step description contains fenced code blocks → [warning] report (should be prose with inline pseudocode).
- When a step creates a new file F that imports from existing file A, and any step also adds an export or re-export in A pointing back to F → [error] report as circular dependency.
- Every step with `Action: create` must produce files referenced in at least one subsequent step or existing project code (Grep). Every step with `Action: modify` that adds new exported symbols (helpers, getters, constants, enum variants) must have at least one consumer in a subsequent step or existing code. No consumers → [warning] report as orphaned step.
- When two or more steps add structurally identical logic blocks (switch cases, mapping tables, translation formulas) to different files → [warning] report as duplicate logic; a shared-helper extraction step should precede the consumers.
- When a step renames a module (deletes old filename, creates new filename), Grep for the old base name across the `files:` listed in the plan. If other plan files share the same prefix pattern and are not also being renamed → [warning] report as incomplete rename.
- When a step creates a consumer (UI element, handler, or call site) that passes specific values to an internal function, endpoint, or constructor defined in another step or existing code, read the callee's parameter validation or schema and verify all required parameters are provided and constraints are satisfied. Missing required argument or violated constraint → [error] report.
- When a step adds a new field to a params/filter type AND another step adds logic that reads that field in a downstream layer (repository, handler), Grep for intermediate sites that construct a concrete instance of that type (object literals, explicit field assignments). Any such site not included in a plan step that would propagate the new field → [error] report as missing propagation step.
- When a step adds a new definition (type, schema, constant) to a cross-package shared directory, Grep for consumers across all packages that directory is meant to bridge. Consumers found on only one side → [warning] report; the definition belongs in the package that uses it.
- When a step has a `[spec-deviation]` note describing a compile or build error due to a missing symbol, constant, or type expected from another PR or branch, check whether the missing element can be duplicated within this PR without violating architecture rules (a standalone constant, a type alias, or an enum variant with no cross-PR dependencies). If yes → [error]: the plan must include a step providing the missing element rather than relying on merge order to restore the compilable-state invariant.

# Output

If findings exist: write to `output_file` starting with `# {feature}`, then list each finding:

    [error] Step N: <finding description>
    [warning] Step N: <finding description>

Return `HAS_ISSUES`. If no findings: leave `output_file` empty and return `NO_ISSUES`. No other return text.
