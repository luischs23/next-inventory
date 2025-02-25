/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['firebasestorage.googleapis.com', "fonts.gstatic.com"],
  },
  trailingSlash: false,
};

export default nextConfig;