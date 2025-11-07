import type { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "./api/auth/[...nextauth]";

export default function IndexPage() {
  // This component should never render as we redirect in getServerSideProps
  return null;
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);
  
  if (session) {
    // If logged in, redirect to /projects
    return {
      redirect: {
        destination: "/projects",
        permanent: false,
      },
    };
  } else {
    // If not logged in, redirect to /login
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }
};
