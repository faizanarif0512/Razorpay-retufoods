import type { Metadata } from 'next';
import './globals.css';
import { CartProvider } from '@/context/CartContext';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import CartDrawer from '@/components/cart/CartDrawer';

export const metadata: Metadata = {
  title: 'Retü Foods Webstore | mi-biotics™ Fermented Millet Gut Shots',
  description:
    'Official storefront for mi-biotics™: Patented, independently validated, dairy-free fermented multi-millet gut shots built for your biology.',
  icons: {
    icon: 'https://images.squarespace-cdn.com/content/v1/6a34e9ecae0564717b920a1f/e7625a77-a3e5-4d4f-aef7-b65415369108/favicon.ico',
  },
  openGraph: {
    title: 'Retü Foods | mi-biotics™ Official Store',
    description: 'Chilled, dairy-free fermented millet gut shots with LGG® & Wellmune®.',
    url: 'https://www.retufoods.com',
    siteName: 'Retü Foods Store',
    images: [
      {
        url: 'https://images.squarespace-cdn.com/content/v1/6a34e9ecae0564717b920a1f/da9f748d-a4ce-4116-9838-43ee724b5805/RETU_LOGO_BLACK.png',
        width: 1500,
        height: 787,
      },
    ],
    locale: 'en_IN',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-white text-retu-charcoal">
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
