var fs = require('fs'),
    spawn = require('child_process').spawn;

var _mkdirAndParents = function(fullPath, fn) {
  var cmd = 'mkdir -p ' + fullPath;
  run(cmd, fn);
};

var _rmdirAndChildren = function(fullPath, fn) {
  var cmd = 'rm -rf ' + fullPath;
  run(cmd, fn);
};

copy = exports.copy = function(src, dest, fn) {
  var cmd = 'cp -r ' + src + ' ' + dest;
  run(cmd, fn);
};

move = exports.move = function(src, dest, fn) {
  var cmd = 'mv ' + src + ' ' + dest;
  run(cmd, fn);
};

link = exports.link = function(src, dest, fn) {
  var cmd = 'link -sf ' + src + ' ' + dest;
  run(cmd, fn);
};

run = exports.run = function(cmdStr, fn) {
  var cmd = cmdStr.split(' ');
  var run = spawn(cmd[0], cmd.splice(1));
  var out, err;
  run.stdout.on('data', function(data) {
    out = data;
  });
  run.stderr.on('data', function(data) {
    err = data;
  });
  run.on('exit', function(code) {
    fn(err, out, code);
  });
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
