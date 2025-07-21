/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@palette-tool/color-engine', '@palette-tool/cube-renderer'],
  experimental: {
    typedRoutes: true,
  },
  // CSS最適化設定
  webpack: (config, { dev, isServer }) => {
    // 開発環境でのCSS処理最適化
    if (dev && !isServer) {
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;