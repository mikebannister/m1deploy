var EventEmitter = require('events').EventEmitter,
    LocalDeployment = require('deploy-recipes').LocalDeployment,
    sys = require('sys');

App = exports.App = function(user, config) {
  var self = this;
  EventEmitter.call(this);
  this.user = user;
  this.stamp = new Date().getTime();
  this.date = new Date().toString();
  // allow config values to be overridden
  _(this).extend(config);
  // mixin local deployment recipe
  _(this).extend(LocalDeployment);
};
App.prototype = Object.create(EventEmitter.prototype);

App.factory = function(user, configs) {
  var apps = [];
  if (!_(configs).isArray()) {
    configs = [configs];
  }
  _(configs).each(function(config) {
    apps.push(new App(user, config));
  });
  return apps;
};
