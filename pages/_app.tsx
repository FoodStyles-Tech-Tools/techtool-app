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
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" integrity="sha512-DTOQO9RWCH3ppGqcWaEA1BIZOC6xxalwEsw9c2QQeAIftl+Vegovlnee1c9QX4TctnWMn13TZye+giMm8e2LwA==" crossOrigin="anonymous" referrerPolicy="no-referrer" />
      </Head>
      <SessionProvider session={session}>
        <Component {...rest} />
      </SessionProvider>
    </>
  );
}
