# UI Conventions (Tailwind)

Short reference for consistent spacing, radius, and patterns across the app.

## Border radius

- **Cards, dialogs, modals, empty states:** `rounded-lg`
- **Form fields, inputs, selects, buttons, inline containers:** `rounded-md`
- **Pills, badges, avatars (circular):** `rounded-full` or `rounded-md` for small chips
- **Code blocks, small UI chips:** `rounded` (default) or `rounded-md`

## Spacing (padding)

- **Card content, dialog content:** `p-5` (CardHeader, CardContent, CardFooter, DialogContent)
- **Form sections, filter bar:** `p-4`
- **Empty state / data-state blocks:** `p-8` with `text-center`
- **Inline form groups, compact panels:** `px-3 py-2` or `p-4` depending on context
- **Page main content:** `px-4 py-4 sm:px-6` (app-shell main)

## Theme tokens

- Prefer theme tokens for colors so light/dark mode works: `bg-background`, `text-foreground`, `bg-muted`, `text-muted-foreground`, `bg-card`, `text-card-foreground`, `border-border`, `border-input`, `ring-ring`, `bg-primary`, `text-primary-foreground`, `bg-accent`, `text-accent-foreground`. Defined in `src/app/globals.css` (`:root` and `.dark`).

## Borders

- **Surfaces (cards, dropdowns, modals):** `border border-border`
- **Form controls:** `border border-input` (see `src/lib/form-styles.ts`)
- **Errors / destructive:** `border-red-200` or `border-red-500/60`

## Focus and interaction

- **Focus ring (all interactive elements):** use `focusRing` from `src/lib/form-styles.ts` or `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background`
- **Hover (neutral):** `hover:bg-accent` for list items, buttons; `hover:bg-muted/50` for subtle rows

## Form controls

- Use shared classes from `src/lib/form-styles.ts` (e.g. `inputClassName`, `inputClassNameLg`, `selectStyleInputSm`) instead of duplicating long class strings.
- Default input/select height: `h-9`; form pages may use `h-10` via `inputClassNameLg`.

## Shadows

- **Cards, filter bar:** `shadow-sm`
- **Dropdowns, overlays:** `shadow-lg`
- **Dialog content:** `shadow-xl`
