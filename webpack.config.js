// webpack.config.js
const path = require('path');

const volumePath = process.env.RAILWAY_VOLUME_MOUNT_PATH || '/oxofrmbl';

module.exports = {
  entry: {
    native: './frontend/src/native/nativeBundle.js',
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, volumePath),
  },
};
