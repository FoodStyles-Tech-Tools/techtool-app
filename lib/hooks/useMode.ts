/**
 * Custom hook for managing theme mode (light/dark)
 */

import { useEffect, useRef, useLayoutEffect } from "react";

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export interface UseModeOptions {
  mode: string;
  name?: string;
  onModeChange?: (mode: string) => Promise<void>;
}

/**
 * Hook to manage theme mode synchronization with DOM and API
 */
export function useMode({ mode, name, onModeChange }: UseModeOptions) {
  const modeRef = useRef(mode);

  useIsomorphicLayoutEffect(() => {
    modeRef.current = mode;
    const currentMode = modeRef.current;
    const isDark = currentMode === "dark";

    // Update body class
    document.body.classList.remove("dark");
    if (isDark) {
      document.body.classList.add("dark");
    }

    // Update mode toggle checkbox
    const modeToggle = document.getElementById("mode-toggle") as
      | HTMLInputElement
      | null;
    if (modeToggle) {
      modeToggle.checked = isDark;
    }

    // Update hidden input
    const hiddenModeInput = document.getElementById(
      "initial-mode"
    ) as HTMLInputElement | null;
    if (hiddenModeInput) {
      hiddenModeInput.value = currentMode;
    }

    // Update user avatar
    const userAvatar = document.getElementById("user-avatar");
    if (userAvatar && name) {
      userAvatar.textContent = name.charAt(0).toUpperCase();
    }

    // Handle mode change event
    const handleModeChange = async (event: Event) => {
      const target = event.target as HTMLInputElement;
      const newMode = target.checked ? "dark" : "light";
      
      // Update UI immediately
      document.body.classList.remove("dark");
      if (newMode === "dark") {
        document.body.classList.add("dark");
      }
      if (hiddenModeInput) {
        hiddenModeInput.value = newMode;
      }

      // Update API if handler provided
      if (onModeChange) {
        try {
          await onModeChange(newMode);
          modeRef.current = newMode;
        } catch (error) {
          console.error("Failed to update mode", error);
          // Revert to previous mode on error
          const fallbackMode = modeRef.current;
          if (hiddenModeInput) {
            hiddenModeInput.value = fallbackMode;
          }
          if (modeToggle) {
            modeToggle.checked = fallbackMode === "dark";
          }
          document.body.classList.remove("dark");
          if (fallbackMode === "dark") {
            document.body.classList.add("dark");
          }
          // Show toast if available
          if (typeof window !== "undefined") {
            const toast = (window as any).showToast;
            if (typeof toast === "function") {
              toast("Failed to update theme", "error");
            }
          }
        }
      } else {
        modeRef.current = newMode;
      }
    };

    modeToggle?.addEventListener("change", handleModeChange);

    return () => {
      modeToggle?.removeEventListener("change", handleModeChange);
    };
  }, [mode, name, onModeChange]);
}

