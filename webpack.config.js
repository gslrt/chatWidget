// webpack.config.js

const path = require('path');

module.exports = {
  entry: {
    native: './frontend/src/native/nativeBundle.js',
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, '/oxofrmbl') // Change this line to match the desired directory
  }
};
