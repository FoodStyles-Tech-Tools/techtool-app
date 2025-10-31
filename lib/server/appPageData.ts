import type { GetServerSideProps, GetServerSidePropsContext } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../pages/api/auth/[...nextauth]";
import { getUserByEmail } from "../supabase";
import type { AppPageConfig, AppPageProps, AppView } from "../appPageTypes";
import { FAVICON_URL } from "../appPageTypes";
import { getAppVersionInfo } from "../getAppVersion";
import path from "path";
import { promises as fs } from "fs";

type AppPageResult =
  | { props: AppPageProps }
  | { redirect: { destination: string; permanent: boolean } };

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function resolveAppPageProps(
  context: GetServerSidePropsContext,
  config: AppPageConfig
): Promise<AppPageResult> {
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

  let initialView: AppView = config.defaultView;
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
  const template = await fs.readFile(templatePath, "utf8");

  const versionInfo = getAppVersionInfo();

  const replacements: Record<string, string> = {
    "{{EMAIL}}": escapeHtml(email ?? ""),
    "{{NAME}}": escapeHtml(name ?? ""),
    "{{MODE}}": escapeHtml(mode),
    "{{ROLE}}": escapeHtml(role ?? ""),
    "{{SCRIPT_URL}}": escapeHtml(config.routePath),
    "{{TICKET_NUMBER}}": escapeHtml(ticketNumber),
    "{{INITIAL_VIEW}}": escapeHtml(initialView),
    "{{FAVICON_URL}}": escapeHtml(FAVICON_URL),
    "{{APP_VERSION}}": escapeHtml(versionInfo.version),
    "{{APP_VERSION_SHORT}}": escapeHtml(versionInfo.shortVersion),
    "{{APP_BUILD_TIME}}": escapeHtml(versionInfo.buildTime),
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
}

export function createAppPageGetServerSideProps(
  config: AppPageConfig
): GetServerSideProps<AppPageProps> {
  return (context) => resolveAppPageProps(context, config);
}
