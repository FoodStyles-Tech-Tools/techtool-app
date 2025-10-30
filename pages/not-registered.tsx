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
        <title>Access Denied - TechTool</title>
        <link
          rel="icon"
          href="https://drive.google.com/uc?export=download&id=1Lp_N2cdiIQUDGdoFNn9b-wDDA9TiQFcu&format=png"
          type="image/png"
        />
      </Head>
      <div className="not-registered-page">
        <div className="error-container">
          <div className="error-icon">
            <div className="icon-wrapper">
              <i className="fas fa-shield-alt"></i>
            </div>
          </div>
          
          <div className="error-content">
            <h1>Access Denied</h1>
            <p className="error-message">
              The email address <span className="email-highlight">{email}</span> is not registered to use this system.
            </p>
            <p className="help-text">
              Please contact your administrator to request access or try signing in with a different account.
            </p>
          </div>
          
          <div className="action-buttons">
            <button 
              className="primary-btn" 
              onClick={handleLogout} 
              disabled={loading}
            >
              {loading ? (
                <>
                  <i className="fas fa-spinner"></i>
                  Logging Out...
                </>
              ) : (
                <>
                  <i className="fas fa-sign-out-alt"></i>
                  Try a Different Account
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      <style jsx>{`
        .not-registered-page {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
            Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
          min-height: 100vh;
          margin: 0;
          background: linear-gradient(135deg, #667eea 0%, #f093fb 50%, #f5576c 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          position: relative;
          overflow: hidden;
        }
        
        .error-container {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-radius: 20px;
          padding: 3rem;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          text-align: center;
          max-width: 500px;
          width: 100%;
          position: relative;
          z-index: 2;
        }
        
        .error-icon {
          margin-bottom: 2rem;
        }
        
        .icon-wrapper {
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, #ef4444, #dc2626);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto;
          box-shadow: 0 8px 20px rgba(239, 68, 68, 0.3);
        }
        
        .icon-wrapper i {
          font-size: 2rem;
          color: white;
        }
        
        .error-content h1 {
          font-size: 2.5rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 1rem 0;
        }
        
        .error-message {
          font-size: 1.1rem;
          color: #6b7280;
          line-height: 1.6;
          margin: 0 0 1rem 0;
        }
        
        .email-highlight {
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          font-weight: 600;
        }
        
        .help-text {
          font-size: 0.95rem;
          color: #9ca3af;
          line-height: 1.5;
          margin: 0 0 2rem 0;
        }
        
        .action-buttons {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        
        .primary-btn, .secondary-btn {
          padding: 1rem 2rem;
          font-size: 1rem;
          font-weight: 600;
          border-radius: 12px;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          transition: all 0.3s ease;
          text-decoration: none;
        }
        
        .primary-btn {
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          color: white;
          box-shadow: 0 4px 15px rgba(79, 70, 229, 0.3);
        }
        
        .primary-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(79, 70, 229, 0.4);
        }
        
        .secondary-btn {
          background: transparent;
          color: #6b7280;
          border: 2px solid #e5e7eb;
        }
        
        .secondary-btn:hover {
          background: #f9fafb;
          border-color: #d1d5db;
          color: #374151;
        }
        
        .primary-btn:disabled {
          background: #d1d5db;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }
        
        @media (max-width: 768px) {
          .not-registered-page {
            padding: 1rem;
          }
          
          .error-container {
            padding: 2rem;
          }
          
          .error-content h1 {
            font-size: 2rem;
          }
          
          .action-buttons {
            gap: 0.75rem;
          }
          
          .primary-btn, .secondary-btn {
            padding: 0.875rem 1.5rem;
            font-size: 0.95rem;
          }
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
