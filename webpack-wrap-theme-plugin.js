const async = require('async')
const RawSource = require('webpack-sources').RawSource
const merge  = require('lodash.merge')
const Cache = require('fs-simple-cache')

class WebpackWrapThemePlugin {
  constructor (options = {}) {
    this.options = merge({
      test: /\.css?$/,
      themeClass: '.theme-default',
    }, options)
  }

  apply (compiler) {
    const cache = new Cache(this.options)
    compiler.plugin('emit', (compilation, callback) => {
      async.eachOfLimit(compilation.chunks, 5, (chunk, key, cb) => {
        let promise = Promise.resolve()

        chunk.files.forEach((file) => {
          const asset = compilation.assets[file]

          if (this.options.test.test(file)) {
            const source = asset.source()
            let content
            if (content = cache.get(source).content) {
              promise = promise.then(() => content)
            }
            else {
              promise = promise.then(() => {
                const result = source.replace(/\[dir=/g, this.options.themeClass + '[dir=')
                cache.put(source, { content: result })
                return result
              })
            }
            promise = promise.then(result => {
              compilation.assets[file] = new RawSource(result)
            })
          }
        })

        promise.then(() => cb())
      }, callback)
    })
  }
}

module.exports = WebpackWrapThemePlugin