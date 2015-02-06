/**
 * @author Adam Jaso <ajaso@pocketly.com>
 * @copyright 2015 Pocketly
 */ 

module.exports = {
  name: 'My Job',
  when: {
    second: 30
  },
  run: function(next) {
    console.log('working hard!!!');
    setTimeout(next, 1000);
  }
};