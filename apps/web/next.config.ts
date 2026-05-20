import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  outputFileTracingRoot: require('path').join(__dirname, '../..'),
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'storage.googleapis.com' },
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
    ],
  },
};

export default nextConfig;
