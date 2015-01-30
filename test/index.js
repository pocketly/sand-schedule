/**
 * @author Adam Jaso <ajaso@pocketly.com>
 * @copyright 2015 Pocketly
 */

var sinon = require('sinon');
var _ = require('lodash');
var sandSchedule = require('..');
var schedule = require('node-schedule');

describe('sand-schedule', function() {

  describe('job()', function() {

    sandSchedule = new sandSchedule();

    var badTests = [
      {},
      {name: ''},
      {name: 'asdf', run: null},
      {name: 'asdf', run: function() {}, when: null}
    ];

    _.each(badTests, function(test) {

      it('should deny invalid jobs like ' + JSON.stringify(test), function() {
        (sandSchedule.job(test) === null).should.be.ok;
      });

    });

    var goodTests = [
      {
        name: 'test1',
        when: {minute:1},
        run: function() {}
      },
      {
        name: 'test2',
        when: new Date(),
        run: function() {}
      }
    ];

    _.each(goodTests, function(test) {

      it('should allow valid jobs like ' + JSON.stringify(test), function() {

        var mock = sinon.mock(schedule);
        mock.expects('scheduleJob').returns(new schedule.Job);
        sandSchedule.job(test).should.be.instanceOf(schedule.Job);
        mock.verify();
        mock.restore();

      });

    });

  });

});