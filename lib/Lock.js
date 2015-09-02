"use strict";

const hostname = require('os').hostname();
let MemDB = {};

class Lock {
  static *acquire(id) {
    if (MemDB[id] && MemDB[id] != ownerId) {
      throw new Error(`Job '${id}' is locked.`);
    }
    MemDB[id] = this;
  }

  static *release(id) {
    delete MemDB[id];
  }

  static newOwnerId() {
    return hostname + '-' + new Date().getTime() + '-' + parseInt(Math.random() * 1000000000);
  }
}

module.exports = Lock;