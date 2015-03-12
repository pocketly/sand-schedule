/**
 * @author Adam Jaso <ajaso@pocketly.com>
 * @copyright 2015 Pocketly
 */

module.exports = {
  name: 'My Non Locking Job',
  useLock: false,
  when: {
    second: 30
  },
  run: function(next) {
    console.log('working 2 hard!!!');
    setTimeout(next, 1000);
  }
};