/**
 * @author Adam Jaso <ajaso@pocketly.com>
 * @copyright 2015 Pocketly
 */

/*
 * /usr/bin/node --es_staging /usr/bin/node-pm demo.js should demonstrate locking
 */

var server;
var cluster = require('cluster');
var lockdConfig = {tcp: '127.0.0.1:9999'};

if (cluster.worker && cluster.worker.id % 16 == 1) {
  server = require('lockd').listen(lockdConfig);
}

setTimeout(function() {
  new (require('sand'))({appPath: __dirname, log: '*'})
    .use(require('sand-lockd'), {all: lockdConfig})
    .use(require('sand-http'), {all: {port: 12345}})
    .use(require('..'), {all: {
      useSandLockd: true,
      allowFailedSchedule: false
    }})
    .start();
}, 0);
