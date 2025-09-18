import Head from "next/head";
import Script from "next/script";
import type { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "./api/auth/[...nextauth]";
import path from "path";
import fs from "fs";
import { getUserByEmail } from "../lib/supabase";
import { useEffect, useRef } from "react";
import { signOut } from "next-auth/react";

const FAVICON_URL =
  process.env.FAVICON_URL ??
  "/favicons/favicon.svg?v=2";

type AppPageProps = {
  appHtml: string;
  mode: string;
  name: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  faviconUrl: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export default function AppPage({
  appHtml,
  mode,
  name,
  supabaseUrl,
  supabaseAnonKey,
  faviconUrl,
}: AppPageProps) {
  const modeRef = useRef(mode);

  useEffect(() => {
    modeRef.current = mode;
    const currentMode = modeRef.current;
    const isDark = currentMode === "dark";
    document.body.classList.toggle("dark", isDark);

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
      document.body.classList.toggle("dark", newMode === "dark");
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
        document.body.classList.toggle("dark", fallbackMode === "dark");
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

    return () => {
      modeToggle?.removeEventListener("change", handleModeChange);
      logoutButton?.removeEventListener("click", handleLogout);
    };
  }, [mode, name]);

  return (
    <>
      <Head>
        <title>TechTool App</title>
        <link rel="icon" href={faviconUrl} />
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
          
          // Initialize Supabase client immediately
          function initSupabaseClient() {
            if (typeof window.supabase !== 'undefined') {
              console.log("Creating Supabase client...");
              window.supabaseClient = window.supabase.createClient(
                window.SUPABASE_URL,
                window.SUPABASE_KEY
              );
              console.log("Supabase client created successfully!");
            } else {
              console.log("Supabase library not ready, retrying...");
              setTimeout(initSupabaseClient, 100);
            }
          }
          
          // Start initialization
          initSupabaseClient();
        `}
      </Script>
      <div
        id="webapp-root"
        dangerouslySetInnerHTML={{ __html: appHtml }}
      />
      <Script src="/js/app.js?v=3" strategy="afterInteractive" />
    </>
  );
}

export const getServerSideProps: GetServerSideProps<AppPageProps> = async (
  context
) => {
  const session = await getServerSession(context.req, context.res, authOptions);
  if (!session?.user?.email) {
    return {
      redirect: {
        destination: "/",
        permanent: false,
      },
    };
  }

  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseAnonKey =
    process.env.SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    "";

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Supabase credentials are missing. Set SUPABASE_URL and SUPABASE_ANON_KEY."
    );
  }

  const user = await getUserByEmail(session.user.email);
  if (!user) {
    return {
      redirect: {
        destination: `/not-registered?email=${encodeURIComponent(
          session.user.email
        )}`,
        permanent: false,
      },
    };
  }

  const mode = user.mode ?? "light";
  const name = user.name ?? session.user.name ?? "User";
  const role = user.role ?? "User";
  const email = session.user.email;

  const ticketParam = context.query.ticket;
  const unassignedParam = context.query.unassigned;

  let initialView = "";
  let ticketNumber = "";

  if (typeof unassignedParam === "string" && unassignedParam) {
    initialView = "unassigned";
    ticketNumber = unassignedParam;
  } else if (typeof ticketParam === "string" && ticketParam) {
    initialView = "my-ticket";
    ticketNumber = ticketParam;
  }

  const templatePath = path.join(
    process.cwd(),
    "templates",
    "webapp-body.html"
  );
  const template = await fs.promises.readFile(templatePath, "utf8");

  const replacements: Record<string, string> = {
    "{{EMAIL}}": escapeHtml(email ?? ""),
    "{{NAME}}": escapeHtml(name ?? ""),
    "{{MODE}}": escapeHtml(mode),
    "{{ROLE}}": escapeHtml(role ?? ""),
    "{{SCRIPT_URL}}": escapeHtml("/app"),
    "{{TICKET_NUMBER}}": escapeHtml(ticketNumber),
    "{{INITIAL_VIEW}}": escapeHtml(initialView),
    "{{FAVICON_URL}}": escapeHtml(FAVICON_URL),
  };

  let appHtml = template;
  for (const [token, value] of Object.entries(replacements)) {
    appHtml = appHtml.replace(new RegExp(token, "g"), value);
  }

  return {
    props: {
      appHtml,
      mode,
      name,
      supabaseUrl,
      supabaseAnonKey,
      faviconUrl: FAVICON_URL,
    },
  };
};
