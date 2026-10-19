import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.squarespace-cdn.com',
      },
      {
        protocol: 'https',
        hostname: 'static1.squarespace.com',
      },
    ],
  },
  serverExternalPackages: ['pdfkit'],
};

export default nextConfig;
