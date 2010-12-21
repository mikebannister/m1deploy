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
  this.appTally = 0;
  
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
    self.queue[name] = self.queue[name] || [];
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
  var apps = [];
  var self = this;
  _(Object.keys(self.apps)).each(function(user) {
    var subApps = self.apps[user];
    _(Object.keys(subApps)).each(function(appName) {
      var app = subApps[appName];
      if (_(app.repository).endsWith('.git')) {
        app.repository = app.repository.substr(0, (app.repository.length - 4));
      }
      if (_(reposUrl).endsWith('.git')) {
        reposUrl = reposUrl.substr(0, (reposUrl.length - 4));
      }
      if (reposUrl === app.repository) {
        apps.push(app);
      }
    });
  });
  return apps;
};

AppManager.prototype.fetchConfig = function(fn) {
  var self = this;
  var homePath = path.dirname(process.env.HOME);
  var count = 0;
  var newApps = [];
  fs.readdir(homePath, function(err, configFiles) {

    var checkDeleted = function() {

      //var existingKeys = [];
      //Object.keys(self.apps).forEach(function(user) {
      //  existingKeys.push(Object.keys(self.apps[user]));
      //});
      ////console.log(_(existingKeys).flatten());
      //
      //var newKeys = [];
      //Object.keys(newApps).forEach(function(user) {
      //  newKeys.push(Object.keys(newApps[user]));
      //});
      ////console.log(_(newKeys).flatten());
      
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
        var increment = 0;
        if (count > self.appTally) {
          increment = count - self.appTally;
        }
        self.appTally = self.appTally + count;
        fn && fn(increment);
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
            apps = App.fromConfig(self, user, apps);
            apps.forEach(function(app) {
              newApps[user] = newApps[user] || {};
              var existing = (!_(self.apps[user]).isUndefined() && !_(self.apps[user][app.name]).isUndefined());
              if (!existing) {
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
