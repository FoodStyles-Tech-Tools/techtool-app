import type { GetServerSideProps } from "next";

export default function AllTicketsPage() {
  return null;
}

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: "/tickets?tab=all",
      permanent: false,
    },
  };
};
