module.exports = function( results ) {
  var path = require( 'path' ),
    files = {},
    out = [];

  results.forEach( function( result ) {
    // Register the file
    result.file = path.normalize( result.file );
    if ( !files[ result.file ] ) {
      files[ result.file ] = []
    }

    // Add the error
    files[ result.file ].push( {
      severity: result.type,
      line: result.lastLine,
      column: result.lastColumn,
      message: result.message,
      source: 'htmllint.Validation' + ( result.type === 'error' ? 'Error' : 'Warning' )
    })

  })

  for ( var fileName in files ) {
    if ( files.hasOwnProperty( fileName ) ) {
      out.push( fileName + ' has ' + files[ fileName ].length + ' Errors\n' );
      for ( var i = 0, len = files[ fileName ].length; i < len; i++ ) {
        var issue = files[ fileName ][ i ];
        out.push(
          ( i + 1 ) + ' ' +
          'line ' + issue.line + ', ' +
          'char ' + issue.column + ': ' +
          issue.message
       );
      }
    }
  }

  return out.join( '\n' )
}