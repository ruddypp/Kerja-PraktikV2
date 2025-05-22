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
  },
  // Add webpack function to suppress warnings and reduce log output
  webpack: (config, options) => {
    config.infrastructureLogging = {
      level: 'error',
    }
    return config
  },
  // Reduce logging during development
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
  output: 'standalone',
}

module.exports = nextConfig 