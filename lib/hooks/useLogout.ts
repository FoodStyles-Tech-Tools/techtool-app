/**
 * Custom hook for handling logout functionality
 */

import { useEffect } from "react";
import { signOut } from "next-auth/react";

/**
 * Hook to set up logout button handler
 */
export function useLogout() {
  useEffect(() => {
    const logoutButton = document.querySelector(
      ".logout-button"
    ) as HTMLButtonElement | null;
    const overlay = document.getElementById("logout-overlay");

    const handleLogout = async () => {
      if (overlay) {
        overlay.setAttribute("style", "display: flex;");
      }
      await signOut({ callbackUrl: "/" });
    };

    logoutButton?.addEventListener("click", handleLogout);

    return () => {
      logoutButton?.removeEventListener("click", handleLogout);
    };
  }, []);
}

