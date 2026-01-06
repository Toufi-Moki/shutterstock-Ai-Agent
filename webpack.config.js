const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: {
    popup: './src/popup/popup.js',
    options: './src/options/options.js',
    background: './src/background/background.js',
    content: './src/content/content.js',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'public', to: '.' },
        { from: 'src/popup/popup.html', to: 'popup.html' },
        { from: 'src/options/options.html', to: 'options.html', noErrorOnMissing: true },
        // Add icons or other assets if they exist
      ],
    }),
  ],
  resolve: {
    extensions: ['.js', '.jsx'],
  },
  mode: 'production',
};
