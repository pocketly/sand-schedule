/**
 * @author Adam Jaso <ajaso@pocketly.com>
 * @copyright 2015 Pocketly
 */

"use strict";

const SandGrain = require('sand-grain');
const schedule = require('node-schedule');
const _ = require('lodash');
const path = require('path');
const fs = require('fs');

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

    var jobs = [];

    if (fs.existsSync(jobsPath)) {
      jobs = require('require-all')({
        dirname: jobsPath,
        filter: /(\w+)\.js/
      });
    } else {
      this.log(jobsPath + ' doesn\'t exist.');
    }

    done = _.once(done);

    if (this.config.allowFailedSchedule) {
      done();
    }

    if (self.config.useCustom) {

      if (!_.isFunction(self.config.acquireLock) || !_.isFunction(self.config.releaseLock)) {
        throw new Error('No custom locking functions found for config option {useCustom: true}. Aborting startup...');
      }

      this.acquireLock = self.config.acquireLock;
      this.releaseLock = self.config.releaseLock;

    } else if (self.config.useSandLockd && sand.lockd) {

      this.acquireLock = function acquireLock(jobId, next) {
        sand.lockd.acquire(jobId, function (err) {
          if (err) {
            if (err.message && !/^Lock Get Failure/i.test(err.message)) {
              self.log(err.message || err);
            }
            return;
          }
          self.log('Acquired lock "' + jobId + '"');
          next();
        });
      };

      this.releaseLock = function releaseLock(jobId, done) {
        done = done || _.noop;
        sand.lockd.release(jobId, function (err) {
          if (err) {
            sand.log(err.message || err);
          }
          self.log('Released lock "' + jobId + '"');
          done();
        });
      };

    } else if (self.config.useSandMemcache && sand.memcache) {

      this.acquireLock = function(jobId, next) {
        sand.memcache.add(jobId, 1, parseInt(self.config.lockTTL / 1000), function(err, val) {
          if (err) {
            return sand.error(err.message || err);
          }
          next();
        });
      };

      this.releaseLock = _.noop;

    } else {
      self.log('Locking disabled');

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
      self.log('Invalid job ' + jobName + ' - name, when, and/or run are missing/invalid');
      return null;
    }

    if (job.useLock && (!self.acquireLock || !self.releaseLock)) {
      self.log('Locking is not available for ' + jobName + '. Cancelling job...');
      return null;
    }

    var id = job.id = jobName.toLowerCase().replace(/\s+/g, '-');

    self.log('Scheduling job "' + jobName + '"');

    return schedule.scheduleJob(id, when, co.wrap(function *() {
      yield self.acquireLock(id);
      if (useLock) {
        self.acquireLock.call(self, id, startJob.bind(this));
      } else {
        startJob.call(this);
      }

      function startJob() {
        self.log('Running job: "' + jobName + '"');
        var startTime = Date.now();

        run.call(this, function finishJob(status) {
          self.log('Finished job "' + jobName + '" in ' + ((Date.now() - startTime) / 1000).toFixed(3) + ' s  ' + (status ? ': ' + status : ''));
          setTimeout(function() {
            if (useLock) {
              self.releaseLock.call(self, id);
            }
          }, self.config.lockTTL)
        });
      }

    }));

  }

}

module.exports = exports = Schedule;
