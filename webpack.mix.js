const { mix } = require('laravel-mix')
const Mix     = mix.config
const glob    = require('glob')
const argv    = require('yargs').argv
const del     = require('del')
const merge   = require('webpack-merge').smart
let webpackConfig = {}

///////////////////
// Configuration //
///////////////////

const Config = require('merge-config')
let config = new Config()

config.merge({
  runTasks: {
    clean: true,
    js: true,
    copy: true,
    sass: true,
    html: true,
  },
  enableCssThemes: true,
  // create additional .rtl.css
  enableCssRTL: true,
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
  htmlDest: 'dist/[path][name].html',
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

mix.options(config.get('laravelMixOptions'))

// npm run development -- --env.theme dark
const __THEME = argv.env ? argv.env.theme || 'default' : 'default'

// npm run development -- --env.run sass
if (__RUN === 'sass' || (!__RUN && config.get('runTasks:sass'))) {
  let __DIST_CSS = config.get('cssDest')
  let sassOptions = { 
    importer: require('sass-importer-npm'),
  }

  if (config.get('enableCssThemes')) {
    // inject $theme variable
    sassOptions.data = '$theme: ' + __THEME + ';'
    __DIST_CSS += '/themes/' + __THEME
  }

  for (let file of glob.sync(config.get('sassSrc'), { ignore: '**/_*' })) {
    mix.sass(file, __DIST_CSS, sassOptions)
  }

  /////////
  // RTL //
  /////////

  if (config.get('enableCssRTL')) {
    const WebpackRTLPlugin = require('webpack-rtl-plugin')
    const WebpackRTLWrapPlugin = require('webpack-rtl-wrap-plugin')
    const cacheDirectory = path.resolve(path.join('temp', 'rtl', __THEME))

    del.sync(cacheDirectory)

    webpackConfig = merge(webpackConfig, { 
      plugins: [
        // Creates .rtl.css
        new WebpackRTLPlugin({
          minify: false
        }),
        // wraps CSS into [dir=ltr|rtl]
        new WebpackRTLWrapPlugin({
          cacheDirectory
        })
      ]
    })
  }

  ///////////////////////////////////
  // WRAP CSS with .theme-$__THEME //
  ///////////////////////////////////

  if (config.get('enableCssThemes')) {
    const WebpackWrapThemePlugin = require('./webpack-wrap-theme-plugin')
    const cacheDirectory = path.resolve(path.join('temp', 'themeClass', __THEME))

    del.sync(cacheDirectory)

    webpackConfig = merge(webpackConfig, {
      plugins: [
        new WebpackWrapThemePlugin({ 
          themeClass: '.theme-' + __THEME,
          cacheDirectory
        })
      ]
    })
  }
}

//////////////
// NUNJUCKS //
//////////////

// npm run development -- --env.run html
if (__RUN === 'html' || (!__RUN && config.get('runTasks:html'))) {
  for (let file of glob.sync('src/html/pages/*.html', { ignore: '**/_*' })) {
    Mix.entry().entry.add('mix', path.resolve(file))
  }

  webpackConfig = merge(webpackConfig, {
    module: {
      rules: [{
        test: /\.html$/,
        loaders: [{
          loader: 'file-loader',
          options: {
            name: config.get('htmlDest'),
            context: './src/html/pages',
            useRelativePath: true
          }
        }, 'jsbeautify-loader', {
          loader: 'nunjucks-html-loader',
          options: {
            searchPaths: [
              './src/html'
            ]
          }
        }, 'front-matter-loader']
      }]
    }
  })
}

//////////////////
// APPLY CONFIG //
//////////////////

mix.webpackConfig(webpackConfig)

/////////////////
// BROWSERSYNC //
/////////////////

if (!__RUN) {
  mix.browserSync(config.get('browserSync'))
}