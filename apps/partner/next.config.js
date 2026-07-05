/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  transpilePackages: ['@ava/ui', '@ava/domain', '@ava/db'],
  // Paket workspace (@ava/*) memakai spesifier ESM ber-".js" yang menunjuk
  // ke sumber ".ts" (gaya NodeNext). Ajari webpack memetakannya saat transpile.
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias ?? {}),
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
    };
    return config;
  },
};
