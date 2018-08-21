const htmllint = require( './htmllint' )
const reporter = require('./reporter')

class WebpackHTMLValidate {
  constructor (options = {}) {
    this.options = {
      test: /\.html$/,
      noLangDetect: false,
      server: {
        host: '127.0.0.1',
        port: 8888,
      },
      errorLevels: ['error'],
      absoluteFilePathsForReporter: false,
    }

    this.startTime = Date.now();
    this.prevTimestamps = {};
  }
  apply (compiler) {
    compiler.plugin('emit', (compilation, callback) => {

      var changedFiles = Object.keys(compilation.fileTimestamps).filter(function(watchfile) {
        return (this.prevTimestamps[watchfile] || this.startTime) < (compilation.fileTimestamps[watchfile] || Infinity);
      }.bind(this));

      this.prevTimestamps = compilation.fileTimestamps;

      if (changedFiles.length) {
        for (const filename in compilation.assets) {
          if (this.options.test.test(filename)) {
            htmllint(this.options, [filename], (error, result) => {
              if (error) {
                throw new Error(error)
              }
              if (result.length) {
                compilation.errors.push(new Error(reporter(result)))
              }
            })
          }
        }
      }

      callback()
    })
  }
}

module.exports = WebpackHTMLValidate