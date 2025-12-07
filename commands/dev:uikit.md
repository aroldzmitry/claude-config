---
description: Sync design tokens from Figma and generate UI components/stories. Analyzes codebase patterns, collects context, then delegates code writing to dev-web agent.
allowed-tools: Read, Write, Edit, Glob, Grep, WebFetch, AskUserQuestion, Task
model: sonnet
argument-hint: [figma-file-key | "auto" | "story <component>"]
---

# UI Kit Command

Orchestrates UI development tasks: Figma token sync, component generation, and Storybook stories. This command analyzes and prepares context, then delegates actual code writing to `dev-web` agent.

## Command Modes

| Argument | Mode |
|----------|------|
| Figma file key | Sync tokens from Figma API |
| `auto` | Use cached `.claude/docs/FIGMA_TOKENS.json` |
| `story <component>` | Generate Storybook story for component |
| No argument | Prompt user to choose mode |

## Architecture

```
/dev:uikit (this command)
    │
    ├── Phase 1: Discovery & Analysis (this command)
    │   - Discover project structure
    │   - Extract Figma tokens OR analyze component
    │   - Detect inconsistencies
    │   - Resolve ambiguities with user
    │
    └── Phase 2: Implementation (dev-web agent)
        - Write tokens/components/stories
        - Follow project patterns
        - Run quality checks
```

---

## Mode: Token Sync

### Phase 1: Extract from Figma

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

**If `auto`:** Read existing `.claude/docs/FIGMA_TOKENS.json`

### Phase 2: Analyze Codebase

1. Glob `**/*variables*.scss` or `**/*tokens*.ts` for existing tokens
2. Glob `**/ui/**/*.tsx` or `**/components/**/*.tsx` for UI components
3. Extract patterns: naming conventions, file structure, imports
4. Build inventory of current design tokens

### Phase 3: Detect Inconsistencies

| Pattern | Threshold | Action |
|---------|-----------|--------|
| Clear majority | >80% uses value A | AUTO-FIX to A |
| Strong preference | 65-80% uses A | AUTO-FIX, note in report |
| Ambiguous | 40-65% split | ASK user |
| Outlier | <20% uses value B | AUTO-FIX to majority |
| Novel value | Not in system | ASK: add or map? |

Detection rules:
- **Color drift**: similar colors (ΔE < 5) → consolidate
- **Spacing anomalies**: outliers (15px among 16px) → normalize
- **Typography drift**: same context, different weights → consolidate
- **Radius inconsistencies**: similar components, different radii → normalize

### Phase 4: Resolve Ambiguities

Use AskUserQuestion for items with 40-65% split.

### Phase 5: Prepare Context for Developer

Create task context file with:

```json
{
  "task_type": "uikit_sync",
  "figma_tokens": { /* extracted tokens */ },
  "existing_tokens_file": "path/to/tokens.scss",
  "inconsistencies": [
    { "type": "color", "current": "#fff", "figma": "#fafafa", "action": "update" }
  ],
  "user_decisions": { /* resolved ambiguities */ },
  "patterns": {
    "naming": "--{category}-{name}[-{variant}]",
    "file_structure": "description of existing structure"
  }
}
```

### Phase 6: Delegate to Developer

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

## Mode: Story Generation

### Phase 1: Discover Project Structure

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

### Phase 2: Locate Component

| Input | Action |
|-------|--------|
| Path provided | Verify file exists |
| Name provided | Search in components root |
| Multiple matches | Ask user to select |
| Not found | Report error, stop |

### Phase 3: Analyze Component

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

### Phase 4: Determine Requirements

| Component Type | Decorator Needed |
|----------------|------------------|
| Uses `useController` | Form context decorator |
| Uses `useFormContext` | Form context decorator |
| Uses `useParams`, `useNavigate` | Router decorator note |
| Uses context hooks | Manual setup note |

### Phase 5: Derive Category

| Path Pattern | Category |
|--------------|----------|
| `*/form/*` or `*/forms/*` | Form/{ComponentName} |
| `*/modal/*` or `*/dialog/*` | Overlays/{ComponentName} |
| `*/sidebar/*` or `*/drawer/*` | Overlays/{ComponentName} |
| `*/layout/*` | Layout/{ComponentName} |
| `*/icon/*` or `*/icons/*` | Icons/{ComponentName} |
| `*/ui/*` | UI/{ComponentName} |
| Other | Components/{ComponentName} |

### Phase 6: Prepare Context for Developer

Create task context file:

```json
{
  "task_type": "storybook_story",
  "component": {
    "name": "ComponentName",
    "path": "path/to/Component.tsx",
    "props_type": "PropsT",
    "props": [
      { "name": "kind", "type": "enum", "enum_name": "ComponentKindE", "values": ["PRIMARY", "SECONDARY"] },
      { "name": "disabled", "type": "boolean", "default": false },
      { "name": "onClick", "type": "function" }
    ]
  },
  "story": {
    "output_path": "path/to/Component.stories.tsx",
    "category": "UI/ComponentName",
    "decorators": ["FormDecorator"],
    "variants_to_generate": ["Default", "Primary", "Secondary", "Disabled"]
  },
  "project_patterns": {
    "path_alias": "@components",
    "existing_stories_example": "path/to/existing.stories.tsx",
    "decorator_path": ".storybook/decorators"
  }
}
```

### Phase 7: Delegate to Developer

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

## Output

After developer agent completes, summarize:

```markdown
## UI Kit Task Complete

### Mode: [Token Sync / Story Generation]

### Analysis Summary
- [Key findings from analysis phase]

### Developer Output
- Files created: [list]
- Files modified: [list]

### Quality Checks
- [Results from developer agent]

### Notes
- [Any manual review items]
```

---

## Rules

**DO:**
- Analyze thoroughly before delegating
- Ask user for ambiguous cases
- Pass complete context to developer
- Match existing project patterns

**DON'T:**
- Write code directly (delegate to dev-web)
- Skip user confirmation for ambiguous cases
- Assume project structure without discovery
- Store Figma tokens in code files

---

## Error Handling

| Error | Action |
|-------|--------|
| 403 Figma | Ask for valid token |
| 404 Figma | Verify file key with user |
| No Storybook config | Report, suggest setup |
| Component not found | Report and stop |
| Pattern conflict | Ask user which to follow |
| dev-web agent fails | Report failure reason |
