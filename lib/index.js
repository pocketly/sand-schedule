/**
 * @author Adam Jaso <ajaso@pocketly.com>
 * @copyright 2015 Pocketly
 */ 

"use strict";

const SandGrain = require('sand-grain');
const schedule = require('node-schedule');
const _ = require('lodash');
const path = require('path');
const lockd = require('lockd');

class Schedule extends SandGrain {
  constructor() {
    super();
    this.api = schedule;
    this.defaultConfig = require('./default');
    this.version = require('../package').version;
  }

  init(config, done) {
    var self = this;
    super.init(config);

    var jobsPath = sand.appPath + this.config.jobsPath;
    var jobs = require('require-all')({
      dirname: jobsPath,
      filter: /(\w+)\.js/
    });

    done = _.once(done);

    if (this.config.allowFailedSchedule) {
      done();
    }

    this.conn = null;
    if (self.config.lockdConfig) {
      self.conn = lockd.connect(self.config.lockdConfig);
      this.conn.on('connect', connected);
      this.conn.on('error', self.log);
      this.log('Locking enabled using "lockdConfig"');

    } else if (self.config.useSandLockd) {

      if (sand.lockd) {
        this.conn = sand.lockd.connect(connected);
        this.conn.on('error', self.log);
        this.log('Locking enabled using "sand.lockd"');

      } else {
        this.log('Locking could not be enabled. Could not find "sand.lockd".');
      }

    } else {
      this.log('Locking disabled');
      connected();
    }

    function connected() {
      if (self.conn) {
        self.log('Connected to lockd server');
      }

      _.each(jobs, function(job, file) {

        if (!_.isPlainObject(job)) {
          self.log('Invalid job: must be a plain object in ' + file);
          return;
        }

        job.name = job.name || path.basename(file, '.js');

        self.job(job);
      });

      done();

    }

    return this;
  }

  shutdown(done) {
    this.log('Cancelling all jobs...');
    _.each(schedule.scheduledJobs, function(job, name) {
      this.log('Cancel job "' + job.name + '": ' + (schedule.cancelJob(job) ? 'succeeded' : 'failed'));
    }.bind(this));
    done();
  }

  /**
   * @param job {{
   *    name: {String} - required,
   *    when: {Object|Date} - required,
   *    run: {Function} - required,
   *    useLock: {Boolean} - optional
   * }}
   */
  job(job) {
    var self = this;

    if (!_.isPlainObject(job)) {
      self.log('Invalid job: ' + JSON.stringify(job) + ' must be a plain object');
      return null;
    }

    var jobName = job.name;
    var when = job.when;
    var run = job.run;
    var useLock = 'undefined' !== typeof job.useLock ? job.useLock : true;

    if (!jobName || !run || !when) {
      self.log('Invalid job: ' + jobName + ' - name, when, and/or run are missing/invalid');
      return null;
    }

    var id = job.id = jobName.toLowerCase().replace(/\s+/g, '-');

    self.log('Scheduling job "' + jobName + '"');

    return schedule.scheduleJob(id, when, function() {


      if (self.conn && useLock) {
        acquireLock.call(self, id, startJob.bind(this));
      } else {
        startJob.call(this);
      }

      function startJob() {
        self.log('Running job: "' + jobName + '"');
        var startTime = Date.now();

        run.call(this, function finishJob(status) {
          self.log('Finished job "' + jobName + '" in ' + ((Date.now() - startTime) / 1000).toFixed(3) + ' s  ' + (status ? ': ' + status : ''));
          if (self.conn) {
            setTimeout(function() {
              releaseLock.call(self, id);
            }, self.config.lockTTL)
          }
        });
      }

    });

  }

}

module.exports = exports = Schedule;

function acquireLock(jobId, next) {
  var self = this; // sand.schedule
  self.conn.get(jobId, function(err) {
    if (err) {
      return self.log(err.message || err);
    }
    self.log('Acquired lock "' + jobId + '"');
    next();
  })
}

function releaseLock(jobId, done) {
  done = done || _.noop;
  var self = this; // sand.schedule
  this.conn.release(jobId, function(err) {
    // eat it
    self.log('Released lock "' + jobId + '"');
    done();
  });
}