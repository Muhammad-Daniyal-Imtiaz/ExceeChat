import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ['@xenova/transformers', 'pdfjs-dist'],
  experimental: {
    turbo: {
      resolveAlias: {
        'process': 'process/browser',
        'buffer': 'buffer',
        'util': 'util',
      },
    },
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
      buffer: require.resolve('buffer/'),
      util: require.resolve('util/'),
      process: require.resolve('process/browser'),
    };
    return config;
  },
};

export default nextConfig;
