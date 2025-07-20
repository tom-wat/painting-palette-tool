/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@palette-tool/color-engine', '@palette-tool/cube-renderer'],
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;