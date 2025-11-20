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
    // Vercel handles image optimization automatically
    unoptimized: false,
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
  // Enable compression (Vercel handles this automatically, but setting it doesn't hurt)
  compress: true,
  // Optimize font loading
  optimizeFonts: true,
  // Ensure proper output for Vercel (serverless functions)
  output: undefined, // Let Vercel handle this automatically
  // Environment variable validation happens at runtime now (lazy initialization)
  // No need to validate here as it would break builds
}

module.exports = nextConfig

