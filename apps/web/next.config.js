// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'standalone',
  onDemandEntries: {
    maxInactiveAge: 10 * 60 * 1000,
    pagesBufferLength: 12,
  },
};

module.exports = nextConfig;
