"use strict";

const _ = require('lodash');
const schedule = require('node-schedule');
const bind = require('co-bind');
const co = require('co');
const Context = require('./Context');

class Job {

  constructor(baseConfig, config) {
    _.extend(this, config || {});
    this.config = baseConfig;
  }

  start() {
    let self = this;
    this.schedule = schedule.scheduleJob(this.id, this.when, function() {
      let ctx = new Context(this);
      co(function *() {
        yield co(bind(self.config.lock.acquire, ctx));
        yield co(bind(self.constructor.before, ctx));
        yield co(bind(self.constructor.run, ctx));
        yield co(bind(self.config.lock.release, ctx));
        ctx.end();
      });
    });
    return this;
  }

  static *acquireLock() {

  }

  static *releaseLock() {

  }

  static *before() {

  }

  static *run() {

  }

}

module.exports = Job;

function recurrenceR