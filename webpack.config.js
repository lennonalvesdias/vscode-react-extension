const path = require('path');

module.exports = {
  target: 'web',
  entry: {
    extension: './src/extension.ts',
    webview: './src/webview.tsx'
  },
  output: {
    path: path.resolve(__dirname, 'out'),
    filename: '[name].js',
    libraryTarget: 'commonjs2'
  },
  externals: {
    vscode: 'commonjs vscode'
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.css'],
    fallback: {
      crypto: false
    }
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader'
          }
        ]
      },
      {
        test: /\.css$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              sourceMap: true
            }
          }
        ]
      }
    ]
  },
  devtool: 'source-map'
};
