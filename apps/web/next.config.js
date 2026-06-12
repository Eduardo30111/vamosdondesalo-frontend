const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});

const isMobileExport = process.env.EXPORT_MOBILE === 'true';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: isMobileExport ? 'export' : (process.env.NODE_ENV === 'production' ? 'standalone' : undefined),
  trailingSlash: isMobileExport ? true : undefined,
  images: {
    unoptimized: isMobileExport ? true : undefined,
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'via.placeholder.com' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
  },
  transpilePackages: ['@salo/shared'],
};

module.exports = withPWA(nextConfig);
