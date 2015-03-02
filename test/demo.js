/**
 * @author Adam Jaso <ajaso@pocketly.com>
 * @copyright 2015 Pocketly
 */ 

var lockdConfig = {tcp: '127.0.0.1:9999'};
var server = require('lockd').listen(lockdConfig);

var app = require('sand')({appPath: __dirname, log: '*'})
  .use(require('sand-lockd'), {all: lockdConfig})
  .use(require('sand-http'), {all: {port: 12345}})
  .use(require('..'), {all: {
    useSandLockd: true,
    allowFailedSchedule: false
  }})
  .start();