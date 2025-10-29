import type { AppPageProps } from "../lib/appPageTypes";
import BaseAppPage from "../lib/appPageFactory";
import { createAppPageGetServerSideProps } from "../lib/server/appPageData";

export default function ReconcilePage(props: AppPageProps) {
  return <BaseAppPage {...props} />;
}

export const getServerSideProps = createAppPageGetServerSideProps({
  defaultView: "reconcile",
  routePath: "/reconcile",
});
