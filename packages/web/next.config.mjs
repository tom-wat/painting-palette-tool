/** @type {import('next').NextConfig} */
const nextConfig = {
  // Tauri build: static export. Vercel build: default (SSR/SSG)
  output: process.env.TAURI === '1' ? 'export' : undefined,
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

export default nextConfig;