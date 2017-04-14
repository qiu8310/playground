const webpack = require('webpack')
const path = require('path')
const fs = require('fs-extra')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const ExtractTextPlugin = require('extract-text-webpack-plugin')
const SassLintPlugin = require('sasslint-webpack-plugin')

const error = require('mora-scripts/libs/sys/error')

const conf = require('./conf')
const env = conf.env

const ROOT_DIR = __dirname
const SRC_DIR = path.join(ROOT_DIR, 'src', env.PRODUCT)
const DIST_DIR = path.join(ROOT_DIR, 'public', env.PRODUCT)

if (!fs.existsSync(SRC_DIR)) { error(`文件夹 ${SRC_DIR} 不存在`); process.exit(1) }
if (env.BUILD) { fs.ensureDirSync(DIST_DIR); fs.emptyDirSync(DIST_DIR) }
outputEnv(env)

const TEMPLATES = getTemplatesForDir(SRC_DIR)
const PAGES = getPagesFromTemplates(TEMPLATES)

// app 专属配置
const RC = (() => { try { return fs.readJsonSync(path.join(SRC_DIR, '__.rc')) } catch (e) { return {} } })()
const USE_CSS_MODULE = !!RC.useCssModule

const cssnanoOptions = { // http://cssnano.co/optimisations/
  autoprefixer: {
    browsers: ['last 10 version', 'ie >= 10'], // https://github.com/ai/browserslist#queries
    remove: false,
    add: true
  }
}
const normalCssLoader = {loader: 'css-loader', options: { minimize: cssnanoOptions }}
const moduleCssLoader = {loader: 'css-loader', options: {
  minimize: cssnanoOptions,
  modules: true,
  camelCase: true,
  localIdentName: env.BUILD ? '[hash:base64:8]' : '[name]_[local]_[hash:base64:3]'
}}
const normalSassLoader = {loader: 'sass-loader', options: {includePaths: []}}

module.exports = {
  devtool: env.DEV ? 'eval' : 'source-map', // eval: Fastest at the expense of detail
  // devtool: 'source-map',
  target: 'web',

  entry: PAGES.reduce((res, page) => {
    let jsfile = path.join(SRC_DIR, page + '.js')
    if (fs.existsSync(jsfile)) {
      res[page] = (env.DEV ? ['react-hot-loader/patch'] : []).concat(jsfile)
    }
    return res
  }, {}),

  output: {
    path: DIST_DIR,
    publicPath: env.BUILD ? '' : `http://${env.HOST}:${env.PORT}/`,
    filename: 'scripts/[name].js'
  },

  resolve: {
    modules: [
      'node_modules',
      ROOT_DIR
    ]
  },

  plugins: [
    new SassLintPlugin({
      configFile: path.join(ROOT_DIR, '.sass-lint.yml'),
      ignorePlugins: ['html-webpack-plugin', 'extract-text-webpack-plugin']
    }),

    new webpack.DefinePlugin(Object.keys(env).reduce((res, k) => {
      res['__' + k + '__'] = JSON.stringify(env[k])
      return res
    }, {})),

    new webpack.ProvidePlugin({
      React: 'react',
      PropTypes: 'prop-types'
    }),

    new webpack.optimize.CommonsChunkPlugin({
      name: 'common',
      minSize: 1000,
      minChunks: (module, count) => {
        return module.resource && module.resource.indexOf(path.join(ROOT_DIR, 'node_modules')) === 0
          // 如果是多页面，则只要 chunk 被引用了 3 次或以上就提取到 common 中
          || TEMPLATES.length > 1 && count > 2
      }
    }),

    // https://webpack.js.org/plugins/normal-module-replacement-plugin/
    //   带 __PRODUCT 后缀的 require 会自动替换成对应的 product
    //   如 require('config__PRODUCT') 当 env.PRODUCT 为 'app' 时会替换成 require('config__app')
    // new webpack.NormalModuleReplacementPlugin(/(.*)__PRODUCT(\.*)/, (resource) => {
    //   resource.request = resource.request.replace(/__PRODUCT/, `__${env.PRODUCT}`)
    // }),

    // new ExtractTextPlugin('[name].[contenthash:8].css', {
    new ExtractTextPlugin({
      filename: 'styles/[name].css',
      disable: !env.BUILD
    }),

    ...PAGES.map((page, i) => new HtmlWebpackPlugin({
      inject: true,
      template: path.join(SRC_DIR, TEMPLATES[i]),
      filename: page + '.html',
      chunks: [page, 'common']
    }))
  ],

  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: ['babel-loader', {loader: 'eslint-loader', options: {emitWarning: true}}]
      },

      USE_CSS_MODULE
        ? {test: /\.css$/, use: ExtractTextPlugin.extract({fallback: 'style-loader', use: [moduleCssLoader]})} // module
        : {test: /\.css$/, use: ExtractTextPlugin.extract({fallback: 'style-loader', use: [normalCssLoader]})}, // normal

      USE_CSS_MODULE
        ? {test: /\.s(c|a)ss$/, use: ExtractTextPlugin.extract({fallback: 'style-loader', use: [moduleCssLoader, normalSassLoader]})} // module
        : {test: /\.s(c|a)ss$/, use: ExtractTextPlugin.extract({fallback: 'style-loader', use: [normalCssLoader, normalSassLoader]})}, // normal
      // {test: /\.s(c|a)ss$/, use: ['style-loader', normalCssLoader, normalSassLoader]} // inline

      // 静态资源必须要打上 hash，否则不同文件夹下如果有相同的文件会导致重名
      {test: /\.(png|jpg|jpeg)$/, use: 'url-loader?limit=2048&name=static/[hash].[ext]'},
      {test: /\.(gif|svg|woff|woff2|ttf|eot|otf)$/, use: 'file-loader?name=static/[hash].[ext]'}
    ]
  },

  devServer: {
    stats: 'minimal',
    port: env.PORT,
    host: env.HOST,
    historyApiFallback: true
  }
}

function getTemplatesForDir(srcDir) {
  return fs
    .readdirSync(srcDir)
    .filter(name => /\.(ejs|html)$/.test(name))
}

function getPagesFromTemplates(templates) {
  return templates.map(tpl => tpl.replace(/\.(ejs|html)$/, ''))
}

function outputEnv(env) {
  let KEYS = Object.keys(env)
  let MAX_LENGTH = Math.max(...KEYS.map(k => k.length)) + 2

  console.log('\r\n\x1b[36m==================== 环境变量 ======================\x1b[0m')
  Object.keys(env).forEach(k => {
    let color = env[k] === true ? '\x1b[35m' : ''
    let len = k.length
    let prefix = len < MAX_LENGTH ? ' '.repeat(MAX_LENGTH - k.length) : ''
    console.log('%s%s: %j\x1b[0m', color, prefix + k, env[k])
  })
  console.log('\x1b[36m===================================================\x1b[0m\r\n')
}
