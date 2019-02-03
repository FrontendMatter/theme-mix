# theme-mix

[![npm version](https://badge.fury.io/js/theme-mix.svg)](https://badge.fury.io/js/theme-mix)

A modern development workflow based on Webpack and laravel-mix which compiles Sass, ES6 JavaScript, Vue files, handles production builds, watchers, multiple CSS themes and more. Created for FrontendMatter.com products.

## Installation

```bash
npm install theme-mix cross-env -D
```

> Create a `webpack.mix.js` file at the root of your project:

```js
require('theme-mix')
```

> Update `package.json` with the workflow:

```json
"scripts": {
  "development": "cross-env NODE_ENV=development node_modules/webpack/bin/webpack.js --progress --hide-modules --config=node_modules/laravel-mix/setup/webpack.config.js",
  "production": "cross-env NODE_ENV=production node_modules/webpack/bin/webpack.js --progress --hide-modules --config=node_modules/laravel-mix/setup/webpack.config.js",
  "watch": "cross-env NODE_ENV=development node_modules/webpack/bin/webpack.js --watch --progress --hide-modules --config=node_modules/laravel-mix/setup/webpack.config.js"
},
```

## Workflow

### Build

> Development build:

```bash
npm run development
```

> Production build (includes extra minification, optimizations and cleanup):

```bash
npm run production
```

### Watch

> Start a web server and automatically rebuild your changes as you make them:

```bash
npm run watch
```

### Tasks

> Run specific tasks

```bash
npm run development -- --env.run [html|js|sass|copy|clean]
```

#### CSS Themes

> Build specific themes:

```bash
npm run development -- --env.run sass --env.theme [theme_name]
```

## Options

> Create a `theme-mix.yaml` file at the root of your project. These are the default configuration options, except `copy` which by default is an empty list.

```yaml
runTasks:
  clean: true
  js: true
  copy: true
  sass: true
  html: true
# injects $theme Sass variable
enableCssThemes: false
# create additional .rtl.css
enableCssRTL: false
# expose globals
expose: []
# copy assets list i.e. 
# copyCwd: node_modules
# copyDest: dist/assets/vendor
# copy: 
#  - bootstrap/dist/bootstrap.js
# => will copy node_modules/bootstrap/dist/bootstrap.js to dist/assets/vendor/bootstrap.js
copyCwd: node_modules
copyDest: dist/assets/vendor
copy:
  - bootstrap/dist/js/bootstrap.min.js
  - jquery/dist/jquery.min.js
  - tether/dist/js/tether.min.js
  - dom-factory/dist/*
  - material-design-icons-iconfont/dist/fonts/*.{eot,ttf,woff,woff2}: dist/assets/fonts/material-icons
clean:
  - dist/**/*.html
  - dist/assets/{css,fonts,js,vendor}
sassSrc: src/sass/*.scss
cssDest: dist/assets/css
jsSrc: src/js/**/**.{js,vue}
jsDest: dist/assets/js
htmlSearchPaths:
  - ./src/html
htmlDest: dist/[path][name].html
htmllint: false
laravelMixOptions:
  processCssUrls: false
browserSync:
  port: 3000
  files:
    - ./dist/**/*.{html,css,js}
  server:
    baseDir: ./dist
  injectChanges: true
  notify: false
  ghostMode: false
  logLevel: silent
  proxy: null
```

## HTML Validation

> Java Development Kit > v8 required.

```bash
java -version
```

> Start the vnu-jar server on localhost port 8888.

```bash
java -cp node_modules/vnu-jar/build/dist/vnu.jar nu.validator.servlet.Main 8888
```

> Now you can build/watch HTML with W3C validation.

```bash
npm run development -- --env.run html
```
