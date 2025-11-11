import type { GetServerSideProps, GetServerSidePropsContext } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../pages/api/auth/[...nextauth]";
import { getUserByEmail } from "../supabase";
import type { AppPageConfig, AppPageProps, AppView } from "../appPageTypes";
import { FAVICON_URL } from "../appPageTypes";
import { getAppVersionInfo } from "../getAppVersion";
import { escapeHtml, replaceTemplateTokens } from "../utils/string";
import { getSupabaseCredentials } from "../utils/supabase";
import path from "path";
import { promises as fs } from "fs";

type AppPageResult =
  | { props: AppPageProps }
  | { redirect: { destination: string; permanent: boolean } };

export async function resolveAppPageProps(
  context: GetServerSidePropsContext,
  config: AppPageConfig
): Promise<AppPageResult> {
  const session = await getServerSession(context.req, context.res, authOptions);
  if (!session?.user?.email) {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }

  const { url: supabaseUrl, anonKey: supabaseAnonKey } =
    getSupabaseCredentials();

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
  const tabParam = context.query.tab;

  let initialView: AppView = config.defaultView;
  let ticketNumber = "";

  // Handle tab parameter for tickets page
  if (config.defaultView === "tickets" && typeof tabParam === "string") {
    const validTabs: AppView[] = ["all", "my-ticket", "critical", "stalled", "unassigned", "incomplete"];
    if (validTabs.includes(tabParam as AppView)) {
      initialView = tabParam as AppView;
    } else {
      initialView = "all"; // Default to "all" if invalid tab
    }
  } else if (typeof unassignedParam === "string" && unassignedParam) {
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

  const appHtml = replaceTemplateTokens(template, replacements);

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
