var EventEmitter = require('events').EventEmitter,
    LocalDeployment = require('deploy-recipes').LocalDeployment,
    sys = require('sys');

App = exports.App = function(manager, user, config) {
  var self = this;
  EventEmitter.call(this);
  // allow config to be overridden
  _(this).extend(config);
  // mixin local deployment recipe
  _(this).extend(LocalDeployment);
  this.manager = manager;
  this.user = user;
  this.stamp = new Date().getTime();
  this.date = new Date().toString();
};
App.prototype = Object.create(EventEmitter.prototype);

App.fromConfig = function(manager, user, configs) {
  var apps = [];
  if (!_(configs).isArray()) {
    configs = [configs];
  }
  _(configs).each(function(config) {
    apps.push(new App(manager, user, config));
  });
  return apps;
};
