import type { GetServerSideProps } from "next";

export default function MyTicketsPage() {
  return null;
}

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: "/tickets?tab=my-ticket",
      permanent: false,
    },
  };
};
