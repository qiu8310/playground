const webpack = require('webpack')
const path = require('path')
const fs = require('fs-extra')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const ExtractTextPlugin = require('extract-text-webpack-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const FaviconsWebpackPlugin = require('mora-favicons-webpack-plugin')
const StyleLintPlugin = require('stylelint-webpack-plugin')

const error = require('mora-scripts/libs/sys/error')

const conf = require('./conf')
const env = conf.env

const ROOT_DIR = __dirname
const SRC_DIR = path.join(ROOT_DIR, 'src', env.PRODUCT)
const DIST_DIR = path.join(ROOT_DIR, 'public', env.PRODUCT)
const SERVER_DIR = path.join(ROOT_DIR, 'res')
const NODE_MODULES_DIR = path.join(ROOT_DIR, 'node_modules')

if (!fs.existsSync(SRC_DIR)) { error(`文件夹 ${SRC_DIR} 不存在`); process.exit(1) }
if (env.BUILD) { fs.ensureDirSync(DIST_DIR); fs.emptyDirSync(DIST_DIR) }
outputEnv(env)

const TEMPLATES = getTemplatesForDir(SRC_DIR)
const PAGES = getPagesFromTemplates(TEMPLATES)
function getAssetName(type) {
  return (process.env.HASH ? (type === 'css' ? '[contenthash:16]' : '[chunkhash:16]') : '[name]') + '.' + type
}

// app 专属配置
const RC = (() => { try { return fs.readJsonSync(path.join(SRC_DIR, '__.rc')) } catch (e) { return {} } })()
const RC_USE_CSS_MODULE = !!RC.useCssModule
const RC_TITLE = RC.title || `Mora's ${env.PRODUCT}`
const RC_LOGO = RC.logo ? path.resolve(SRC_DIR, RC.logo) : path.join(SERVER_DIR, 'share/logo.svg')

const cssnanoOptions = { // http://cssnano.co/optimisations/
  autoprefixer: {
    browsers: ['last 10 version', 'ie >= 10'], // https://github.com/ai/browserslist#queries
    remove: false,
    add: true
  }
}
const getNormalCssLoader = (importLoaders) => ({loader: 'css-loader', options: { importLoaders, minimize: cssnanoOptions }})
const getModuleCssLoader = (importLoaders) => ({loader: 'css-loader', options: {
  minimize: cssnanoOptions,
  modules: true,
  importLoaders,
  camelCase: true,
  localIdentName: env.BUILD ? '[hash:base64:8]' : '[name]_[local]_[hash:base64:3]'
}})
// postcss 和 cssmodule 一起使用时要注意： https://github.com/postcss/postcss-loader#css-modules
const postcssLoader = {loader: 'postcss-loader'}
const normalSassLoader = {loader: 'sass-loader', options: {includePaths: []}}

const stats = 'verbose' // verbose normal minimal
// const stats = {
//   assets: true, // Add asset Information
//   assetsSort: 'field', // Sort assets by a field
//   cached: true, // Add information about cached (not built) modules
//   cachedAssets: true, // Show cached assets (setting this to `false` only shows emitted files)
//   children: true, // Add children information
//   chunks: true, // Add chunk information (setting this to `false` allows for a less verbose output)
//   chunkModules: true, // Add built modules information to chunk information
//   chunkOrigins: true, // Add the origins of chunks and chunk merging info
//   chunksSort: 'field', // Sort the chunks by a field
//   context: ROOT_DIR, // Context directory for request shortening
//   colors: true, // `webpack --colors` equivalent
//   depth: false, // Display the distance from the entry point for each module
//   entrypoints: false, // Display the entry points with the corresponding bundles
//   errors: true, // Add errors
//   errorDetails: true, // Add details to errors (like resolving log)
//   exclude: [], // Exclude modules which match one of the given strings or regular expressions
//   hash: true, // Add the hash of the compilation
//   maxModules: 15, // Set the maximum number of modules to be shown
//   modules: true, // Add built modules information
//   modulesSort: 'field', // Sort the modules by a field
//   performance: true, // Show performance hint when file size exceeds `performance.maxAssetSize`
//   providedExports: false, // Show the exports of the modules
//   publicPath: true, // Add public path information
//   reasons: true, // Add information about the reasons why modules are included
//   source: true, // Add the source code of modules
//   timings: true, // Add timing information
//   usedExports: false, // Show which exports of a module are used
//   version: true, // Add webpack version information
//   warnings: true
// }

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
    filename: `scripts/${getAssetName('js')}`
  },

  resolve: {
    modules: [
      'node_modules',
      ROOT_DIR
    ]
  },

  plugins: [
    new webpack.DefinePlugin(Object.keys(env).reduce((res, k) => {
      res['__' + k + '__'] = JSON.stringify(env[k])
      return res
    }, {
      'process.env': {
        NODE_ENV: JSON.stringify(process.env.NODE_ENV || env.ENV)
      }
    })),

    new StyleLintPlugin({
      emitErrors: false,
      files: ['src/' + env.PRODUCT + '/**/*.s?(a|c)ss', 'libs/**/*.s?(a|c)ss']
    }),

    new CopyWebpackPlugin([
      {from: path.join(SERVER_DIR, 'share'), to: 'share'}
    ].concat(
      fs.existsSync(path.join(SRC_DIR, 'static'))
        ? {from: path.join(SRC_DIR, 'static'), to: 'static'}
        : []
    )),

    new webpack.ProvidePlugin({
      React: 'react',
      PropTypes: 'prop-types'
    }),

    new webpack.optimize.CommonsChunkPlugin({
      name: 'common',
      minSize: 2000,
      minChunks: (module, count) => {
        if (process.env.NO_COMMON) return false
        let res = module.resource
        // FIXME: 如何更好地判断是系统使用的文件？
        // 当前方法是：将 minSize 去掉，最简源代码的情况下 common.js 应该非常小；
        // 通过看 terminal 上，可以知道哪些不该加入的 chunk 加入了进来，从而将它写入此
        let systemResources = [
          'base64-js/index.js',
          'buffer/index.js',
          'css-loader/lib/css-base.js',
          'ieee754/index.js',
          'isarray/index.js',
          'webpack/buildin/global.js',
          'style-loader/fixUrls.js',
          'style-loader/addStyles.js'
        ].map(r => path.normalize(path.join(NODE_MODULES_DIR, r)))

        return res && systemResources.indexOf(res) < 0 && res.indexOf(NODE_MODULES_DIR) === 0
          // 如果是多页面，则只要 chunk 被引用了 2 次或以上就提取到 common 中
          || TEMPLATES.length > 1 && count >= 2
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
      filename: `styles/${getAssetName('css')}`,
      disable: !env.BUILD
    }),

    ...getConditionalPlugins(!process.env.NO_FAVICON, () => new FaviconsWebpackPlugin({
      logo: RC_LOGO,
      prefix: process.env.HASH ? 'static/[hash:10]-' : 'static/',
      emitStats: false,
      statsFilename: 'static/stats.json',
      persistentCache: env.DEV,
      inject: true,
      background: '#000000',
      title: RC_TITLE,
      icons: {
        coast: false, opengraph: false, twitter: false, yandex: false,
        windows: false, android: false, appleIcon: false, firefox: false,
        appleStartup: false, favicons: true
      }
    })),

    ...PAGES.map((page, i) => new HtmlWebpackPlugin({
      env,
      inject: true,
      template: path.join(SRC_DIR, TEMPLATES[i]),
      filename: page + '.html',
      minify: {
        minifyJS: env.BUILD,
        minifyCSS: env.BUILD,
        removeComments: true,
        collapseBooleanAttributes: true,
        collapseInlineTagWhitespace: true,
        collapseWhitespace: true
      },
      title: RC_TITLE,
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

      RC_USE_CSS_MODULE
        ? {test: /\.css$/, use: ExtractTextPlugin.extract({fallback: 'style-loader', use: [getModuleCssLoader(1), postcssLoader]})} // module
        : {test: /\.css$/, use: ExtractTextPlugin.extract({fallback: 'style-loader', use: [getNormalCssLoader(1), postcssLoader]})}, // normal

      RC_USE_CSS_MODULE
        ? {test: /\.s(c|a)ss$/, use: ExtractTextPlugin.extract({fallback: 'style-loader', use: [getModuleCssLoader(2), postcssLoader, normalSassLoader]})} // module
        : {test: /\.s(c|a)ss$/, use: ExtractTextPlugin.extract({fallback: 'style-loader', use: [getNormalCssLoader(2), postcssLoader, normalSassLoader]})}, // normal

      // {test: /\.inline\.s(c|a)ss$/, use: ['style-loader', getNormalCssLoader(2), postcssLoader, normalSassLoader]}, // inline
      // {test: /\.local\.s(c|a)ss$/, use: ExtractTextPlugin.extract({fallback: 'style-loader', use: [getModuleCssLoader(2), postcssLoader, normalSassLoader]})}, // module

      // 静态资源必须要打上 hash，否则不同文件夹下如果有相同的文件会导致重名
      {test: /\.(gif|png|jpg|jpeg|svg)$/, use: 'url-loader?limit=2048&name=static/[hash].[ext]'},
      {test: /\.(ico|woff|woff2|ttf|eot|otf)$/, use: 'file-loader?name=static/[hash].[ext]'}
    ]
  },

  stats,
  devServer: {
    contentBase: SERVER_DIR,
    stats,
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
  if (process.env.JSON) return
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

function getConditionalPlugins(condition, fn) {
  return [].concat(condition ? fn() : [])
}
