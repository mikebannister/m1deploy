var EventEmitter = require('events').EventEmitter;

var Scheduler = exports.Scheduler = function(wait, task) {
  var self = this;
  this.running = false;
  self.run = function() {
    task(function() {
      if (self.running) {
        self.timer = setTimeout(self.run, wait);
      }
    });
  };
  this.running = true;
  self.run();
  EventEmitter.call(self);
};
Scheduler.prototype = Object.create(EventEmitter.prototype);

Scheduler.prototype.stop = function() {
  clearTimeout(this.timer);
  this.running = false;
};

Scheduler.prototype.start = function() {
  this.running = true;
  this.run();
};
