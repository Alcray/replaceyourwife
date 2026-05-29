/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['100.96.239.92', 'localhost', '127.0.0.1'],
  experimental: {
    serverActions: {
      bodySizeLimit: '25mb'
    }
  }
};

export default nextConfig;
