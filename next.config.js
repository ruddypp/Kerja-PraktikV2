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
  // Add webpack function to suppress warnings
  webpack: (config, options) => {
    config.infrastructureLogging = {
      level: 'error',
    }
    return config
  }
}

module.exports = nextConfig 