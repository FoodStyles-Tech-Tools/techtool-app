export function isEditableElement(target: EventTarget | null): boolean {
  const isElementEditable = (element: Element | null): boolean => {
    if (!element) return false
    if (element instanceof HTMLInputElement) {
      return !["checkbox", "radio", "button", "submit", "reset", "file", "range", "color"].includes(
        element.type
      )
    }
    if (element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) {
      return true
    }
    if (element instanceof HTMLElement) {
      if (element.isContentEditable) return true
      if (element.getAttribute("role") === "textbox") return true
    }
    return Boolean(
      element.closest(
        "input, textarea, select, [contenteditable='true'], [contenteditable='plaintext-only'], [role='textbox']"
      )
    )
  }

  const eventElement = target instanceof Element ? target : null
  if (isElementEditable(eventElement)) {
    return true
  }

  if (typeof document === "undefined") {
    return false
  }

  const activeElement = document.activeElement instanceof Element ? document.activeElement : null
  return isElementEditable(activeElement)
}

export function shouldIgnoreGlobalHotkey(event: KeyboardEvent): boolean {
  return event.defaultPrevented || event.isComposing || event.key === "Process" || event.keyCode === 229
}
