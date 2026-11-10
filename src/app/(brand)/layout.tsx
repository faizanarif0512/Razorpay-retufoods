import type { Metadata } from 'next';
import { Montserrat, Poppins } from 'next/font/google';
import Header from '@/components/brand/Header';
import Footer from '@/components/brand/Footer';
import OAuthReturnRedirect from '@/components/layout/OAuthReturnRedirect';
import './brand.css';

const montserrat = Montserrat({ subsets: ['latin'], variable: '--font-montserrat' });
const poppins = Poppins({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-poppins' });

export const metadata: Metadata = {
  title: { default: 'Retü® mi-biotics™', template: '%s | Retü® mi-biotics™' },
  description:
    'A clean-label fermented millet gut shot, built for your biology — patented, independently validated, dairy-free.',
  icons: { icon: '/img/retu_logo-da9f748d.png' },
  metadataBase: new URL(process.env.NEXT_PUBLIC_STORE_URL || 'https://razorpay-retufoods.vercel.app'),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${montserrat.variable} ${poppins.variable}`}>
      <head>
        {/* Retü Adobe Fonts kit (casablanca-urw); falls back to Poppins on hosts the kit does not allow */}
        <link rel="stylesheet" href="https://use.typekit.net/pdm4pbb.css" />
      </head>
      <body>
        <OAuthReturnRedirect />
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
