import type { GetServerSideProps } from "next";

export default function CriticalPage() {
  return null;
}

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: "/tickets?tab=critical",
      permanent: false,
    },
  };
};
