import Head from "next/head";
import { signOut } from "next-auth/react";
import { useState } from "react";
import type { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "./api/auth/[...nextauth]";

interface NotRegisteredProps {
  email: string;
}

export default function NotRegistered({ email }: NotRegisteredProps) {
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    await signOut({ callbackUrl: "/" });
  };

  return (
    <>
      <Head>
        <title>Access Denied</title>
      </Head>
      <div className="not-registered-page">
        <div className="container">
          <h1>🔒 Access Denied</h1>
          <p>
            The email address <strong>{email}</strong> is not registered to use
            this system.
          </p>
          <button onClick={handleLogout} disabled={loading}>
            {loading ? "Logging Out..." : "Try a Different Account"}
          </button>
        </div>
      </div>
      <style jsx>{`
        .not-registered-page {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
            Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
          text-align: center;
          padding-top: 50px;
          background-color: #ffebee;
          color: #c62828;
          min-height: 100vh;
          margin: 0;
        }
        .container {
          background-color: #ffffff;
          padding: 40px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          display: inline-block;
        }
        button {
          padding: 12px 24px;
          font-size: 16px;
          cursor: pointer;
          border-radius: 4px;
          border: none;
          background-color: #4285f4;
          color: white;
          margin-top: 20px;
          transition: background-color 0.3s;
        }
        button:hover {
          background-color: #357ae8;
        }
        button:disabled {
          background-color: #cccccc;
          cursor: not-allowed;
        }
      `}</style>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<NotRegisteredProps> = async (
  context
) => {
  const session = await getServerSession(context.req, context.res, authOptions);
  if (!session?.user?.email) {
    return {
      redirect: {
        destination: "/",
        permanent: false,
      },
    };
  }

  const email = (context.query.email as string) ?? session.user.email;

  return {
    props: {
      email,
    },
  };
};
