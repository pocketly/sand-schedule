/**
 * @author Adam Jaso <ajaso@pocketly.com>
 * @copyright 2015 Pocketly
 */ 

var SandGrain = require('sand-grain');
var schedule = require('node-schedule');
var _ = require('lodash');
var path = require('path');
var lockd = require('lockd');

module.exports = exports = SandGrain.extend({

  name: 'schedule',

  api: schedule,

  construct: function() {
    this.super();
    this.defaultConfig = require('./default');
    this.version = require('../package').version;
  },

  init: function(config, done) {
    var self = this;
    this.super(config);

    var jobsPath = sand.appPath + this.config.jobsPath;
    var jobs = require('require-all')({
      dirname: jobsPath,
      filter: /(\w+)\.js/
    });


    this.conn = null;
    if (self.config.lockdConfig) {
      self.conn = lockd.connect(self.config.lockdConfig);
      this.conn.on('connect', connected);
      this.log('Locking enabled using "lockdConfig"');

    } else if (self.config.useSandLockd) {

      if (sand.lockd) {
        self.conn = sand.lockd.connect(connected);
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
  },

  shutdown: function(done) {
    this.log('Cancelling all jobs...');
    _.each(schedule.scheduledJobs, function(job, name) {
      this.log('Cancel job "' + job.name + '": ' + (schedule.cancelJob(job) ? 'succeeded' : 'failed'));
    }.bind(this));
    done();
  },

  /**
   * @param job {{}}
   */
  job: function(job) {
    var self = this;

    if (!_.isPlainObject(job)) {
      self.log('Invalid job: ' + JSON.stringify(job) + ' must be a plain object');
      return null;
    }

    var jobName = job.name;
    var when = job.when;
    var run = job.run;

    if (!jobName || !run || !when) {
      self.log('Invalid job: ' + jobName + ' - name, when, and/or run are missing/invalid');
      return null;
    }

    var id = job.id = jobName.toLowerCase().replace(/\s+/g, '-');

    self.log('Scheduling job "' + jobName + '"');

    return schedule.scheduleJob(id, when, function() {


      if (self.conn) {
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
            }, self.config.lockTTL);
          }
        });
      }

    });

  }

});

function acquireLock(jobId, next) {
  var self = this; // sand.schedule
  self.conn.get(jobId, function(err) {
    if (err) {
      return self.log(err);
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