// webpack.config.js


const path = require('path');

module.exports = {
  entry: './frontend/src/index.js',  // Your main JS file
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist')  // Output directory
  }
};
