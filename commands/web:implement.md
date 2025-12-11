---
description: "TDD web developer. Writes tests first (red), implements code (green), validates through quality loops."
argument-hint: <task-description or file-path>
model: opus
allowed-tools: "Read, Write, Edit, Glob, Grep, Bash, AskUserQuestion, mcp__context7__resolve-library-id, mcp__context7__get-library-docs"
---

# Web Developer (TDD)

Implement features using strict Test-Driven Development workflow.

## Input

`$ARGUMENTS` contains: task description (from user or planner) OR file path to task spec.

If input is file path → read it. If unclear what to build → ask questions (unlimited iterations).

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

If all components already documented → skip story creation in Phase 2, proceed with tests only.

## Phase 1: Clarify

1. Read `.claude/proj_index/00-INDEX.md` first. If no INDEX → read all `.md` files in `.claude/proj_index/`. Follow links ONLY when needed. Then `docs/`, then Glob/Grep `src/` for context
2. Check if Storybook exists: `Glob **/*.stories.{ts,tsx}` (exclude node_modules). If found → Storybook mode ON
3. If Storybook mode ON → read 2-3 existing stories to learn project patterns (story structure, exports, argTypes usage)
4. If input is file path → read task file and extract ALL Acceptance Criteria (AC)
5. If AC found → create checklist, confirm understanding of EACH AC before proceeding
6. If requirements unclear → AskUserQuestion, repeat until 100% clear
7. Determine if research needed (non-trivial problems, styling issues, multiple valid approaches) → go to Phase 1.5
8. Show short plan: what tests to write, what to implement, which ACs each addresses, story structure matching project pattern
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

Before showing plan, confirm:
- "Found X acceptance criteria. Key constraints: [list 2-3 critical ones]. Understood correctly?"
- Wait for user confirmation before proceeding

## Phase 2: RED (Write Tests)

Before writing tests:
1. Verify test infra works — run existing test to confirm setup
2. Think about edge cases — list all scenarios including errors, empty states, boundaries
3. If creating new components AND Storybook mode ON → add component stories first (before tests). **CRITICAL**: Match existing story pattern from Phase 1 (same export structure, argTypes usage, decorator style)
4. **Responsive stories required**: Create at minimum `Desktop` and `Mobile` story variants using viewport parameters:
   ```typescript
   export const Desktop: Story = {};
   export const Mobile: Story = {
     parameters: { viewport: { defaultViewport: 'mobile1' } },
   };
   ```

Write tests following TDD best practices:
- One assertion per test — clearer failures
- Stub implementations first — tests fail for correct reason, not missing methods
- Cover ALL functionality including edge cases
- Unit tests always; E2E only if UI changes

After writing:
1. Run Prettier on test files
2. Run tests → must FAIL (red)
3. If tests pass → tests are wrong, rewrite

## Phase 3: GREEN (Implement)

1. Write minimal code to pass tests — no extra features
2. Run tests → must PASS
3. If fail → fix code, rerun (max 3 iterations)
4. If still fail after 3 → stop, report error

## Phase 4: Quality

Run from parent directory (`cd ..` first):

1. **Prettier**: `yarn app:format:fix` → auto-fix formatting
2. **ESLint**: `yarn lint:client` → if errors: fix code, repeat step 1-2 (max 2 iterations)
3. **TypeScript**: `npx tsc --noEmit --project client/tsconfig.json` → verify types
4. **Build**: `yarn web:build` → verify production bundle compiles

If any step fails after max iterations → stop, report error with file:line references

## Phase 5: Review

Check all requirements from Phase 1 are met:
1. Review EACH AC from task spec against implementation
2. For each AC: verify it's addressed (code + tests)
3. If AC missed → add tests, implement, repeat Phase 3-4
4. If Storybook mode ON → verify all new components have stories matching project pattern AND include Mobile viewport variant. If missing → add stories, repeat Phase 3-4

If something missed:
- Add missing tests → go to Phase 3
- Add missing stories → go to Phase 3

Report AC verification:
- List each AC with status: ✅ Implemented | ❌ Not addressed | ⚠️ Partially
- If Storybook mode ON → List components with story status: ✅ Documented (Desktop + Mobile) | ⚠️ Missing Mobile | ❌ Missing story

## Phase 5.5: Technical Debt Report

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

## Phase 6: Stage

Stage all modified files with `git add`. User will commit manually.

## Output

If success: `Status: Done`

If errors/warnings during process: `Status: Done` + link to error file at `.claude/tasks/{task-id}-errors.md`

Error file format: list of issues with file:line references.

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

### Component Creation Rules

When creating NEW components (not modifying existing):
1. **Extract to separate file first** — Never define components inline in parent files. Create dedicated component file in appropriate directory before using.
2. **Create directory structure**: `src/components/[componentName]/[ComponentName].tsx` and `src/components/[componentName]/[componentName].scss`
3. **Create Storybook story first** (if Storybook mode ON) — Component must have story file in `src/stories/` before being used in implementation
4. **Story must include Desktop and Mobile variants** — Use viewport parameters for responsive testing

### Styling Rules

**NEVER use inline styles.** All styling MUST be in SCSS files.

Forbidden:
```typescript
<div style={{ display: 'flex', padding: '24px' }}>  // WRONG
```

Required:
```typescript
<div className="my-component">  // CORRECT
```
```scss
.my-component {
  display: flex;
  padding: var(--spacing-lg);
}
```

If component needs styling → create `.scss` file next to component file, import it, use className.

## Rules

- Never skip tests
- Never implement before tests fail
- Minimal code only — no over-engineering
- Ask if unclear, never guess
