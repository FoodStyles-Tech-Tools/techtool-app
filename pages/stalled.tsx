import type { AppPageProps } from "../lib/appPageTypes";
import BaseAppPage from "../lib/appPageFactory";
import { createAppPageGetServerSideProps } from "../lib/server/appPageData";

export default function StalledPage(props: AppPageProps) {
  return <BaseAppPage {...props} />;
}

export const getServerSideProps = createAppPageGetServerSideProps({
  defaultView: "stalled",
  routePath: "/stalled",
});
