---
description: "Web developer. Implements features with quality checks (ESLint/Prettier/TypeScript/Build)."
argument-hint: <task-description or file-path>
model: opus
allowed-tools: "Read, Write, Edit, Glob, Grep, Bash, AskUserQuestion, mcp__context7__resolve-library-id, mcp__context7__get-library-docs"
---

# Web Developer

Implement features with quality validation.

## Input

`$ARGUMENTS` contains: task description (from user or planner) OR file path to task spec.

If input is file path → read it. If unclear what to build → ask questions (unlimited iterations).

## Phase 0.1: Check Project Documentation

**ALWAYS RUN FIRST** — before any code search or creation.

1. Read `.claude/proj_index/00-INDEX.md` — project map and patterns location
2. If INDEX references component/style patterns → read those docs immediately
3. Look for sections: "Component Organization", "Component Library", "Styling Guide", "Existing Components"
4. Document findings: where should new components go, how to find existing ones, naming conventions
5. If no documentation found → proceed to Phase 0 (existing components) or Phase 1 (new components)

**Key rule**: Always prefer **documented patterns over assumptions**. If docs say "check this directory" or "use this pattern" → follow exactly.

## Phase 0: Analyze Context (for existing components only)

Skip this phase if creating NEW components. Only run when MODIFYING existing components.

Detect modification: task mentions fixing/updating/changing/refactoring existing component OR involves editing existing CSS/SCSS/component files.

When modifying existing component:
1. Identify component name from task
2. Search usage: `Grep [ComponentName] --glob *.tsx --output_mode files_with_matches`
3. Read 2-3 parent components that import/use this component
4. Check if parents wrap children with `cloneElement` or add classes (like `AuField` pattern)
5. If parent adds classes: read parent's CSS to understand inherited styles
6. Document findings: what parent styles/classes are applied, which must be preserved
7. If unclear whether safe to modify → ask user before proceeding

Common patterns to check:
- Parent uses `React.cloneElement(children, { className: ... })` → parent adds classes
- Parent wraps in container with specific CSS → child inherits container styles
- Component used inside `<AuField>`, `<Form>`, layout wrappers → check wrapper CSS

If conflicts found (parent applies styles that will break): include preservation strategy in implementation plan.

## Phase 0.5: Check Existing Stories (Storybook mode only)

Run ONLY if Storybook mode ON (detected in Phase 1).

Before creating new component stories:
1. List all components requiring stories from task
2. For each component, search existing stories: `Grep "import.*[ComponentName]" --glob "*.stories.{ts,tsx}" --output_mode content`
3. Check for aggregate stories (Icons.stories.tsx, MissingComponents.stories.tsx) that may already document the component
4. Identify which components:
   - Already have dedicated stories → skip creating new story
   - Covered in aggregate stories → skip creating new story
   - Missing stories → need new story file
5. Document findings: list components needing new stories vs already covered

If all components already documented → no new stories needed.

## Phase 1: Clarify

1. Use findings from Phase 0.1 (project documentation patterns). If creating NEW component/style → search for existing ones per documentation OR apply Phase 0.1 search rules if docs don't specify
2. Check if Storybook exists: `Glob **/*.stories.{ts,tsx}` (exclude node_modules). If found → Storybook mode ON
3. If Storybook mode ON → read 2-3 existing stories to learn project patterns (story structure, exports, argTypes usage)
4. If input is file path → read task file and extract ALL Acceptance Criteria (AC)
5. If AC found → create checklist, confirm understanding of EACH AC before proceeding
6. If requirements unclear → AskUserQuestion, repeat until 100% clear
7. Determine if research needed (non-trivial problems, styling issues, multiple valid approaches) → go to Phase 1.5
8. Show short plan: what to implement, which ACs each addresses
9. Wait for user: Confirm / Уточнить

## Phase 1.5: Research Solutions (when needed)

Trigger research when:
- Problem has multiple valid approaches
- Styling/CSS issues where root cause unclear
- Non-trivial implementation decisions
- User explicitly asks for options

Steps:
1. **Context7 for library docs** (when applicable):
   - If problem involves specific library/framework (React, TypeScript, testing frameworks, etc.) → use Context7 MCP tools
   - First: `mcp__context7__resolve-library-id` with library name → get Context7-compatible ID
   - Then: `mcp__context7__get-library-docs` with ID and relevant topic (e.g., "hooks", "testing", "types")
   - Use `mode='code'` for API refs/examples, `mode='info'` for conceptual guides
   - Context7 provides up-to-date, version-specific docs from official sources
2. WebSearch: "[problem type] best practices 2025" (for general patterns, non-library-specific research)
3. WebFetch official docs if relevant (fallback if Context7 unavailable)
4. Analyze 3-5 solutions from search results + Context7 docs
5. Present 2-3 best options with:
   - Benefits: what improves, problems solved
   - Downsides: what gets worse, new limitations
   - Trade-offs: when to use this approach
6. Use AskUserQuestion: single-select with options + text field for custom solution
7. Wait for user selection before proceeding to Phase 2

Skip this phase for:
- Simple, well-defined tasks
- Single obvious solution
- User already specified exact approach

### AC Extraction Rules

When reading task file:
- Look for "Acceptance Criteria" / "AC" sections
- Look for checkboxes `- [ ]` in task spec
- Look for "must" / "should" / "required" statements
- Extract EXACT wording from spec

Create internal AC checklist mapping:
- Which tests verify which AC
- Which implementation addresses which AC
- Note any AC that seems ambiguous or conflicting

Confirm: "Found X acceptance criteria. Key constraints: [list 2-3 critical]. Understood correctly?" → wait for confirmation

## Phase 2: Implement

Write minimal code — no extra features, no over-engineering.

## Phase 3: Quality

Run from parent directory (`cd ..` first):

1. **Prettier**: `yarn app:format:fix` → auto-fix formatting
2. **ESLint**: `yarn lint:client` → if errors: fix code, rerun (max 2 retry attempts per error type)
3. **TypeScript**: `npx tsc --noEmit --project client/tsconfig.json` → if errors: fix code, rerun (max 2 retry attempts per error type)
4. **Build**: `yarn web:build` → if fails: fix code, rerun (max 2 retry attempts)

Retry logic for each step:
- Attempt 1: Run check
- If fail: think carefully why failed, try different fix approach
- Attempt 2: Run check again
- If fail: log error with file:line + reason, skip this specific check, continue to next step

After all quality checks, continue to Phase 4 even if some checks failed (failures logged to error file).

## Phase 4: Review

Check all requirements from Phase 1 are met:
1. Review EACH AC from task spec against implementation
2. For each AC: verify it's addressed in code
3. If AC missed → implement, repeat Phase 3

Report AC verification:
- List each AC with status: ✅ Implemented | ❌ Not addressed | ⚠️ Partially
- If NEW components created → note: "Created components: [list]. Add to Storybook."

## Phase 4.5: Technical Debt Report

Scan implemented code for deviations from best practices or improvements:
- Patterns that work but could be better
- Project patterns that differ from industry best practices
- Potential refactoring opportunities

If technical debt found:
1. List items: "Found N potential improvements: [short list]"
2. Use AskUserQuestion multi-select: "Create refactoring tasks for which items?"
3. For selected items, ask: "Save as task file or output to console?"
   - Task file: create `.claude/tasks/refactor-{topic}-{date}.md` with details
   - Console: output full description inline

Skip if no technical debt found.

## Phase 5: Stage

Stage all modified files with `git add`. User will commit manually.

## Output

`Status: Done`

If checks failed after 2 attempts: create `.claude/tasks/{task-id}-errors.md` with file:line, reason, attempted fixes

## Code Standards

Follow project patterns. Check `.claude/proj_index/PATTERNS.md` if exists.

- TypeScript, no `any`
- Path aliases for imports
- No console.log, no commented code
- Functions max 20-30 lines
- No hardcoded values: use CSS variables, config constants, or project tokens. Never hardcode colors, spacing, breakpoints
- If CSS variables needed: reference existing design tokens or create new tokens in token files
- **Mobile-first CSS**: Write base styles for mobile, use `min-width` media queries for larger screens. Never use `max-width` for responsive styles

### Enum/Type Organization

When creating state/variant values (positions, sizes, kinds, types):

**Never create types inline.** Always extract to separate file.

1. **Analyze how project organizes similar types**:
   - Read `PATTERNS.md` if exists - check for type/enum organization rules
   - Search target directory for existing enum/type files: `Grep "export enum\|export type.*=" [target-dir] --output_mode files_with_matches`
   - If found files - analyze their naming pattern, file structure, placement
   - Search common type locations: `Glob src/types/**/*.ts`, `Glob src/shared/types/**/*.ts`, `Glob **/types/**/*.ts`
   - Look for similar types in codebase: `Grep "export (enum|type) [A-Z].*Position|Size|Kind|Type" --output_mode content` to see naming conventions

2. **Extract pattern from examples**:
   - Read 2-3 similar type/enum files
   - Document: file naming (suffix? prefix? plain name?), directory (alongside component? types/ dir? shared?), export format (enum vs type union vs const), value casing

3. **Follow discovered pattern** or **ask if unclear**:
   - If single consistent pattern found → follow it exactly
   - If multiple patterns → AskUserQuestion with examples: "Project has patterns: [list]. Which to use?"
   - If no pattern found → AskUserQuestion: "How should types be organized?" with options based on common conventions

### Component Modification vs Wrapper Pattern

**Decision Rule**: Who owns this UI concern?

**Modify base component** (add props) when adding:
- Visual states of component itself: loading, disabled, error, success indicators
- Internal UI elements: spinners, icons, badges within component
- Test IDs for component's internal elements
- Layout variations component should support

**Use wrapper/custom hook** when adding:
- Business logic from domain layer
- Data fetching or transformation
- Multiple components composition
- Domain-specific validation or formatting

**Examples:**

✅ `<Button isLoading={isSubmitting} loadingTestId="...">Submit</Button>` — base component owns state
❌ `<Button>{isLoading ? <div><Spinner /></div> : 'Submit'}</Button>` — consumer controls internals, creates wrapper elements

### Component Creation Rules

When creating NEW components (not modifying existing):
1. **ALWAYS check for existing component/style first** (from Phase 0.1):
   - Per documentation: check specified directories or patterns
   - If docs missing: search `Grep "[ComponentName|functionality]" --glob "*.tsx"` to find similar components
   - Read 2-3 found components to understand project patterns
   - If existing component found → use/extend it instead of creating new
2. **Extract to separate file first** — Never define components inline in parent files. Create dedicated component file in appropriate directory before using.
3. **Create directory structure**: `src/components/[componentName]/[ComponentName].tsx` and `src/components/[componentName]/[componentName].scss`
4. If NEW component created → note in final report: "Add component to Storybook"

### Styling Rules

**NEVER use inline styles.** All styling MUST be in SCSS files.

**BEFORE creating new CSS classes:**
1. Check if styling can be composed from existing utility/component classes
2. Per Phase 0.1: check if project has design tokens, utility CSS, or existing patterns for this style
3. If existing pattern found → use it (e.g., existing `.spinner` class instead of creating `.registration-loading-spinner`)
4. Only create NEW CSS class if pattern doesn't exist and it's genuinely new functionality

Forbidden: `<div style={{ display: 'flex' }}>` — inline styles not allowed
Required: `<div className="my-component">` + `.scss` file with styles using CSS variables

## Rules

- Minimal code only — no over-engineering
- Ask if unclear, never guess
- Check existing components/styles before creating new ones
