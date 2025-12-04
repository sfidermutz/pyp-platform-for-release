import type { AppProps } from 'next/app';
import '../styles/globals.css';
import Layout from '../components/Layout';

// Clean, minimal _app to wrap every page in the Layout (header/nav/footer)
export default function App({ Component, pageProps }: AppProps) {
  return (
    <Layout>
      <Component {...pageProps} />
    </Layout>
  );
}
