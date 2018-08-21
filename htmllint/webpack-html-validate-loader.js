const htmllint = require( './htmllint' )
const reporter = require('./reporter')
const fs = require('fs')
const path = require('path')
const assign = require('object-assign')
const Cache = require('fs-simple-cache')
const cache = new Cache({
  cacheDirectory: path.resolve('.htmllint')
})

module.exports = function WebpackHTMLValidate(source, map, meta) {
  const options = assign({
    noLangDetect: false,
    server: {
      host: '127.0.0.1',
      port: 8888,
    },
    errorLevels: ['error'],
    absoluteFilePathsForReporter: false,
  }, this.options)

  const callback = this.async()

  if (content = cache.get(source, false)) {
    if (content === source) {
      if (output = cache.get(source).output) {
        const error = new Error(output)
        this.emitError(error)
        // return callback(error, source, map, meta)
        // not returning a callback error to make use of caching
        return callback(null, source, map, meta)
      }
    }
  }

  cache.put(source, source, false)

  htmllint(options, [cache.getPath(source, false)], (error, result) => {
    if (error) {
      error = new Error(error)
      this.emitError(error)
    }
    else if (result.length) {
      const output = reporter(result)
      cache.put(source, { output })
      error = new Error(output)
      this.emitError(error)
    }
    // callback(error, source, map, meta)
    // not returning a callback error to make use of caching
    callback(null, source, map, meta)
  })
}