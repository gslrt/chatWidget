// webpack.config.js

const path = require('path');

module.exports = {
  entry: {
    native: './frontend/src/native/nativeBundle.js',
    // Add other bundles as needed
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, '/oxofrmbl')  // Update this to your volume path
  }
};

