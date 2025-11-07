/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true, // Enable React strict mode for better development experience
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
  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  // Enable SWC minification for better performance
  swcMinify: true,
};

module.exports = nextConfig;
