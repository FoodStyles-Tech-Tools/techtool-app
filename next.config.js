/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  // Disable aggressive caching for JavaScript files to ensure real-time updates work
  async headers() {
    return [
      {
        source: '/js/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
    ];
  },
  // Ensure proper script loading order
  experimental: {
    optimizeCss: false,
  },
};

module.exports = nextConfig;
