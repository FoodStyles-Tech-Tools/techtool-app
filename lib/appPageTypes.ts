export type AppView =
  | "home"
  | "tickets"
  | "all"
  | "my-ticket"
  | "critical"
  | "stalled"
  | "unassigned"
  | "incomplete"
  | "projects"
  | "reconcile";

export type AppPageConfig = {
  defaultView: AppView;
  routePath: string;
};

export type AppPageProps = {
  appHtml: string;
  mode: string;
  name: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  faviconUrl: string;
};

export const FAVICON_URL =
  process.env.FAVICON_URL ??
  "/favicons/favicon.svg?v=2";
