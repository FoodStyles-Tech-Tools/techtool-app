import "../styles/globals.css";
import type { AppProps } from "next/app";
import { SessionProvider } from "next-auth/react";
import Head from "next/head";

export default function App({ Component, pageProps }: AppProps) {
  const { session, ...rest } = pageProps as { session?: any };
  return (
    <>
      <Head>
        <link rel="icon" href="/favicons/favicon.svg?v=2" />
        <link rel="icon" type="image/svg+xml" href="/favicons/favicon.svg?v=2" />
        <link rel="shortcut icon" href="/favicons/favicon.svg?v=2" />
      </Head>
      <SessionProvider session={session}>
        <Component {...rest} />
      </SessionProvider>
    </>
  );
}
