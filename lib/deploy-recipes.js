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
        console.log('cloneRepos');
        var tempAppRoot = path.join(tmpRoot, self.name);
        // go ahead and remove the tempAppRoot because it's unsafe to continue if it's already there
        rmdirAndChildren(tempAppRoot, function() {
          var cloneCmd = ['git clone', self.repository, tempAppRoot].join(' ');
          // do cloning
          console.log(cloneCmd);
          run(cloneCmd, function(err, out, code) {
            stepFn(err, out);
          });
        });
      },
        //    var clone = spawn('git', ['clone', self.repository, tempAppRoot]);
        //    clone.on('exit', function(code) {
        //      path.exists(tempAppRoot, function(exists) {
        //        if (!exists) {
        //          stepFn();
        //        } else {
        //          process.chdir(tempAppRoot);
        //          var nodeModulesPath = path.join(latestRootLink, 'node_modules');
        //          path.exists(nodeModulesPath, function(exists) {
        //            var afterModulesCopy = function() {
        //              var npmBundle = spawn('npm', ['bundle']);
        //              npmBundle.on('exit', function(code) {
        //                var gitSubmoduleUpdate = spawn('git', ['submodule', 'update', '--init']);
        //                gitSubmoduleUpdate.on('exit', function(code) {
        //                  var gitRevision = spawn('git', ['rev-list', '--max-count=1', 'HEAD']);
        //                  gitRevision.stdout.on('data', function (revision) {
        //                    self.latestRevision = _(revision).trim();
        //                  });
        //                  gitRevision.on('exit', function(code) {
        //                    appVersionRoot = path.join(versionsRoot, self.latestRevision);
        //                    path.exists(appVersionRoot, function(exists) {
        //                      if (!exists) {
        //                        move(tempAppRoot, appVersionRoot, function() {
        //                          stepFn(null, self.latestRevision);
        //                        });
        //                      } else {
        //                        stepFn(null, self.latestRevision);
        //                      }
        //                    });
        //                  });
        //                });
        //              });
        //            };
        //            if (exists) {
        //              var nodeModulesCopyPath = path.join(tempAppRoot, 'node_modules');
        //              copy(nodeModulesPath, nodeModulesCopyPath, afterModulesCopy);
        //            } else {
        //              afterModulesCopy();
        //            }
        //          });
        //        }
        //      });
        //    });
        //  }
        //});
      function linkRepos(err, cloned) {
        if (err) throw err;
        link(appVersionRoot, latestRootLink, fn);
      }
    );
  },

  verify: function(fn) {
    console.log('verify');
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
  }
};
