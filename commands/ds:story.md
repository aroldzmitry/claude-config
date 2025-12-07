---
description: Generate Storybook stories for a component. Use when adding new components or creating visual documentation.
allowed-tools: Read, Write, Glob, Grep, AskUserQuestion
model: sonnet
argument-hint: <component-name-or-path>
---

# Story Generator

Generate CSF3-compliant Storybook stories for React components.

## Input

| Argument | Action |
|----------|--------|
| Component name | Search common component paths |
| File path | Use directly |
| No argument | Ask user for component |

## Workflow

### Phase 1: Discover Project Structure

1. **Find Storybook config** — Glob `.storybook/main.{ts,js}`
2. **Find components root** — Check common patterns:
   - `src/components/`
   - `src/ui/`
   - `components/`
   - `app/components/`
3. **Find existing stories** — Glob `**/*.stories.tsx` to learn patterns
4. **Find decorators** — Glob `.storybook/decorators/*.tsx`
5. **Find path aliases** — Read `tsconfig.json` paths section

If multiple patterns found or none match, ask user.

### Phase 2: Locate Component

1. **If path provided** — verify file exists
2. **If name provided** — search in discovered components root
3. **Multiple matches** — ask user to select
4. **Not found** — report error, stop

### Phase 3: Analyze Component

Read component file and extract:

| Data | How to Find |
|------|-------------|
| Props type | `type PropsT`, `type Props`, `interface Props` |
| Enum props | Imports ending with `KindE`, `TypeE`, `SizeE`, `VariantE` |
| Default values | Destructuring defaults `{ prop = value }` |
| Form integration | `useController`, `useFormContext`, `useForm` imports |
| Children type | `children: ReactNode`, `children: string` |

**Read related files:**
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

Infer category from component path:

| Path Pattern | Category |
|--------------|----------|
| `*/form/*` or `*/forms/*` | Form/{ComponentName} |
| `*/modal/*` or `*/dialog/*` | Overlays/{ComponentName} |
| `*/sidebar/*` or `*/drawer/*` | Overlays/{ComponentName} |
| `*/layout/*` or `*/layouts/*` | Layout/{ComponentName} |
| `*/icon/*` or `*/icons/*` or `*/svg/*` | Icons/{ComponentName} |
| `*/ui/*` | UI/{ComponentName} |
| Other | Components/{ComponentName} |

### Phase 6: Generate Story

Create file: `{component-dir}/{ComponentName}.stories.tsx`

**CSF3 structure:**

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';

// Use discovered path alias or relative import
import ComponentName from '{alias}/path/ComponentName';
import { ComponentNameKindE } from '{alias}/path/ComponentNameKindE';
// Decorator if needed (calculate relative path from story location)
import { FormDecorator } from '{relative-path-to-decorators}/FormDecorator';

const meta = {
  title: '{Category}/{ComponentName}',
  component: ComponentName,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    // Controls for each prop
  },
  args: {
    // Default values
  },
  // decorators: [FormDecorator],
} satisfies Meta<typeof ComponentName>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

// Variant for each enum value
export const VariantName: Story = {
  args: { kind: ComponentNameKindE.VARIANT },
};
```

## ArgTypes Configuration

| Prop Type | Configuration |
|-----------|---------------|
| Enum | `control: 'select', options: Object.values(EnumName)` |
| Boolean | `control: 'boolean'` |
| String | `control: 'text'` |
| Number | `control: 'number'` |
| Function | `action: 'eventName'` |
| ReactNode | `control: 'text'` |

## Story Variants

Generate based on discovered props:

**If has `kind`/`variant`/`type` enum:**
- One story per enum value

**If has `size` enum:**
- One story per size value

**If has `disabled` prop:**
- `Disabled` story

**If has `loading` prop:**
- `Loading` story

**If has `error` prop or uses form validation:**
- `WithError` story

## Output

Report:
- File path created
- Stories generated (list)
- Decorators used
- Manual review notes (if context dependencies found)

## Rules

- DO: Match existing story patterns in project
- DO: Use project's path aliases for imports
- DO: Generate story for each enum value
- DO: Include `tags: ['autodocs']`
- DO: Use `action()` for function props
- DON'T: Generate stories for internal/private components
- DON'T: Skip form decorator for react-hook-form components
- DON'T: Hardcode values that should come from props
- DON'T: Assume project structure — discover it

## Error Handling

| Error | Action |
|-------|--------|
| No Storybook config | Report error, suggest setup |
| Component not found | Report and stop |
| No props type found | Generate minimal story, warn user |
| Complex context needs | Generate story, add manual setup notes |
| Ambiguous structure | Ask user to clarify |
