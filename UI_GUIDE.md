## UI Style Guide

### Design philosophy

- **Plain internal tool**: prioritize clarity over aesthetics; the UI should feel like a simple CRUD dashboard.
- **Tailwind utilities directly**: build screens with basic Tailwind classes on semantic HTML elements.
- **No custom design system**: avoid new design tokens, theme variables, or complex component abstractions.

### Layout

- Root layout uses a light neutral background (`bg-slate-50`) with primary surfaces on white (`bg-white`).
- `AppShell` is a simple flex layout: sidebar on the left, main content on the right.
- Page content should normally be wrapped in:
  - `max-w-[1200px] mx-auto px-4 py-4 sm:px-6 lg:px-8`
  - Use `flex flex-col gap-4` inside pages for vertical spacing.

### Navigation

- Sidebar:
  - White background with a subtle right border (`bg-white border-r border-slate-200`).
  - Section labels use: `px-2 py-1 text-xs font-medium uppercase text-slate-500`.
  - Nav items:
    - Base: `flex h-9 items-center gap-2 rounded-md px-2 text-sm font-medium text-slate-600 transition-colors`.
    - Hover: `hover:bg-slate-100 hover:text-slate-900`.
    - Active: `bg-blue-50 text-blue-700`.

### Components

- **Buttons**
  - Use `Button` from `components/ui/button` as a thin wrapper over Tailwind.
  - Variants map directly to Tailwind defaults:
    - `primary`: `bg-blue-600 text-white hover:bg-blue-700`.
    - `secondary`: `bg-slate-100 text-slate-900 hover:bg-slate-200`.
    - `outline`: `border border-slate-300 bg-white hover:bg-slate-50`.
    - `ghost`: `hover:bg-slate-100 hover:text-slate-900`.
  - Sizes:
    - `sm`, `md` (default), `lg`, `icon`.

- **Inputs and textareas**
  - Use `Input` and `Textarea` from `components/ui/input` and `components/ui/textarea`.
  - Standard style: `border border-slate-300 bg-white text-sm placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-blue-500`.

- **Card**
  - Use `Card` from `components/ui/card` for grouping content.
  - Default style: `rounded-md border border-slate-200 bg-white`.
  - Avoid nesting multiple cards; prefer one main container per block.

- **Dialog**
  - Use `Dialog` primitives from `components/ui/dialog`.
  - Dialog surfaces:
    - `rounded-md border border-slate-200 bg-white shadow-sm`.
  - No animated entrances; simple appear/disappear is enough.

### Typography

- Use Tailwind defaults for sizes:
  - `text-xs`, `text-sm`, `text-base`, `text-lg` where needed.
- Avoid custom tracking (`tracking-[...]`) and odd font sizes (`text-[13px]`) in new code.
- Section titles:
  - `text-sm font-medium text-slate-900`.
  - Optional description: `text-xs text-slate-500`.

### Tables and data views

- Table containers:
  - `rounded-md border border-slate-200 bg-white`.
  - Sticky headers: `bg-slate-50 border-b border-slate-200`.
- Table rows:
  - Hover: `hover:bg-slate-50` where helpful, otherwise no hover.
  - Selected rows: `bg-blue-50` when needed.

### Colors

- Use only Tailwind’s default palette (e.g. `slate`, `gray`, `blue`, `red`, `green`).
- Backgrounds:
  - App background: `bg-slate-50`.
  - Surfaces: `bg-white`.
- Secondary text:
  - `text-slate-500` for muted text.
- Do not introduce new color tokens or custom CSS variables.

### Animations

- Keep animations minimal and functional only:
  - Simple `transition-colors` on hovers.
  - `animate-spin` for spinners if needed.
- Avoid decorative animations (custom keyframes, pulsing highlights, complex drag effects).

### When in doubt

- Prefer **fewer classes** and simple layouts.
- If something looks “designed” rather than “plain and clear”, simplify:
  - Remove extra shadows and borders.
  - Use standard spacing and typography from Tailwind.

