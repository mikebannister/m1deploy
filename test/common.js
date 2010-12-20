require.paths.push(__dirname + '/../dep/Sinon.JS/lib');

var fs = require('fs'),
    dep = require('../support');

// swap the user home directory for one in our test filesystem
process.env.HOME = __dirname + '/files/fakeHome/mike';

global.assert = require('assert');
global.sinon = require('sinon');
global.emptyFn = function(fn) { fn && fn(); };
