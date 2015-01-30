/**
 * @author Adam Jaso <ajaso@pocketly.com>
 * @copyright 2015 Pocketly
 */ 

var app = require('sand')({appPath: __dirname, log: '*'})
  .use(require('..'))
  .start();