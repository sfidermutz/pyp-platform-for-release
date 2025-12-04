import type { AppProps } from 'next/app';
import '../styles/globals.css';
import Layout from '../components/Layout';

// Wrap every page with the shared Layout (header/nav/footer)
export default function App({ Component, pageProps }: AppProps) {
  return (
    <Layout>
      <Component {...pageProps} />
    </Layout>
  );
}
