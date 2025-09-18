import Head from "next/head";
import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import type { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "./api/auth/[...nextauth]";
import { useRouter } from "next/router";

type LoginPageProps = {
  showToast: boolean;
};

export default function LoginPage({ showToast }: LoginPageProps) {
  const router = useRouter();
  const [toastVisible, setToastVisible] = useState(showToast);

  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => {
        setToastVisible(false);
        router.replace("/");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showToast, router]);

  return (
    <>
      <Head>
        <title>TechTool App</title>
      </Head>
      <div className="login-page">
        <div className="container">
          <h1>Welcome to TechTool App</h1>
          <p>Please log in with your Google account to continue.</p>
          <button className="login-btn" onClick={() => signIn("google")}> 
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 533.5 544.3">
              <path
                d="M533.5 278.4c0-18.5-1.5-37.1-4.7-55.3H272.1v104.8h147c-6.1 33.8-25.7 63.7-54.4 82.7v68h87.7c51.5-47.4 81.1-117.4 81.1-200.2z"
                fill="#4285f4"
              />
              <path
                d="M272.1 544.3c73.4 0 135.3-24.1 180.4-65.7l-87.7-68c-24.4 16.6-55.9 26-92.6 26-71 0-131.2-47.9-152.8-112.3H28.9v70.1c46.2 91.9 140.3 149.9 243.2 149.9z"
                fill="#34a853"
              />
              <path
                d="M119.3 324.3c-11.4-33.8-11.4-70.4 0-104.2V150H28.9c-38.6 76.9-38.6 167.5 0 244.4l90.4-70.1z"
                fill="#fbbc04"
              />
              <path
                d="M272.1 107.7c38.8-.6 76.3 14 104.4 40.8l77.7-77.7C405 24.6 339.7-.8 272.1 0 169.2 0 75.1 58 28.9 150l90.4 70.1c21.5-64.5 81.8-112.4 152.8-112.4z"
                fill="#ea4335"
              />
            </svg>
            <span>Login with Google</span>
          </button>
        </div>
        {toastVisible && (
          <div id="toast" className="toast show">
            Session refreshed. Please try logging in again.
          </div>
        )}
      </div>
      <style jsx>{`
        .login-page {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
            Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          margin: 0;
          background-color: #f0f2f5;
        }
        .container {
          text-align: center;
          background-color: #ffffff;
          padding: 40px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        h1 {
          font-size: 24px;
          color: #333;
        }
        .login-btn {
          background-color: #ffffff;
          color: #444444;
          border: 1px solid #dadce0;
          padding: 12px 24px;
          border-radius: 4px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 12px;
          margin-top: 20px;
          transition: background-color 0.3s, border-color 0.3s;
        }
        .login-btn:hover {
          background-color: #f7f7f7;
          border-color: #c6c6c6;
        }
        .login-btn svg {
          width: 18px;
          height: 18px;
        }
        .toast {
          visibility: hidden;
          min-width: 250px;
          background-color: #333;
          color: #fff;
          text-align: center;
          border-radius: 8px;
          padding: 16px;
          position: fixed;
          z-index: 1;
          right: 30px;
          bottom: 30px;
          font-size: 16px;
          opacity: 0;
          transition: opacity 0.5s, visibility 0.5s;
        }
        .toast.show {
          visibility: visible;
          opacity: 1;
        }
      `}</style>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<LoginPageProps> = async (
  context
) => {
  const session = await getServerSession(context.req, context.res, authOptions);
  if (session) {
    return {
      redirect: {
        destination: "/app",
        permanent: false,
      },
    };
  }

  const showToast = context.query.toast === "true";

  return {
    props: {
      showToast,
    },
  };
};
