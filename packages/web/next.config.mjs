import withPWA from 'next-pwa';

const pwaConfig = withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  cacheOnFrontEndNav: true,
  reloadOnOnline: true,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  transpilePackages: ['@palette-tool/color-engine', '@palette-tool/cube-renderer'],
  // CSS最適化設定
  webpack: (config, { dev, isServer }) => {
    // 開発環境でのCSS処理最適化
    if (dev && !isServer) {
      config.cache = false;
    }
    return config;
  },
};

export default pwaConfig(nextConfig);
