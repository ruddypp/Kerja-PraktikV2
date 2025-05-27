/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Skip staticGeneration during building
  env: {
    SKIP_STATIC_GENERATION: 'true'
  }
}

module.exports = nextConfig 