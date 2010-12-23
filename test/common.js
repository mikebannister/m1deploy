require.paths.push(__dirname + '/../dep/Sinon.JS/lib');

var fs = require('fs'),
    path = require('path'),
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
  // delete destination first, just in case
  rmdirAndChildren(cleanDirs, function() {
    // make a copy
    copy(fakeHomeRoot, fakeRoot, function() {
      // point HOME env variable at fake home di
      process.env.HOME = path.join(fakeRoot, fakeAdmin);
      fsCount++;
      fn();
    });
  });
};

destroyFakeFilesystem = exports.destroyFakeFilesystem = function(fn) {
  rmdirAndChildren(fakeRoot, fn);
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
