---
description: Design System Advisor - analyzes code and Figma data, researches best practices, recommends optimal approaches for UI improvements. Guides users to better design system outcomes.
allowed-tools: Read, Write, Edit, Glob, Grep, WebFetch, WebSearch, AskUserQuestion, Task
model: sonnet
argument-hint: "[goal description | audit | sync | story <component>]"
---

# Design System Advisor

An intelligent design system advisor that helps you improve your UI architecture. Instead of just executing tasks, this command:

1. **Understands** your current code and Figma tokens
2. **Researches** best practices and modern approaches
3. **Recommends** the optimal path to achieve your goal
4. **Guides** implementation with context-aware advice

## Command Modes

| Argument | Mode |
|----------|------|
| Goal description | **Advisory mode** - Analyze goal, research, recommend approach |
| `audit` | Full design system audit with recommendations |
| `sync` | Token sync (after advisory confirmation) |
| `sync --full` or Figma JSON files | **Full sync** - Tokens + stories for all Figma components |
| `story <component>` | Generate Storybook story for component |
| No argument | Interactive advisory session |

## Architecture

```
/dev:uikit (Design System Advisor)
    │
    ├── Phase 1: Context Gathering
    │   - Understand user's goal
    │   - Analyze codebase patterns
    │   - Read Figma tokens (if available)
    │
    ├── Phase 2: Research & Analysis
    │   - WebSearch for best practices
    │   - Compare approaches
    │   - Identify potential pitfalls
    │
    ├── Phase 3: Advisory Report
    │   - Present findings
    │   - Recommend optimal approach
    │   - Explain trade-offs
    │   - Ask user for direction
    │
    └── Phase 4: Guided Implementation
        - Prepare context for dev-web
        - Delegate with clear instructions
        - Verify results
```

---

## Advisory Workflow (Default)

### Step 1: Understand the Goal

Parse user input to understand what they want to achieve:

| Input Pattern | Interpreted Goal |
|---------------|------------------|
| "improve buttons" | Component refinement |
| "add dark mode" | Theme system expansion |
| "make colors consistent" | Token consolidation |
| "modernize typography" | Typography system update |
| "add new component X" | Component creation |
| Free-form description | Extract intent via analysis |

If unclear, use AskUserQuestion:
- "What specific outcome are you hoping to achieve?"
- "What problem are you trying to solve?"

### Input Pattern Detection

| Pattern | Interpreted Mode |
|---------|------------------|
| Single Figma file (TOKENS or SCREENS) | Token sync or component analysis |
| **Both FIGMA_TOKENS.json and FIGMA_SCREENS.json** | **Full sync mode** |
| File path to component | Story generation for that component |
| General goal description | Advisory mode |

**When both Figma files provided:**
Automatically enter Full Sync mode — user expects complete design system integration.

### Step 2: Gather Context

**Codebase Analysis:**
1. Search for existing design system files:
   - `**/*variables*.scss`, `**/*tokens*.{ts,scss,css}`
   - `**/theme/*.{ts,scss}`, `**/styles/*.{ts,scss}`
2. Find UI components: `**/ui/**/*.tsx`, `**/components/**/*.tsx`
3. Extract patterns: naming, structure, imports
4. Identify current approach: CSS-in-JS, SCSS, CSS modules, Tailwind, etc.

**Figma Data (if available):**
1. Read `.claude/docs/FIGMA_TOKENS.json` if exists
2. Check `.claude/docs/FIGMA_SCREENS.json` for UI references
3. Compare Figma tokens vs codebase tokens

**Gap Analysis:**
| Aspect | Current State | Figma State | Gap |
|--------|---------------|-------------|-----|
| Colors | List current | List Figma | Differences |
| Typography | ... | ... | ... |
| Spacing | ... | ... | ... |

### Step 3: Research Best Practices

Use WebSearch to find modern approaches for the user's goal:

**Search Queries by Goal Type:**
| Goal | Search Query |
|------|--------------|
| Token management | "design tokens best practices 2025 CSS variables" |
| Component patterns | "React {component} patterns accessibility 2025" |
| Theme system | "design system theming dark mode CSS custom properties" |
| Typography | "responsive typography system best practices" |
| Spacing | "spacing scale design system 8pt grid" |

**Evaluate findings against:**
- Current project technology stack
- Existing patterns in codebase
- Team's apparent preferences (inferred from code)
- Modern industry standards

### Step 4: Generate Advisory Report

Present findings in structured format:

```markdown
## Design System Advisory Report

### Your Goal
{summarized user intent}

### Gap Analysis
| Area | Current | Ideal | Priority |
|------|---------|-------|----------|
| ... | ... | ... | High/Med/Low |

### Recommended Approaches

#### Option A: {approach name}
**Best for:** {use case}
**Pros:** {benefits}
**Cons:** {drawbacks}
**Effort:** {low/medium/high}

#### Option B: {approach name}
...

### My Recommendation
**{Option X}** because:
- {reason based on codebase analysis}
- {reason based on research}
- {reason based on Figma alignment}

### Potential Pitfalls
- {risk 1 and mitigation}
- {risk 2 and mitigation}

### Next Steps
1. {step}
2. {step}
```

### Step 5: Get User Direction

Use AskUserQuestion:
- "Which approach would you like to take?"
- "Do you want me to proceed with the recommended approach?"
- "Would you like more details on any option?"

### Step 6: Guided Implementation

Once user confirms direction, delegate to dev-web with rich context:

```
Task tool with subagent_type="dev-web":

Implement design system improvement based on advisory context.

Goal: {user's original goal}
Chosen Approach: {selected option}

Context Files:
- .claude/tasks/{task-id}/advisory-report.md
- .claude/tasks/{task-id}/context.json

Key Requirements:
1. {specific requirement from recommendation}
2. {pattern to follow}
3. {pitfall to avoid}

Research References:
- {key finding from web research}
- {best practice to apply}
```

---

## Mode: Audit

Full design system health check with recommendations.

### Audit Checklist

| Area | Checks |
|------|--------|
| **Tokens** | Consistency, naming, Figma alignment, unused tokens |
| **Colors** | Contrast ratios, semantic naming, theme support |
| **Typography** | Scale consistency, responsive behavior, font loading |
| **Spacing** | Scale adherence, consistent application |
| **Components** | Prop consistency, accessibility, documentation |
| **Patterns** | Code duplication, abstraction opportunities |

### Audit Output

```markdown
## Design System Audit Report

### Overall Health Score: X/100

### Findings by Priority

#### Critical (Fix Now)
- {issue}: {impact} → {recommendation}

#### High (Fix Soon)
- ...

#### Medium (Plan to Address)
- ...

#### Low (Nice to Have)
- ...

### Quick Wins
{Easy improvements with high impact}

### Strategic Recommendations
{Longer-term improvements}
```

---

## Mode: Story Generation

Generate Storybook stories with advisory preamble.

### Pre-Generation Advisory

Before generating, briefly analyze:
1. Does this component follow existing patterns?
2. Are there accessibility concerns to address?
3. WebSearch for "{component type} storybook best practices"

### Story Generation Process

#### Phase 1: Discover Project Structure

1. Glob `.storybook/main.{ts,js}` for Storybook config
2. Find components root:
   - `src/components/`
   - `src/ui/`
   - `components/`
   - `app/components/`
3. Glob `**/*.stories.tsx` for existing story patterns
4. Glob `.storybook/decorators/*.tsx` for decorators
5. Read `tsconfig.json` for path aliases

If multiple patterns or none found → ask user.

#### Phase 2: Locate Component

| Input | Action |
|-------|--------|
| Path provided | Verify file exists |
| Name provided | Search in components root |
| Multiple matches | Ask user to select |
| Not found | Report error, stop |

#### Phase 3: Analyze Component

Read component file and extract:

| Data | Pattern |
|------|---------|
| Props type | `type PropsT`, `type Props`, `interface Props` |
| Enum props | Imports ending with `KindE`, `TypeE`, `SizeE`, `VariantE` |
| Default values | Destructuring defaults `{ prop = value }` |
| Form integration | `useController`, `useFormContext`, `useForm` imports |
| Children type | `children: ReactNode`, `children: string` |

Read related files:
- Enum files in same directory
- Style files for variant class names

#### Phase 4: Determine Requirements

| Component Type | Decorator Needed |
|----------------|------------------|
| Uses `useController` | Form context decorator |
| Uses `useFormContext` | Form context decorator |
| Uses `useParams`, `useNavigate` | Router decorator note |
| Uses context hooks | Manual setup note |

#### Phase 5: Derive Category

| Path Pattern | Category |
|--------------|----------|
| `*/form/*` or `*/forms/*` | Form/{ComponentName} |
| `*/modal/*` or `*/dialog/*` | Overlays/{ComponentName} |
| `*/sidebar/*` or `*/drawer/*` | Overlays/{ComponentName} |
| `*/layout/*` | Layout/{ComponentName} |
| `*/icon/*` or `*/icons/*` | Icons/{ComponentName} |
| `*/ui/*` | UI/{ComponentName} |
| Other | Components/{ComponentName} |

#### Phase 6: Delegate to Developer

Spawn `dev-web` agent with Task tool:

```
Generate Storybook story based on prepared context.

Read: .claude/tasks/{task-id}/context.json

Requirements:
1. Create CSF3-compliant story at {story.output_path}
2. Category: {story.category}
3. Generate stories for variants: {story.variants_to_generate}
4. Use decorators: {story.decorators}
5. Match patterns from: {project_patterns.existing_stories_example}

CSF3 structure:
- Meta with title, component, parameters, tags: ['autodocs']
- argTypes for each prop with appropriate controls
- Story for each variant/enum value

Output to: .claude/tasks/{task-id}/developer-output.md
```

---

## Mode: Sync

Token synchronization with advisory confirmation.

### Pre-Sync Advisory

Before syncing:
1. Show what will change
2. Research best practices for token format
3. Recommend approach
4. Proceed only after user confirmation

### Token Extraction

**If Figma file key provided:**

1. Ask for Figma Personal Access Token (header: `X-Figma-Token`)
2. WebFetch `https://api.figma.com/v1/files/{key}`
3. WebFetch `https://api.figma.com/v1/files/{key}/styles`
4. Parse tokens:

| Token Type | Source |
|------------|--------|
| Colors | `fills`, `strokes` where type is `SOLID` |
| Typography | `fontFamily`, `fontSize`, `fontWeight`, `lineHeight` |
| Spacing | `itemSpacing`, `padding*` properties |
| Radii | `cornerRadius` |
| Shadows | `effects` where type is `DROP_SHADOW` |

5. Save to `.claude/docs/FIGMA_TOKENS.json`

> **Note:** The Figma Variables REST API requires an Enterprise plan. For non-Enterprise users, ask if they can export tokens via Tokens Studio plugin or provide a JSON export manually.

**If using cached data:** Read existing `.claude/docs/FIGMA_TOKENS.json`

### Inconsistency Detection

| Pattern | Threshold | Action |
|---------|-----------|--------|
| Clear majority | >80% uses value A | AUTO-FIX to A |
| Strong preference | 65-80% uses A | AUTO-FIX, note in report |
| Ambiguous | 40-65% split | ASK user |
| Outlier | <20% uses value B | AUTO-FIX to majority |
| Novel value | Not in system | ASK: add or map? |

Detection rules:
- **Color drift**: similar colors (RGB channels differ by ≤5 each) → consolidate
- **Spacing anomalies**: outliers (15px among 16px) → normalize
- **Typography drift**: same context, different weights → consolidate
- **Radius inconsistencies**: similar components, different radii → normalize

### Delegate to Developer

Spawn `dev-web` agent with Task tool:

```
Implement UI kit token sync based on prepared context.

Read: .claude/tasks/{task-id}/context.json

Requirements:
1. Update token file at {existing_tokens_file}
2. Apply naming pattern: {patterns.naming}
3. Generate React components for new design tokens
4. Follow existing project patterns

Output to: .claude/tasks/{task-id}/developer-output.md
```

---

## Mode: Full Sync

Triggered when user provides Figma JSON files (both TOKENS and SCREENS) or uses `sync --full`.

**IMPORTANT:** In Full Sync mode, delegate analysis and implementation to dev-web agent immediately.
Do NOT manually read component files, analyze tokens, or generate stories yourself.

The workflow is:
1. Brief context gathering (what files exist)
2. Spawn dev-web agent with full context (Figma files paths, component patterns)
3. Report results from dev-web

Do NOT:
- Manually read each component file
- Build detailed token comparison tables
- Generate story files yourself

### Workflow

#### 1. Token Sync
Execute regular token sync as in "Mode: Sync" section.

#### 2. Component Inventory

After tokens are synced:

1. Read FIGMA_SCREENS.json for component list (from `pages[].components`)
2. Glob `**/components/**/*.tsx` and `**/ui/**/*.tsx` to find code components
3. Match Figma components to code:
   - `Button_Primary_M` → `AuButton`
   - `Input` → `AuField`
   - `Select` → `AuSelect`
4. Glob `**/*.stories.tsx` to find existing stories
5. Identify gaps (components without stories)

#### 3. Story Generation Plan

Present to user **only gaps** (missing code or missing stories):

```markdown
## Missing Components

Show only Figma components with gaps. Do NOT list matched/aligned items.

| Figma Component | Issue | Action |
|-----------------|-------|--------|
| Switch | No code match | Create component |
| Tags | No code match | Create component |
...

**Summary:** {N} gaps found

Proceed with story generation?
```

Use `AskUserQuestion` to confirm.

#### 4. Batch Story Generation

For each matched component without story:

1. Read component file to extract props, enums, variants
2. Delegate to dev-web with component context:

```
Task tool with subagent_type="dev-web":

Generate Storybook story for {ComponentName}.

Component path: {path}
Props: {extracted props}
Variants: {from Figma SCREENS or enum files}

Requirements:
1. Create CSF3-compliant story
2. Use new design tokens (var(--color-*), var(--space-*), etc.)
3. Include stories for all variants
4. Match existing story patterns in project
```

#### 5. Summary

```markdown
## Full Sync Complete

### Tokens
- Colors: {count} synced
- Typography: {count} synced
- Spacing: {count} synced
- Radii: {count} synced
- Shadows: {count} synced

### Stories Created
- Form/AuButton ({N} variants)
- Form/AuField ({N} variants)
- Form/AuSelect ({N} variants)
- Form/AuCheckbox ({N} variants)
...

### Storybook Status
- Total stories: {count}
- Run `yarn storybook` to preview

### Gaps Remaining
- Components in Figma but not in code: [list]
- Consider creating these components next
```

---

## Research Guidelines

### When to Research

| Situation | Research Scope |
|-----------|----------------|
| New component type | Accessibility, patterns, examples |
| Token structure change | W3C DTCG format, tool compatibility |
| Theme system | Modern theming approaches, CSS custom properties |
| Any user question | Relevant best practices |

### Search Strategy

1. Start specific: "React {component} accessibility best practices 2025"
2. Broaden if needed: "design system {topic} best practices"
3. Cross-reference multiple sources
4. Prefer recent content (2024-2025)

### Source Evaluation

- Official docs (MDN, React, W3C) = high trust
- Design system blogs (Figma, Adobe, Shopify) = high trust
- Stack Overflow = verify independently
- Random blogs = use with caution

---

## Output

After developer agent completes, summarize:

```markdown
Status: Done

## Design System Task Complete

### Mode: [Advisory / Audit / Sync / Story Generation]

### Analysis Summary
- [Key findings from analysis phase]

### Recommendations Applied
- [What approach was chosen]
- [Why this approach was best]

### Developer Output
- Files created: [list]
- Files modified: [list]

### Quality Checks
- [Results from developer agent]

### Notes
- [Any manual review items]

### Sources Referenced
- [Links to research sources used]
```

---

## Rules

**DO:**
- Always understand the goal before suggesting solutions
- Research before recommending
- Present multiple options with trade-offs
- **ALWAYS use AskUserQuestion tool** for any confirmation — never ask questions as plain text
- Match existing project patterns
- Cite sources when sharing research

**DON'T:**
- Jump to implementation without advisory phase
- Recommend patterns incompatible with existing code
- Skip research for non-trivial changes
- Assume user knows best approach
- Give advice without context analysis
- Output verbose analysis for aligned/working items (only report gaps)
- List all components when user only needs to see missing ones
- Ask confirmation as plain text (e.g., "Would you like to proceed?") — ALWAYS use AskUserQuestion tool
- Show token sync tables when tokens are already in sync — just say "Tokens: ✅ in sync"
- Output more than 10 lines for summary

---

## Error Handling

| Error | Action |
|-------|--------|
| Unclear goal | Ask clarifying questions |
| No Figma data | Analyze code only, note limitation |
| Conflicting patterns | Research best practice, recommend one |
| Research inconclusive | Present findings, ask user preference |
| 403 Figma | Ask for valid token |
| 404 Figma | Verify file key with user |
| No Storybook config | Report, suggest setup |
| Component not found | Report and stop |
| dev-web agent fails | Report failure reason |

---

## Scope & Project Integration

This is a **global** command. If a project has its own `/ds:*` commands (e.g., `/ds:tokens`, `/ds:story`), consider:

| Scenario | Action |
|----------|--------|
| Project has `/ds:*` commands | Prefer project commands; they have project-specific context |
| No project commands exist | Use this global command |
| Conflict between global/project | Ask user which to use |

To check for project commands: `Glob(".claude/commands/ds:*.md")`

---

## Token Format Support

| Format | Support |
|--------|---------|
| SCSS variables | Primary (most projects) |
| CSS custom properties | Supported |
| TypeScript constants | Supported |
| W3C DTCG (`.tokens.json`) | Supported - industry standard for tool interoperability |

When W3C DTCG format detected or requested, structure tokens per the [Design Tokens Format Module](https://tr.designtokens.org/format/) specification.
