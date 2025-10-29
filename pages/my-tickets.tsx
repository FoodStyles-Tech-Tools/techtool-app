import type { AppPageProps } from "../lib/appPageTypes";
import BaseAppPage from "../lib/appPageFactory";
import { createAppPageGetServerSideProps } from "../lib/server/appPageData";

export default function MyTicketsPage(props: AppPageProps) {
  return <BaseAppPage {...props} />;
}

export const getServerSideProps = createAppPageGetServerSideProps({
  defaultView: "my-ticket",
  routePath: "/my-tickets",
});
