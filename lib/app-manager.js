var EventEmitter = require('events').EventEmitter,
    path = require('path'),
    sys = require('sys'),
    fs = require('fs'),
    helpers = require('helpers'),
    App = require('app').App,
    Scheduler = require('scheduler').Scheduler,
    LocalDeployment = require('deploy-recipes').LocalDeployment;

var ConfigParseError = exports.ConfigParseError = function(file) {
    this.name = 'ConfigParseError';
    Error.call(this, 'config file could not be parsed ' + file);
    Error.captureStackTrace(this, arguments.callee);
};
sys.inherits(ConfigParseError, Error);

var AppManager = exports.AppManager = function() {
  var self = this;
  LocalDeployment.call(this);

  this.apps = {};
  this.urlRegistry = {};
  
  var fetchConfigFrequency = 1000;
  
  this.onDeployStepComplete = function(event, app) {
    self.emit(event + 'Complete', app);
  };
  
  self.on('configAdd', function(app) {
    app.deploy();
  });
  
  self.on('configRemove', function(app) {
  });
  
  self.on('configUpdate', function(app) {
    app.deploy();
  });
  
  this.scheduler = new Scheduler(fetchConfigFrequency, function(fn) {
    self.fetchConfig(fn);
  });
};
AppManager.prototype = Object.create(LocalDeployment.prototype);

AppManager.prototype.lookupByUrl = function(reposUrl) {
  if (_(reposUrl).endsWith('.git')) {
    reposUrl= reposUrl.substr(0, (reposUrl.length - 4));
  }
  return this.urlRegistry[reposUrl] || [];
};

AppManager.prototype.fetchConfig = function(fn) {
  var self = this;
  var homePath = path.dirname(process.env.HOME);
  var count = 0;
  var newApps = [];
  fs.readdir(homePath, function(err, configFiles) {

    var checkDeleted = function() {
      Object.keys(self.apps).forEach(function(user) {
        var existingApps = self.apps[user];
        _(existingApps).each(function(existingApp, appName) {
          if (!newApps[user] || !newApps[user][appName]) {
            self.emit('configRemove', existingApp);
          }
        });
      });
    };
    
    var complete = function() {
      count++;
      if (count >= configFiles.length) {
        checkDeleted();
        self.apps = newApps;
        fn && fn();
      }
    };
    
    configFiles.forEach(function(user) {
      var file = path.join(homePath, user, '.m1deploy.cfg');
      path.exists(file, function(exists) {
        if (exists) {
          fs.readFile(file, 'utf8', function(err, rawConf) {
            if (err) throw err;
            var apps = [];
            try {
              apps = JSON.parse(rawConf);
            } catch(err) {
              self.emit('error', new ConfigParseError(file));
            }
            apps = App.factory(user, apps);
            apps.forEach(function(app) {
              app.on('stepComplete', self.onDeployStepComplete);
              newApps[user] = newApps[user] || {};
              var existing = (!_(self.apps[user]).isUndefined() && !_(self.apps[user][app.name]).isUndefined());
              if (!existing) {
                var registryKey = app.repository;
                if (_(registryKey).endsWith('.git')) {
                  registryKey = registryKey.substr(0, (registryKey.length - 4));
                }
                self.urlRegistry[registryKey] = self.urlRegistry[registryKey] || [];
                self.urlRegistry[registryKey].push(app);
                newApps[user][app.name] = app;
                self.emit('configAdd', app);
              } else {
                var existingApp = self.apps[user][app.name];
                if (existingApp.repository !== app.repository) {
                  existingApp.repository = app.repository;
                  self.emit('configUpdate', existingApp);
                }
                newApps[user][app.name] = existingApp;
              }
            });
            complete();
          });
        } else {
          complete();
        }
      });
    });
  });
};
