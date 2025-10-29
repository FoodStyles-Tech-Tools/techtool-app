import Head from "next/head";
import Script from "next/script";
import { useEffect, useRef, useLayoutEffect } from "react";
import { signOut } from "next-auth/react";
import type { AppPageProps } from "./appPageTypes";
import { FAVICON_URL } from "./appPageTypes";

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function BaseAppPage({
  appHtml,
  mode,
  name,
  supabaseUrl,
  supabaseAnonKey,
  faviconUrl,
}: AppPageProps) {
  const modeRef = useRef(mode);

  useIsomorphicLayoutEffect(() => {
    modeRef.current = mode;
    const currentMode = modeRef.current;
    const isDark = currentMode === "dark";

    document.body.classList.remove("dark");
    if (isDark) {
      document.body.classList.add("dark");
    }

    const modeToggle = document.getElementById("mode-toggle") as
      | HTMLInputElement
      | null;
    if (modeToggle) {
      modeToggle.checked = isDark;
    }

    const hiddenModeInput = document.getElementById(
      "initial-mode"
    ) as HTMLInputElement | null;
    if (hiddenModeInput) {
      hiddenModeInput.value = currentMode;
    }

    const userAvatar = document.getElementById("user-avatar");
    if (userAvatar && name) {
      userAvatar.textContent = name.charAt(0).toUpperCase();
    }

    const handleModeChange = async (event: Event) => {
      const target = event.target as HTMLInputElement;
      const newMode = target.checked ? "dark" : "light";
      document.body.classList.remove("dark");
      if (newMode === "dark") {
        document.body.classList.add("dark");
      }
      if (hiddenModeInput) {
        hiddenModeInput.value = newMode;
      }

      try {
        const response = await fetch("/api/user/mode", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ mode: newMode }),
        });

        if (!response.ok) {
          const text = await response.text();
          throw new Error(text || "Failed to update mode");
        }

        modeRef.current = newMode;
      } catch (error) {
        console.error("Failed to update mode", error);
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
        if (typeof window !== "undefined") {
          const toast = (window as any).showToast;
          if (typeof toast === "function") {
            toast("Failed to update theme", "error");
          }
        }
      }
    };

    modeToggle?.addEventListener("change", handleModeChange);

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

    if (process.env.NODE_ENV !== "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => {
          registrations.forEach((registration) => registration.unregister());
        })
        .catch((error) =>
          console.warn("Failed to unregister service workers in dev:", error)
        );
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

    return () => {
      modeToggle?.removeEventListener("change", handleModeChange);
      logoutButton?.removeEventListener("click", handleLogout);
    };
  }, [name, mode]);

  return (
    <>
      <Head>
        <title>TechTool App</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#4f46e5" />
        <meta
          name="description"
          content="TechTool keeps tickets, projects, and reconcile hours in a single fast workspace."
        />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="icon" href={faviconUrl} />
        <link rel="apple-touch-icon" href="/favicons/favicon.svg" />
      </Head>
      <Script
        src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"
        strategy="afterInteractive"
      />
      <Script src="https://cdn.jsdelivr.net/npm/chart.js" strategy="afterInteractive" />
      <Script id="supabase-init" strategy="afterInteractive">
        {`
          console.log("Setting up Supabase environment variables...");
          window.SUPABASE_URL = ${JSON.stringify(supabaseUrl)};
          window.SUPABASE_KEY = ${JSON.stringify(supabaseAnonKey)};
          console.log("Supabase URL set:", window.SUPABASE_URL);
          console.log("Supabase Key set:", window.SUPABASE_KEY ? "Present" : "Missing");
        `}
      </Script>
      <div
        id="webapp-root"
        dangerouslySetInnerHTML={{ __html: appHtml }}
      />
      <Script id="app-init" strategy="afterInteractive">
        {`
          // Initialize Supabase client and app after DOM is ready
          function initSupabaseAndApp() {
            if (typeof window.supabase !== 'undefined') {
              console.log("Creating Supabase client...");
              window.supabaseClient = window.supabase.createClient(
                window.SUPABASE_URL,
                window.SUPABASE_KEY
              );
              console.log("Supabase client created successfully!");
              
              // Initialize app after Supabase is ready
              if (typeof window.initializeApp === 'function') {
                window.initializeApp();
              } else {
                // Wait for app.js to load
                setTimeout(initSupabaseAndApp, 100);
              }
            } else {
              console.log("Supabase library not ready, retrying...");
              setTimeout(initSupabaseAndApp, 100);
            }
          }
          
          // Start initialization when DOM is ready
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initSupabaseAndApp);
          } else {
            initSupabaseAndApp();
          }
        `}
      </Script>
      <Script src="/js/app.js" strategy="afterInteractive" />
    </>
  );
}

export default BaseAppPage;
