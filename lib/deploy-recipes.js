var path = require('path'),
    Step = require('step'),
    sys = require('sys'),
    helpers = require('helpers'),
    exec  = require('child_process').exec;

LocalDeployment = exports.LocalDeployment = {
  prepare: function(fn) {
    var self = this;

    // define paths and vars that we'll use throughout the recipe
    this.appIsNew = false;
    this.installRoot = path.join(process.env.HOME, '.m1deploy');
    this.appsRoot = path.join(self.installRoot, 'apps', self.user, self.name);
    this.latestRootLink = path.join(self.appsRoot, 'latest');
    this.tmpRoot = path.join(self.appsRoot, 'tmp');
    this.tempAppRoot = path.join(self.tmpRoot, self.name);
    this.versionsRoot = path.join(self.appsRoot, 'versions');
    this.appVersionRoot;

    Step(
      function makeBaseDirs(err, val) {
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
        process.chdir(self.tempAppRoot);
        var gitSubmodule = exec('git rev-list --max-count=1 HEAD', function(err, stdout, stderr) {
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
        process.chdir(self.tempAppRoot);
        var packageFilePath = path.join(self.tempAppRoot, 'package.json');
        path.exists(packageFilePath, function(exists) {
          if (exists) {
            var npmBundle = exec('npm bundle', stepFn);
          } else {
            stepFn();
          }
        });
      },
      // update git submodules
      function updateSubmodules(err, val) {
        if (err) throw err;
        var stepFn = this;
        process.chdir(self.tempAppRoot);
        var submoduleFilePath = path.join(self.tempAppRoot, '.gitmodules');
        path.exists(submoduleFilePath, function(exists) {
          if (exists) {
            var gitSubmodule = exec('git submodule update --init', stepFn);
          } else {
            stepFn();
          }
        });
      },
      // move app to where it belongs
      function moveAppHome(err, val) {
        if (err) throw err;
        var stepFn = this;
        self.appVersionRoot = path.join(self.versionsRoot, self.latestRevision);
        path.exists(self.appVersionRoot, function(exists) {
          if (exists) {
            stepFn(null, self.latestRevision);
          } else {
            move(self.tempAppRoot, self.appVersionRoot, function() {
              stepFn(null, self.latestRevision);
            });
          }
        });
      },
      // link the reposity 
      function linkRepos(err, cloned) {
        if (err) throw err;
        link(self.appVersionRoot, self.latestRootLink, fn);
      }
    );
  },

  verify: function(fn) {
    var self = this,
        makeFilePath = path.join(self.appVersionRoot, 'Makefile');
    process.chdir(self.appVersionRoot);
    path.exists(makeFilePath, function(exists) {
      if (exists) {
        exec('make test', function(err, stdout, stderr) {
          if (err) {
            var meta = {
              err: err,
              stdout: stdout,
              stderr: stderr
            };
            console.log(meta);
            self.emit('testsFailed', self, meta);
          }
          fn();
        });
      } else {
        fn();
      }
    });
  },

  activate: function(fn) {
    var self = this;
    fn && fn();
  },

  remove: function(fn) {
    var self = this;
    fn && fn();
  }
};
