// webpack.config.js
const path = require('path');

module.exports = {
  entry: {
    native: './frontend/src/native/nativeBundle.js',
    tether: './frontend/src/tether.js',
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, process.env.RAILWAY_VOLUME_MOUNT_PATH),
  },
};
