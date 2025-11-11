import type { GetServerSideProps } from "next";

export default function IncompletePage() {
  return null;
}

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: "/tickets?tab=incomplete",
      permanent: false,
    },
  };
};
