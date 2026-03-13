/**
 * Shared form control class names. Single source of truth for input/select
 * appearance and focus rings. Use these instead of duplicating long class strings.
 * Uses theme tokens (see globals.css) for light/dark support.
 */

export const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
const disabled = "disabled:cursor-not-allowed disabled:opacity-50"

/** Default input (h-9). Use for <Input /> and compact contexts. */
export const inputClassName = [
  "flex h-9 w-full rounded-md border border-input bg-form-bg px-3 text-sm text-foreground placeholder:text-muted-foreground",
  focusRing,
  disabled,
].join(" ")

/** Taller input (h-10). Use for standalone form pages. */
export const inputClassNameLg = [
  "h-10 w-full rounded-md border border-input bg-form-bg px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground",
  focusRing,
  disabled,
].join(" ")

/** Taller input (h-10) without w-full. Use for inline inputs (e.g. report filters). */
export const inputClassNameLgNoFull = [
  "h-10 rounded-md border border-input bg-form-bg px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground",
  focusRing,
  disabled,
].join(" ")

/** Native <select> (h-9). Use for <Select /> component. */
export const selectClassName = [
  "h-9 rounded-md border border-input bg-form-bg px-2 text-sm text-foreground outline-none",
  focusRing,
  disabled,
].join(" ")

/** Compact select-style input (h-8, px-3). Use for dropdowns in tables/sections. */
export const selectStyleInputSm = [
  "h-8 w-full rounded-md border border-input bg-form-bg px-3 text-sm text-foreground outline-none transition-colors",
  focusRing,
  disabled,
].join(" ")

/** Compact select-style input (h-8, px-2). Use for narrow dropdowns. */
export const selectStyleInputSmPx2 = [
  "h-8 w-full rounded-md border border-input bg-form-bg px-2 text-sm text-foreground outline-none transition-colors",
  focusRing,
  disabled,
].join(" ")

/** Textarea base. */
export const textareaClassName = [
  "flex min-h-[80px] w-full rounded-md border border-input bg-form-bg px-3 py-2 text-sm leading-5 placeholder:text-muted-foreground",
  focusRing,
  disabled,
].join(" ")
