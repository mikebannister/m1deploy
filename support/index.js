require.paths.push(__dirname);
require.paths.push(__dirname + '/../lib');
require.paths.push(__dirname + '/../node_modules');

// special path tinkering
require.paths.push(__dirname + '/Sinon.JS/lib');

// globally useful
global._ = require('underscore');
// add string functions to the underscore global
var strings = require('underscore.strings');
