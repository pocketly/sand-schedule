/**
 * @author Adam Jaso <ajaso@pocketly.com>
 * @copyright 2015 Pocketly
 */ 

var SandGrain = require('sand-grain');
var schedule = require('node-schedule');
var _ = require('lodash');
var path = require('path');

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
      pattern: /.*\.js$/
    });

    _.each(jobs, function(job, file) {

      if (!_.isPlainObject(job)) {
        self.log('Invalid job: must be a plain object in ' + file);
        return;
      }

      job.name = job.name || path.basename(file, '.js');

      this.job(job);
    }.bind(this));

    done();

    return this;
  },

  shutdown: function(done) {
    this.log('Cancelling all jobs...');
    _.each(schedule.scheduledJobs, function(job, name) {
      this.log('\tjob: ' + job.name + ' cancel ' + (schedule.cancelJob(job) ? 'succeeded' : 'failed'));
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

    return schedule.scheduleJob(jobName, when, function() {
      self.log('Running job: ' + this.name);
      run.call(this);
    });

  }

});