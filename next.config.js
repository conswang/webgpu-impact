module.exports = {
  webpack: (
    config,
    { buildId, dev, isServer, defaultLoaders, nextRuntime, webpack }
  ) => {
  config.module.rules.push({
      test: /\.wgsl$/i,
      use: 'ts-shader-loader',
      });
    // Important: return the modified config
    return config
  },
}
