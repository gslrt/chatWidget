// webpack.config.js
const webpack = require('webpack');
const path = require('path');

module.exports = {
  entry: {
    native: './frontend/src/native/nativeBundle.js',
    tether: './frontend/src/tether.js',
    analytics: './frontend/src/WebsiteAnalyticsClientSide.js',
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, process.env.RAILWAY_VOLUME_MOUNT_PATH),
  },

    plugins: [
    new webpack.DefinePlugin({
      'process.env.SERVICE_URL': JSON.stringify(process.env.SERVICE_URL),
      'process.env.TRANSCRIBE_SERVER_URL': JSON.stringify(process.env.TRANSCRIBE_SERVER_URL),
    }),
  ],
};
