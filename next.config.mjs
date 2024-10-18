/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['firebasestorage.googleapis.com'],
  },
  experimental: {
    serverComponentsExternalPackages: ['winax'],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push({
        'winax': 'commonjs winax'
      });
    }
    return config;
  },
};

export default nextConfig;