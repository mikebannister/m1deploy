var EventEmitter = require('events').EventEmitter,
    path = require('path'),
    sys = require('sys'),
    fs = require('fs'),
    helpers = require('helpers'),
    App = require('app').App,
    Scheduler = require('scheduler').Scheduler;

var ConfigParseError = exports.ConfigParseError = function(file) {
    this.name = 'ConfigParseError';
    Error.call(this, 'config file could not be parsed ' + file);
    Error.captureStackTrace(this, arguments.callee);
};
sys.inherits(ConfigParseError, Error);

var AppManager = exports.AppManager = function() {
  var self = this;
  EventEmitter.call(this);

  this.apps = {};
  this.queue = {
    verify: [],
    prepare: [],
    activate: []
  };
  this.queueRunning = {};
  this.urlRegistry = {};
  
  var fetchConfigFrequency = 1000;
  
  self.on('prepareQueueComplete', function() {
    self.processQueue('verify');
  });
  
  self.on('verifyQueueComplete', function() {
    self.processQueue('activate');
  });
  
  self.on('prepareComplete', function(app) {
    self.queue.verify.push(app);
  });
  
  self.on('verifyComplete', function(app) {
    self.queue.activate.push(app);
  });
  
  self.on('configAdd', function(app) {
    self.queue.prepare.push(app);
  });

  self.on('configRemove', function(app) {
    app.remove();
  });

  self.on('configUpdate', function(app) {
    self.queue.prepare.push(app);
    self.processQueue('prepare');
  });

  self.on('queueReady', function() {
    self.processQueue('prepare');
  });
  
  var fetchConfigTask = function(fn) {
    self.fetchConfig(function() {
      self.emit('queueReady');
      fn();
    });
  };
  
  this.scheduler = new Scheduler(fetchConfigFrequency, fetchConfigTask);
};
AppManager.prototype = Object.create(EventEmitter.prototype);

AppManager.prototype.processQueue = function(name) {
  var self = this;
  if (!self.queueRunning[name]) {
    self.queueRunning[name] = true;
    var app = self.queue[name].pop();
    if (app) {
      var onItemComplete = function() {
        self.emit(name + 'Complete', app);
        self.queueRunning[name] = false;
        self.processQueue(name);
      };
      app[name](onItemComplete);
    } else {
      self.queueRunning[name] = false;
      self.emit(name + 'QueueComplete');
    }
  }  
};

AppManager.prototype.redeploy = function(app) {
  this.queue.prepare.push(app);
  this.processQueue('prepare');
};

AppManager.prototype.lookupByUrl = function(reposUrl) {
  console.log('lookupByUrl: ' + reposUrl);
  console.log(this.urlRegistry);
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
              newApps[user] = newApps[user] || {};
              var existing = (!_(self.apps[user]).isUndefined() && !_(self.apps[user][app.name]).isUndefined());
              if (!existing) {
                self.urlRegistry[app.repository] = self.urlRegistry[app.repository] || [];
                self.urlRegistry[app.repository].push(app);
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
