"use strict";

class Context extends EventEmitter {

  constructor() {
    super();

    // lets bind context to sand grains
    if (sand && sand.modules && sand.modules.length > 0) {
      sand.modules.forEach(function(m) {
        if (typeof sand[m.name] !== 'undefined') {
          if (typeof sand[m.name].bindToContext === 'function') {
            sand[m.name].bindToContext(this);
          }

          if (typeof sand[m.name].onContextEnd === 'function') {
            this.on('end', function() {
              sand[m.name].onContextEnd(this);
            }.bind(this))
          }
        }
      }.bind(this))
    }

  }

  end() {
    this.emit('end');
    return this;
  }

}

module.exports = Context;