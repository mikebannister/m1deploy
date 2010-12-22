require.paths.push(__dirname + '/../dep/Sinon.JS/lib');

var fs = require('fs'),
    path = require('path'),
    dep = require('../support');

global.assert = require('assert');
global.sinon = require('sinon');
global.emptyFn = function(fn) { fn && fn(); };

// establish a fake home root for building filesystems doubles
var fakeHomeRoot = __dirname + '/files/fakeHome';

var fsCount = 0;
var fakeRoot;

buildFakeFilesystem = exports.buildFakeFilesystem = function(fn) {
  fakeRoot = fakeHomeRoot + fsCount;
  // delete destination first, just in case
  rmdirAndChildren(fakeRoot, function() {
    // make a copy
    copy(fakeHomeRoot, fakeRoot, function() {
      // point HOME env variable at fake home di
      process.env.HOME = path.join(fakeRoot, 'mike');
      fsCount++;
      fn();
    });
  });
};

destroyFakeFilesystem = exports.destroyFakeFilesystem = function(fn) {
  rmdirAndChildren(fakeRoot, fn);
};
