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
  // create .rtl.css
  enableCssRTL: true,
  // node_modules assets list i.e. 
  // copy: ['bootstrap/dist/bootstrap.js']
  // => will get copied to dist/assets/vendor/bootstrap.js
  copy: [],
  // options passed to laravel-mix
  laravelMixOptions: {
    // ignore fonts
    processCssUrls: false
  },
  browserSync: require('./bs-config.json')
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

// console.log(config.get())
// process.exit()

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

if (__RUN === 'clean' || (!__RUN && config.get('runTasks:clean'))) {
  del.sync([
    'temp/',
    'dist/**/*.html',
    'dist/assets/{css,fonts,js,vendor}'
  ])
}

////////
// JS //
////////

// npm run development -- --env.run js
if (__RUN === 'js' || (!__RUN && config.get('runTasks:js'))) {
  for (let file of glob.sync('./src/js/**/**.{js,vue}', { ignore: '**/_*' })) {
    mix.js(file, './dist/assets/js')
  }
}

////////////////////////
// COPY VENDOR ASSETS //
// from node_modules  //
////////////////////////

// npm run development -- --env.run copy
if (__RUN === 'copy' || (!__RUN && config.get('runTasks:copy'))) {
  try {
    require(path.join(process.cwd(), 'theme-mix.copy.json')).forEach(function(asset) {
      var dest = path.join(process.cwd(), 'dist/assets/vendor')
      var src = asset
      if (asset instanceof Object) {
        src = Object.keys(asset).pop()
        dest = Object.values(asset).pop()
      }
      for (let file of glob.sync(src, { cwd: path.join(process.cwd(), 'node_modules/') })) {
        mix.copy(path.join(process.cwd(), 'node_modules', file), dest)
      }
    })
  }
  catch (e) {}
}

//////////
// SASS //
//////////

mix.options(config.get('laravelMixOptions'))

// npm run development -- --env.theme dark
const __THEME = argv.env ? argv.env.theme || 'default' : 'default'

// npm run development -- --env.run sass
if (__RUN === 'sass' || (!__RUN && config.get('runTasks:sass'))) {
  let __DIST_CSS = './dist/assets/css'
  let sassOptions = { 
    importer: require('sass-importer-npm'),
  }

  if (config.get('enableCssThemes')) {
    // inject $theme variable
    sassOptions.data = '$theme: ' + __THEME + ';'
    __DIST_CSS += '/themes/' + __THEME
  }

  for (let file of glob.sync('src/sass/*.scss', { ignore: '**/_*' })) {
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
  for (let file of glob.sync('./src/html/pages/*.html', { ignore: '**/_*' })) {
    Mix.entry().entry.add('mix', path.resolve(file))
  }

  webpackConfig = merge(webpackConfig, {
    module: {
      rules: [{
        test: /\.html$/,
        loaders: [{
          loader: 'file-loader',
          options: {
            name: 'dist/[path][name].html',
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