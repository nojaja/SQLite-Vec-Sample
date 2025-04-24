const path = require('path');
const src = path.resolve(__dirname, 'src');
const dist = path.resolve(__dirname, 'dist');
const webpack = require('webpack');
const version = JSON.stringify(require('./package.json').version);
const CopyPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: process.env.NODE_ENV === 'production' ? 'development' : 'production',
  devtool: 'inline-source-map',
  devServer: {
    static: {
      directory: dist
    },
    compress: true
  },
  performance: {
    hints: false,
    maxEntrypointSize: 512000,
    maxAssetSize: 512000
  },
  entry: {
    'main': './src/js/index.js'
  },
  output: {
    filename: './[name].bundle.js',
    sourceMapFilename: './map/[id].[chunkhash].js.map',
    chunkFilename: './chunk/[id].[chunkhash].js',
    path: dist,
    publicPath:""
  },
  resolve: {
    fallback: {
      'fs': false,
      'path': require.resolve("path-browserify"),
      'process': require.resolve("process/browser")
    }
  },
  plugins: [
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer']
    }),
    new HtmlWebpackPlugin({
      inject: true,
      chunks: ['main'],
      template: './src/html/index.html',
      filename: './index.html'
    }),
    new CopyPlugin({
      patterns: [
            { from: 'node_modules/sqlite-vec-wasm-demo/sqlite3.wasm', to: './' },
            { from: 'node_modules/@xenova/transformers/dist/ort-wasm.wasm', to: './' },
            { from: 'node_modules/@xenova/transformers/dist/ort-wasm-simd.wasm', to: './' },
            {
              context: './src/assets/',
              from: 'models/**/*.*',
              to: './'
            }
        ]
      })
  ]
};