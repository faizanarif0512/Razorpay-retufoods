import type { Metadata } from 'next';
import { Montserrat, Poppins } from 'next/font/google';
import { CartProvider } from '@/context/CartContext';
import Header from '@/components/brand/Header';
import Footer from '@/components/brand/Footer';
import CartDrawer from '@/components/cart/CartDrawer';
import OAuthReturnRedirect from '@/components/layout/OAuthReturnRedirect';
import './globals.css';

// The original retufoods.com fonts: Montserrat for text, Poppins for buttons, casablanca-urw for headings
const montserrat = Montserrat({ subsets: ['latin'], variable: '--font-montserrat' });
const poppins = Poppins({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-poppins' });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_STORE_URL || 'https://razorpay-retufoods.vercel.app'),
  title: { default: 'Retü® mi-biotics™', template: '%s | Retü® mi-biotics™' },
  description:
    'A clean-label fermented millet gut shot, built for your biology — patented, independently validated, dairy-free.',
  icons: { icon: '/img/retu_logo-da9f748d.png' },
  openGraph: {
    title: 'Retü® mi-biotics™',
    description: 'Chilled, dairy-free fermented millet gut shots with LGG® & Wellmune®.',
    siteName: 'Retü Foods',
    images: [{ url: '/img/retu_logo_black-da9f748d.webp' }],
    locale: 'en_IN',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${montserrat.variable} ${poppins.variable}`}>
      <head>
        {/* Retü Adobe Fonts kit (casablanca-urw); falls back to Poppins on domains the kit does not allow */}
        <link rel="stylesheet" href="https://use.typekit.net/pdm4pbb.css" />
      </head>
      <body className="flex min-h-screen flex-col">
        <OAuthReturnRedirect />
        <CartProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <CartDrawer />
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}
