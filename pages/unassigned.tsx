import type { GetServerSideProps } from "next";

export default function UnassignedPage() {
  return null;
}

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: "/tickets?tab=unassigned",
      permanent: false,
    },
  };
};
