/**
 * Custom hook for managing service worker registration
 */

import { useEffect } from "react";

/**
 * Hook to register/unregister service workers based on environment
 */
export function useServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" && "serviceWorker" in navigator) {
      // Unregister service workers in development
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => {
          registrations.forEach((registration) => registration.unregister());
        })
        .catch((error) =>
          console.warn("Failed to unregister service workers in dev:", error)
        );
      return;
    }

    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      const registerServiceWorker = () => {
        navigator.serviceWorker
          .register("/sw.js")
          .catch((error) =>
            console.error("Service worker registration failed:", error)
          );
      };

      if (document.readyState === "complete") {
        registerServiceWorker();
      } else {
        window.addEventListener("load", registerServiceWorker, { once: true });
      }
    }
  }, []);
}

