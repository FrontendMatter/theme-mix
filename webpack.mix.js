const mix     = require('laravel-mix')
const glob    = require('glob')
const argv    = require('yargs').argv
const del     = require('del')
const merge   = require('webpack-merge').smart
const webpack = require('webpack')
let webpackConfig = {}

///////////////////
// Configuration //
///////////////////

const MergeConfig = require('merge-config')
let config = new MergeConfig()

config.merge({
  runTasks: {
    clean: true,
    js: true,
    copy: true,
    sass: true,
    html: true,
  },
  enableCssRTL: false,
  // expose globals
  expose: [],
  // copy assets list i.e. 
  // copyCwd: 'node_modules'
  // copyDest: 'dist/assets/vendor'
  // copy: ['bootstrap/dist/bootstrap.js']
  // => will copy node_modules/bootstrap/dist/bootstrap.js to dist/assets/vendor/bootstrap.js
  copyCwd: 'node_modules',
  copyDest: 'dist/assets/vendor',
  copy: [],
  clean: [
    'dist/**/*.html',
    'dist/assets/{css,fonts,js,vendor}',
  ],
  sassSrc: 'src/sass/*.scss',
  cssDest: 'dist/assets/css',
  jsSrc: 'src/js/**/**.{js,vue}',
  jsDest: 'dist/assets/js',
  htmlSrc: 'src/html/pages/**/**.html',
  htmlContext: './src/html/pages',
  htmlSearchPaths: [
    './src/html'
  ],
  htmlDest: 'dist/[path][name].html',
  htmllint: true,
  // options passed to laravel-mix
  laravelMixOptions: {
    // ignore fonts
    processCssUrls: false,
  },
  browserSync: require('./bs-config.json'),
})

////////////////////////
// User configuration //
////////////////////////

try {
  config.file(path.join(process.cwd(), 'theme-mix.yaml'))
}
catch (e) {
  if (e.message.indexOf('ENOENT') === -1) {
    console.error(e.message)
    process.exit()
  }
}

///////////////////////////////
// Apply Laravel Mix options //
///////////////////////////////

mix.options(config.get('laravelMixOptions'))
mix.setPublicPath('.')

/////////////
// Aliases //
/////////////

mix.webpackConfig({
  resolve: {
    extensions: ['.js', '.vue'],
    alias: {
      '~': __dirname + '/src'
    }
  }
})

////////////////
// Sourcemaps //
////////////////

// Enable sourcemaps
const sourceMapsInProduction = false
mix.sourceMaps(sourceMapsInProduction)

// https://github.com/JeffreyWay/laravel-mix/issues/1793
if (!mix.inProduction()) {
  mix.webpackConfig({
    devtool: 'inline-source-map'
  })
}

///////////////////////////////////////////
// RUN SPECIFIC TASKS                    //
// npm run development -- --env.run html //
// npm run development -- --env.run js   //
// npm run development -- --env.run sass //
// npm run development -- --env.run copy //
///////////////////////////////////////////

const __RUN = argv.env ? argv.env.run : undefined

/////////////
// CLEANUP //
/////////////

del.sync('temp/')

if (__RUN === 'clean' || (!__RUN && config.get('runTasks:clean'))) {
  del.sync(config.get('clean'))
}

////////
// JS //
////////

// npm run development -- --env.run js
if (__RUN === 'js' || (!__RUN && config.get('runTasks:js'))) {
  for (let file of glob.sync(config.get('jsSrc'), { ignore: '**/_*' })) {
    mix.js(file, config.get('jsDest'))
  }
}

////////////////////////
// COPY VENDOR ASSETS //
// from node_modules  //
////////////////////////

// npm run development -- --env.run copy
if (__RUN === 'copy' || (!__RUN && config.get('runTasks:copy'))) {
  config.get('copy').forEach(function(asset) {
    var dest = path.join(process.cwd(), config.get('copyDest'))
    var src = asset
    if (asset instanceof Object) {
      src = Object.keys(asset).pop()
      dest = Object.values(asset).pop()
    }
    for (let file of glob.sync(src, { cwd: path.join(process.cwd(), config.get('copyCwd')) })) {
      mix.copy(path.join(process.cwd(), config.get('copyCwd'), file), dest)
    }
  })
}

//////////
// SASS //
//////////

// npm run development -- --env.run sass
mix.extend('addSassIncludePaths', function(webpackConfig) {
  const Vue = require('laravel-mix/src/components/Vue')
  const vue = new Vue()
  const options = {
    includePaths: ['node_modules', 'src/sass']
  }

  if (Config.extractVueStyles) {
    let ExtractTextPlugin = require('extract-text-webpack-plugin')
    let plugin = webpackConfig.plugins.findIndex(plugin => plugin instanceof ExtractTextPlugin)
    webpackConfig.plugins.splice(plugin, 1)
  }

  let { VueLoaderPlugin } = require('vue-loader')
  let plugin = webpackConfig.plugins.find(plugin => plugin instanceof VueLoaderPlugin)
  if (!plugin) {
    webpackConfig.plugins.push(new VueLoaderPlugin())
  }

  // SCSS
  vue.updateCssLoader(
    'scss',
    [
      'css-loader',
      {
        loader: 'sass-loader',
        options: Config.globalVueStyles
          ? Object.assign({}, options, {
            resources: Mix.paths.root(Config.globalVueStyles)
          })
          : Object.assign({}, options)
      }
    ],
    webpackConfig
  )
})

// npm run development -- --env.run sass
if (__RUN === 'sass' || (!__RUN && config.get('runTasks:sass'))) {
  mix.addSassIncludePaths()

  let __DIST_CSS = config.get('cssDest')

  let sassOptions = {
    // Add node_modules to includePaths
    includePaths: ['node_modules']
  }

  for (let file of glob.sync(config.get('sassSrc'), { ignore: '**/_*' })) {
    mix.sass(file, __DIST_CSS, sassOptions)
  }


  /////////
  // RTL //
  /////////

  if (config.get('enableCssRTL')) {
    mix.options({
      postCss: [
        require('postcss-rtl')
      ]
    })
  }
}

//////////////
// NUNJUCKS //
//////////////

// npm run development -- --env.run html
if (__RUN === 'html' || (!__RUN && config.get('runTasks:html'))) {
  let Entry = require('laravel-mix/src/builder/Entry')
  let entry = new Entry()

  for (let file of glob.sync(config.get('htmlSrc'), { ignore: '**/_*' })) {
    entry.add('mix', path.resolve(file))
  }

  let loaders = [{
    loader: 'file-loader',
    options: {
      name: config.get('htmlDest'),
      context: config.get('htmlContext'),
      useRelativePath: false
    }
  }]

  if (config.get('htmllint')) {
    loaders.push({
      loader: 'html-validate-loader'
    })
  }

  loaders = loaders.concat(['jsbeautify-loader', {
    loader: 'nunjucks-html-loader',
    options: {
      searchPaths: config.get('htmlSearchPaths')
    }
  }, 'front-matter-loader'])

  webpackConfig = merge(webpackConfig, {
    entry: entry.get(),
    resolveLoader: {
      alias: {
        'html-validate-loader': path.join(__dirname, './htmllint/webpack-html-validate-loader.js'),
      }
    },
    module: {
      rules: [{
        test: /\.html$/,
        loaders
      }]
    }
  })
}

////////////////////
// EXPOSE GLOBALS //
////////////////////

if (config.get('expose')) {
  const exposeConfig = {
    module: {
      rules: []
    }
  }

  config.get('expose').forEach(expose => {
    const library = Object.keys(expose)[0]
    const globals = typeof expose[library] === 'string' 
      ? [expose[library]] 
      : expose[library]

    const rule = {
      test: require.resolve(library),
      use: []
    }
    globals.forEach(name => rule.use.push({ loader: 'expose-loader', options: name }))
    exposeConfig.module.rules.push(rule)
  })

  webpackConfig = merge(webpackConfig, exposeConfig)
}

//////////////////
// APPLY CONFIG //
//////////////////

if (Config.webpackConfig) {
  webpackConfig = merge(Config.webpackConfig, webpackConfig)
}

mix.webpackConfig({
  plugins: [
     new webpack.LoaderOptionsPlugin({
      // test: /\.xxx$/, // may apply this only for some modules
      options: {
        jsBeautify: {
          "html": {
            "allowed_file_extensions": ["html", "xhtml", "shtml", "xml", "svg"],
            "indent_size": 4,
            "indent_inner_html": true,
            "wrap_attributes": "force-aligned",
            "max_preserve_newlines": 1
          }
        }
      }
    })
  ],
  resolve: { 
    symlinks: false,
    modules: [
      path.resolve(__dirname, '..', 'node_modules'),
      'node_modules'
    ],
  },
  module: {
    rules: [{
      test: /\.jsx?$/,
      exclude: /(node_modules\/(core-js|@babel\b)|bower_components)/,
      use: [
        {
          loader: 'babel-loader',
          options: Config.babel()
        }
      ]
    }]
  }
})

mix.webpackConfig(webpackConfig)

/////////////////
// BROWSERSYNC //
/////////////////

if (!__RUN) {
  mix.browserSync(config.get('browserSync'))
}

module.exports = {
  mix,
  config
}