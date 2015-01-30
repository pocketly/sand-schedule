/**
 * @author Adam Jaso <ajaso@pocketly.com>
 * @copyright 2015 Pocketly
 */ 

var app = require('sand')({appPath: __dirname})
  .use(require('..'), {all: {log: '*'}})
  .start();