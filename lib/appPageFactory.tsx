import Head from "next/head";
import Script from "next/script";
import type { AppPageProps } from "./appPageTypes";
import { FAVICON_URL } from "./appPageTypes";
import { generateSupabaseInitScript } from "./scripts/supabase-init";
import { generateAppInitScript } from "./scripts/app-init";
import { generateVersionRefreshScript } from "./scripts/version-refresh";
import { useMode } from "./hooks/useMode";
import { useLogout } from "./hooks/useLogout";
import { useServiceWorker } from "./hooks/useServiceWorker";

export function BaseAppPage({
  appHtml,
  mode,
  name,
  supabaseUrl,
  supabaseAnonKey,
  faviconUrl,
}: AppPageProps) {
  // Handle mode changes with API sync
  const handleModeChange = async (newMode: string) => {
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
  };

  // Use custom hooks for cleaner code organization
  useMode({ mode, name, onModeChange: handleModeChange });
  useLogout();
  useServiceWorker();

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
      <Script
        id="supabase-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: generateSupabaseInitScript(supabaseUrl, supabaseAnonKey),
        }}
      />
      <div
        id="webapp-root"
        dangerouslySetInnerHTML={{ __html: appHtml }}
      />
      <Script
        id="app-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: generateAppInitScript() }}
      />
      <Script
        id="version-refresh-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: generateVersionRefreshScript() }}
      />
      <Script src="/js/app.js" strategy="afterInteractive" />
    </>
  );
}

export default BaseAppPage;
