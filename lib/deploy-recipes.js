var path = require('path'),
    Step = require('step'),
    sys = require('sys'),
    helpers = require('helpers'),
    spawn = require('child_process').spawn;

LocalDeployment = exports.LocalDeployment = {

  prepare: function(fn) {
    var self = this,
        appIsNew = false,
        installRoot = path.join(process.env.HOME, '.m1deploy'),
        appsRoot = path.join(installRoot, 'apps', self.user, self.name),
        latestRootLink = path.join(appsRoot, 'latest'),
        tmpRoot = path.join(appsRoot, 'tmp'),
        tempAppRoot = path.join(tmpRoot, self.name),
        versionsRoot = path.join(appsRoot, 'versions'),
        appVersionRoot;

    Step(
      function makeBaseDirs(err, val) {
        var stepFn = this;
        path.exists(versionsRoot, function(exists) {
          appIsNew = !exists;
          mkdirAndParents([installRoot, versionsRoot, appsRoot, tmpRoot], stepFn);
        });
      },
      function cloneRepos(err, val) {
        if (err) throw err;
        var stepFn = this;
        // go ahead and remove the tempAppRoot because it's unsafe to continue if it's already there
        rmdirAndChildren(tempAppRoot, function() {
          var cloneCmd = ['git clone', self.repository, tempAppRoot].join(' ');
          // do cloning
          run(cloneCmd, function(err, out, code) {
            stepFn(err, out);
          });
        });
      },
      // get repository revision
      function getRevisionFromClone(err, val) {
        if (err) throw err;
        var stepFn = this;
        process.chdir(tempAppRoot);
        var gitSubmodule = run('git rev-list --max-count=1 HEAD', function(err, revision, code) {
          self.latestRevision = _(revision).trim();
          console.log(self.latestRevision);
          stepFn(err, self.latestRevision);
        });
      },
      // first we try to get a copy of the modules
      function copyDependencies(err, val) {
        if (err) throw err;
        var stepFn = this;
        var nodeModulesPath = path.join(latestRootLink, 'node_modules');
        path.exists(nodeModulesPath, function(exists) {
          if (exists) {
            var nodeModulesCopyPath = path.join(tempAppRoot, 'node_modules');
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
        process.chdir(tempAppRoot);
        var packageFilePath = path.join(tempAppRoot, 'package.json');
        path.exists(packageFilePath, function(exists) {
          if (exists) {
            var npmBundle = run('npm bundle', function(err, out, code) {
              stepFn();
            });
          } else {
            stepFn();
          }
        });
      },
      // update git submodules
      function updateSubmodules(err, val) {
        if (err) throw err;
        var stepFn = this;
        process.chdir(tempAppRoot);
        var submoduleFilePath = path.join(tempAppRoot, '.gitmodules');
        path.exists(submoduleFilePath, function(exists) {
          if (exists) {
            var gitSubmodule = run('git submodule update --init', function(err, out, code) {
              stepFn();
            });
          } else {
            stepFn();
          }
        });
      },
      // move app to where it belongs
      function moveAppHome(err, val) {
        if (err) throw err;
        var stepFn = this;
        appVersionRoot = path.join(versionsRoot, self.latestRevision);
        path.exists(appVersionRoot, function(exists) {
          if (exists) {
            stepFn(null, self.latestRevision);
          } else {
            move(tempAppRoot, appVersionRoot, function() {
              stepFn(null, self.latestRevision);
            });
          }
        });
      },
      // link the reposity 
      function linkRepos(err, cloned) {
        if (err) throw err;
        link(appVersionRoot, latestRootLink, fn);
      }
    );
  },

  verify: function(fn) {
    fn();
    //var self = this,
    //    installRoot = path.join(process.env.HOME, '.m1deploy'),
    //    appsRoot = path.join(installRoot, 'apps', self.user, self.name),
    //    versionsRoot = path.join(appsRoot, 'versions'),
    //    appVersionRoot = path.join(versionsRoot, self.latestRevision),
    //    makeFilePath = path.join(appVersionRoot, 'Makefile');
    //
    //process.chdir(appVersionRoot);
    //path.exists(makeFilePath, function(exists) {
    //  if (exists) {
    //    //var make = spawn('make', ['test']);
    //    //make.stdout.on('data', function (data) {
    //    //  console.log('out: ' + data);
    //    //});
    //    //make.stderr.on('data', function (data) {
    //    //  console.log('err: ' + data);
    //    //});
    //    //make.on('exit', function(code) {
    //    //  
    //    //  console.log('code: ' + code);
    //    //  fn();
    //    //});
    //    
    //    var startTime = new Date().getTime();
    //    run('make test', function(err, out, code) {
    //      console.log('test time elapsed: ' + (new Date().getTime() - startTime));
    //      if (code > 0) {
    //        console.log('err: ' + err);
    //        console.log('out: ' + out);
    //        console.log('code: ' + code);
    //      }
    //      fn();
    //    });
    //  } else {
    //    fn();
    //  }
    //});
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
