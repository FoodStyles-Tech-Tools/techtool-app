import type { GetServerSideProps } from "next";

export default function StalledPage() {
  return null;
}

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: "/tickets?tab=stalled",
      permanent: false,
    },
  };
};
