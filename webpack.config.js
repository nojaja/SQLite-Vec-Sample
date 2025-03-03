const path = require('path');
const src = __dirname + "/src";
const dist = __dirname + "/dist";
const webpack = require('webpack');
const version = JSON.stringify(require('./package.json').version);
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyFilePlugin = require('copy-webpack-plugin');
const WriteFilePlugin = require('write-file-webpack-plugin');
const HardSourceWebpackPlugin = require('hard-source-webpack-plugin');
const zlib = require('zlib');

module.exports = {
  mode: process.env.NODE_ENV === 'production' ? 'development' : 'production',
  devtool: 'inline-source-map',
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist'),
    },
    compress: true,
    port: 9000
  },
  performance: {
    hints: false,
    maxEntrypointSize: 512000,
    maxAssetSize: 512000
  },
  context: src,
  entry: {
    'main': './js/index.js'
  },
  output: {
		globalObject: 'self',
    filename: './[name].bundle.js',
    sourceMapFilename: './map/[id].[chunkhash].js.map',
    chunkFilename: './chunk/[id].[chunkhash].js',
    path: dist,
    publicPath:""
  },
  resolve: {
    fallback: {
      "vm": require.resolve("vm-browserify"),
      "buffer": require.resolve("buffer/"),
      "stream": require.resolve("stream-browserify"),
      "crypto": require.resolve("crypto-browserify"),
      "path": require.resolve("path-browserify"),
      "fs": false
    },
    alias: {
      '@': path.resolve(src, '/js/')
    }
  },
  module: {
    rules: [{
      test: /\.css$/,
      use: ['style-loader', 'css-loader']
    }, {
      test: /\.(woff|woff2|eot|ttf)$/,
      use: ['file-loader']
    }, {
      test: /\.(svg)$/,
      use: ['raw-loader']
    },
    {
      test: /\.wasm$/,
      type: "asset/resource"
    }
  ]
  },
  plugins: [
    new webpack.ids.HashedModuleIdsPlugin({
      context: __dirname,
      hashFunction: 'sha256',
      hashDigest: 'hex',
      hashDigestLength: 20,
    }),
    //new HardSourceWebpackPlugin(),
    new webpack.ProvidePlugin({
      $: 'jquery',
      jQuery: 'jquery',
      'window.jQuery': 'jquery'
    }),
    new HtmlWebpackPlugin({
      inject: true,
      chunks: ['main'],
      template: './html/index.html',
      filename: './index.html'
    }),
    new CopyFilePlugin(
        [
            { from: '../node_modules/sqlite-vec-wasm-demo/sqlite3.wasm', to: dist },
            { from: '../node_modules/@xenova/transformers/dist/ort-wasm.wasm', to: dist },
            { from: '../node_modules/@xenova/transformers/dist/ort-wasm-simd.wasm', to: dist },
            {
              context: 'assets/',
              from: 'models/**/*.*',
              to: dist
            },
            {
              context: 'assets/',
              from: '*.json',
              to: dist
            },
            {
              context: 'assets/',
              from: '*.json',
              to: dist
            },
            {
              context: 'assets/',
              from: '_locales/**/*.*',
              to: dist
            },
            {
              context: 'assets/',
              from: 'icons/*.*',
              to: dist
            },
            {
                from: 'css/*.css',
                to: dist
            },
            {
                from: 'assets/*.*',
                to: dist,
                globOptions: {
                  dot: true,
                  gitignore: true,
                  ignore: ["**/*.db","**/*.json"]
                }
            }
        ],
        { copyUnmodified: true }
    ),
    new WriteFilePlugin()
  ]
}