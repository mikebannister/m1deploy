var path = require('path'),
    Step = require('step'),
    EventEmitter = require('events').EventEmitter,
    sys = require('sys'),
    helpers = require('helpers'),
    exec  = require('child_process').exec;

LocalDeployment = exports.LocalDeployment = function() {
  EventEmitter.call(this);
};
LocalDeployment.prototype = Object.create(EventEmitter.prototype);

LocalDeployment.prototype.deploy = function() {
  var self = this;
  Step(
    function prime() {
      return true;
    },
    function prepare(err, val) {
      if (err) throw err;
      var stepFn = this;
      self.prepare(function(err, val) {
        self.emit('stepComplete', 'prepare', self);
        stepFn(err, val);
      });
    },
    function verify(err, val) {
      if (err) throw err;
      var stepFn = this;
      self.verify(function(err, val) {
        self.emit('stepComplete', 'verify', self);
        stepFn(err, val);
      });
    },
    function activate(err, val) {
      if (err) throw err;
      var stepFn = this;
      self.activate(function(err, val) {
        self.emit('stepComplete', 'activate', self);
        stepFn(err, val);
      });
    },
    function finale(err, val) {
      if (err) throw err;
    }
  );
};

LocalDeployment.prototype.prepare = function(fn) {
  var self = this;
  // define paths and vars that we'll use throughout the recipe
  this.appIsNew = false;
  this.installRoot = path.join(process.env.HOME, '.m1deploy');
  this.appsRoot = path.join(self.installRoot, 'apps', self.user, self.name);
  this.latestRootLink = path.join(self.appsRoot, 'latest');
  this.tmpRoot = path.join(self.appsRoot, 'tmp');
  this.tempAppRoot = path.join(self.tmpRoot, self.user + '_' + self.name);
  this.versionsRoot = path.join(self.appsRoot, 'versions');
  
  Step(
    function prime() {
      return true;
    },
    function makeBaseDirs(err, val) {
      self.moof = 'toof';
      var stepFn = this;
      path.exists(self.versionsRoot, function(exists) {
        self.appIsNew = !exists;
        mkdirAndParents([self.installRoot, self.versionsRoot, self.appsRoot, self.tmpRoot], stepFn);
      });
    },
    function cloneRepos(err, val) {
      if (err) throw err;
      var stepFn = this;
      // go ahead and remove the tempAppRoot because it's unsafe to continue if it's already there
      rmdirAndChildren(self.tempAppRoot, function() {
        var cloneCmd = ['git clone', self.repository, self.tempAppRoot].join(' ');
        // do cloning
        exec(cloneCmd, stepFn);
      });
    },
    // get repository revision
    function getRevisionFromClone(err, val) {
      if (err) throw err;
      var stepFn = this;
      var options = { cwd: self.tempAppRoot };
      var gitSubmodule = exec('git rev-list --max-count=1 HEAD', options, function(err, stdout, stderr) {
        self.latestRevision = _(stdout).trim();
        stepFn(err, self.latestRevision);
      });
    },
    // first we try to get a copy of the modules
    function copyDependencies(err, val) {
      if (err) throw err;
      var stepFn = this;
      var nodeModulesPath = path.join(self.latestRootLink, 'node_modules');
      path.exists(nodeModulesPath, function(exists) {
        if (exists) {
          var nodeModulesCopyPath = path.join(self.tempAppRoot, 'node_modules');
          copy(nodeModulesPath, nodeModulesCopyPath, stepFn);
        } else {
          stepFn();
        }
      });
    },
    // install or update the modules via npm
    function installDependencies(err, val) {
      if (err) throw err;
      var stepFn = this;
      var packageFilePath = path.join(self.tempAppRoot, 'package.json');
      path.exists(packageFilePath, function(exists) {
        if (exists) {
          var options = { cwd: self.tempAppRoot };
          var npmBundle = exec('npm bundle', options, stepFn);
        } else {
          stepFn();
        }
      });
    },
    // update git submodules
    function updateSubmodules(err, val) {
      if (err) throw err;
      var stepFn = this;
      var submoduleFilePath = path.join(self.tempAppRoot, '.gitmodules');
      path.exists(submoduleFilePath, function(exists) {
        if (exists) {
          var options = { cwd: self.tempAppRoot };
          var gitSubmodule = exec('git submodule update --init', options, stepFn);
        } else {
          stepFn();
        }
      });
    },
    // move app to where it belongs
    function moveAppHome(err, val) {
      var stepFn = this;
      self.appVersionRoot = path.join(self.versionsRoot, self.latestRevision);
      path.exists(self.appVersionRoot, function(exists) {
        if (exists) {
          stepFn(null, self.latestRevision);
        } else {
          move(self.tempAppRoot, self.appVersionRoot, stepFn);
        }
      });
    },
    // link the reposity 
    function linkRepos(err, val) {
      if (err) throw err;
      var stepFn = this;
      link(self.appVersionRoot, self.latestRootLink, stepFn);
    },
    function finale(err, val) {
      fn(err, val);
    }
  );
};

LocalDeployment.prototype.verify = function(fn) {
  var self = this,
      makeFilePath = path.join(self.appVersionRoot, 'Makefile');
  path.exists(makeFilePath, function(exists) {
    if (exists) {
      var options = { cwd: self.appVersionRoot };
      exec('make test', options, function(err, stdout, stderr) {
        if (err) {
          var meta = {
            err: err,
            stdout: stdout,
            stderr: stderr
          };
          console.log(meta);
          self.emit('testsFailed', self, meta);
        }
        fn(err, null);
      });
    } else {
      fn(null, true);
    }
  });
};

LocalDeployment.prototype.activate = function(fn) {
  var self = this;
  fn(null, true);
};
