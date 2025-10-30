import type { GetServerSideProps } from "next";

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: "/projects",
      permanent: false,
    },
  };
};

export default function AppRedirectPage() {
  return null;
}
