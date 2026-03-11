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

## Borders

- **Surfaces (cards, dropdowns, modals):** `border border-slate-200`
- **Form controls:** `border border-slate-300` (see `src/lib/form-styles.ts`)
- **Errors / destructive:** `border-red-200` or `border-red-500/60`

## Focus and interaction

- **Focus ring (all interactive elements):** `focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2`
- **Hover (neutral):** `hover:bg-slate-100` for list items, buttons; `hover:bg-slate-50` for subtle rows

## Form controls

- Use shared classes from `src/lib/form-styles.ts` (e.g. `inputClassName`, `inputClassNameLg`, `selectStyleInputSm`) instead of duplicating long class strings.
- Default input/select height: `h-9`; form pages may use `h-10` via `inputClassNameLg`.

## Shadows

- **Cards, filter bar:** `shadow-sm`
- **Dropdowns, overlays:** `shadow-lg`
- **Dialog content:** `shadow-xl`
