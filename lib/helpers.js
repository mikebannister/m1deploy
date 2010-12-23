var fs = require('fs'),
    exec  = require('child_process').exec;

var _mkdirAndParents = function(fullPath, fn) {
  var cmd = 'mkdir -p ' + fullPath;
  exec(cmd, fn);
};

var _rmdirAndChildren = function(fullPath, fn) {
  var cmd = 'rm -rf ' + fullPath;
  exec(cmd, fn);
};

copy = exports.copy = function(src, dest, fn) {
  var cmd = 'cp -R ' + src + ' ' + dest;
  exec(cmd, fn);
};

move = exports.move = function(src, dest, fn) {
  var cmd = 'mv ' + src + ' ' + dest;
  exec(cmd, fn);
};

link = exports.link = function(src, dest, fn) {
  var cmd = 'ln -sf ' + src + ' ' + dest;
  console.log(cmd);
  exec(cmd, fn);
};

mkdirAndParents = exports.mkdirAndParents = function(fullPaths, fn) {
  if (!_(fullPaths).isArray()) {
    fullPaths = [fullPaths];
  }
  var count = 0;
  var complete = function() {
    count++;
    if (count >= fullPaths.length) {
      fn();
    }
  };
  fullPaths.forEach(function(fullPath) {
    _mkdirAndParents(fullPath, complete);
  });
};

rmdirAndChildren = exports.rmdirAndChildren = function(fullPaths, fn) {
  if (!_(fullPaths).isArray()) {
    fullPaths = [fullPaths];
  }
  var count = 0;
  var complete = function() {
    count++;
    if (count >= fullPaths.length) {
      fn();
    }
  };
  fullPaths.forEach(function(fullPath) {
    _rmdirAndChildren(fullPath, complete);
  });
};

jsonFile2Obj = exports.jsonFile2Obj = function(path, fn) {
  fs.readFile(path, function(err, data) {
    fn(err, JSON.parse(data));
  });
};

obj2JsonFile = exports.obj2JsonFile = function(obj, path, fn) {
  var json = JSON.stringify(obj);
  fs.writeFile(path, json, 'utf8', function(err) {
    fn(err);
  });
};
