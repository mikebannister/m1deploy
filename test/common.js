require.paths.push(__dirname + '/../dep/Sinon.JS/lib');

var fs = require('fs'),
    path = require('path'),
    exec  = require('child_process').exec,
    sys = require('sys'),
    dep = require('../support')
    App = require('app').App;

global.assert = require('assert');
global.sinon = require('sinon');
global.emptyFn = function(fn) { fn && fn(); };

// establish a fake home root for building filesystems doubles
var fakeHomeRoot = __dirname + '/files/fakeHome';

var fsCount = 0;
var fakeRoot;
var fakeAdmin = 'mike';

buildFakeFilesystem = exports.buildFakeFilesystem = function(fn) {
  fakeRoot = fakeHomeRoot + fsCount;
  // this gets created by another process sometimes, deleting for safely
  var deployDir = path.join(fakeHomeRoot, fakeAdmin, '.m1deploy');
  var cleanDirs = [deployDir, fakeRoot];
  var cmd = 'rm -rf ' + deployDir;
  exec(cmd, function(err, stdout, stderr) {
    cmd = 'rm -rf ' + fakeRoot;
    exec(cmd, function(err, stdout, stderr) {
      cmd = 'cp -r ' + fakeHomeRoot + ' ' + fakeRoot;
      exec(cmd, function(err, stdout, stderr) {
        process.env.HOME = path.join(fakeRoot, fakeAdmin);
        fsCount++;
        fn();
      });
    });
  });
};

destroyFakeFilesystem = exports.destroyFakeFilesystem = function(fn) {
  var cmd = 'rm -rf ' + fakeRoot;
  exec(cmd, function (error, stdout, stderr) {
    fn();
  });
};

initMockAppObjects = exports.initMockAppObjects = function() {
  App.prototype.prepare = function(fn) {
    App.prototype.prepare.callCount++;
    fn();
  };
  App.prototype.verify = function(fn) {
    App.prototype.verify.callCount++;
    fn();
  };
  App.prototype.activate = function(fn) {
    App.prototype.activate.callCount++;
    fn();
  };
  App.prototype.remove = function(fn) {
    App.prototype.remove.callCount++;
    fn();
  };
  App.prototype.prepare.callCount = 0;
  App.prototype.verify.callCount = 0;
  App.prototype.activate.callCount = 0;
  App.prototype.remove.callCount = 0;
};
