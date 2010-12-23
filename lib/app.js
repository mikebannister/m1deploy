var EventEmitter = require('events').EventEmitter,
    LocalDeployment = require('deploy-recipes').LocalDeployment,
    sys = require('sys');

App = exports.App = function(user, config) {
  var self = this;
  LocalDeployment.call(this);
  this.user = user;
  this.stamp = new Date().getTime();
  this.date = new Date().toString();
  // allow config values to be overridden
  _(this).extend(config);
};
App.prototype = Object.create(LocalDeployment.prototype);

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
