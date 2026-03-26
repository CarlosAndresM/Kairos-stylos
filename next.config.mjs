/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // 1. Mueve la propiedad aquí afuera
  outputFileTracingRoot: process.cwd(),
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'kairos-stylos-storage-bucket.sfo3.digitaloceanspaces.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'sfo3.digitaloceanspaces.com',
        port: '',
        pathname: '/kairos-stylos-storage/**',
      },
    ],
  },
}

export default nextConfig