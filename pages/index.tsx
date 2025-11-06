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
        <link
          rel="icon"
          href="https://drive.google.com/uc?export=download&id=1Lp_N2cdiIQUDGdoFNn9b-wDDA9TiQFcu&format=png"
          type="image/png"
        />
      </Head>
      <div className="login-page">
        <div className="login-left">
          <div className="login-image-container"></div>
        </div>
        
        <div className="login-right">
          <div className="login-form-container">
            <div className="login-form">
              <h2>USER LOGIN</h2>
              
              <button className="google-login-btn" onClick={() => signIn("google", { callbackUrl: "/projects" })}>
                <svg className="google-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 533.5 544.3">
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
                <span>Continue with Google</span>
              </button>
            </div>
          </div>
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
          min-height: 100vh;
          margin: 0;
          padding: 0;
        }
        
        .login-left {
          flex: 3;
          background: linear-gradient(rgba(102, 126, 234, 0.7), rgba(240, 147, 251, 0.7)), url('/images/loginImage.png');
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .login-image-container {
          position: relative;
          z-index: 2;
          text-align: center;
          padding: 2rem;
          max-width: 500px;
        }
        
        
        .welcome-content p {
          font-size: 1.1rem;
          color: rgba(255, 255, 255, 0.9);
          line-height: 1.6;
          margin: 0;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        }
        
        .login-right {
          flex: 1;
          background: white;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
        }
        
        .login-form-container {
          width: 100%;
          max-width: 400px;
        }
        
        .login-form h2 {
          font-size: 2rem;
          font-weight: 700;
          color: #4f46e5;
          text-align: center;
          margin: 0 0 3rem 0;
        }
        
        .google-login-btn {
          width: 100%;
          background: #ffffff;
          color: #374151;
          border: 2px solid #dadce0;
          padding: 1rem 2rem;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          transition: all 0.3s ease;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        
        .google-login-btn:hover {
          background: #f8f9fa;
          border-color: #c6c6c6;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        
        .google-login-btn:active {
          transform: translateY(0);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        
        .google-icon {
          width: 20px;
          height: 20px;
        }
        
        .toast {
          visibility: hidden;
          min-width: 300px;
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: #fff;
          text-align: center;
          border-radius: 12px;
          padding: 16px 20px;
          position: fixed;
          z-index: 1000;
          right: 30px;
          bottom: 30px;
          font-size: 14px;
          font-weight: 500;
          opacity: 0;
          transform: translateY(20px);
          transition: all 0.3s ease;
          box-shadow: 0 10px 25px rgba(239, 68, 68, 0.3);
        }
        
        .toast.show {
          visibility: visible;
          opacity: 1;
          transform: translateY(0);
        }
        
        @media (max-width: 768px) {
          .login-page {
            flex-direction: column;
          }
          
          .login-left {
            flex: 2;
            min-height: 60vh;
          }
          
          .login-right {
            flex: 1;
            padding: 1rem;
          }
          
          .welcome-content p {
            font-size: 1rem;
          }
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
        destination: "/projects",
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
