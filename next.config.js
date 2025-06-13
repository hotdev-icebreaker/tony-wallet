/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack(config) {
    config.module.rules.push({
      test: /HeartbeatWorker\.js$/,
      type: 'javascript/auto', // stop Webpack from trying to parse exports
    });

    return config;
  },
};

module.exports = nextConfig;