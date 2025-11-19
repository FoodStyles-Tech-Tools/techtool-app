/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Enable prefetching for better navigation performance
  experimental: {
    optimizePackageImports: [
      'lucide-react', 
      '@radix-ui/react-select', 
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-popover',
      '@tanstack/react-query',
    ],
  },
  // Optimize images and static assets
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  // SWC minification (faster than Terser)
  swcMinify: true,
  // Optimize production builds
  productionBrowserSourceMaps: false,
  // Enable compression
  compress: true,
  // Optimize font loading
  optimizeFonts: true,
}

module.exports = nextConfig

