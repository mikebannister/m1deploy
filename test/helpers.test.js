var common = require('./common'),
    helpers = require('helpers'),
    path = require('path');

var tearDown = function(fn) {
  destroyFakeFilesystem(fn);
};

module.exports = {
  setup: function(fn) {
    buildFakeFilesystem(fn);
  },
  'create deeply nested directories': function(fn) {
    var path1 = path.join(process.env.HOME, 'test1/test2/test3');
    mkdirAndParents(path1, function() {
      path.exists(path1, function(exists) {
        assert.ok(exists);
        var path2 = path.join(process.env.HOME, 'test4/test5/test6');
        mkdirAndParents(path2, function() {
          path.exists(path2, function(exists) {
            assert.ok(exists);
            var path3 = path.join(process.env.HOME, 'test4/test5/test6/test7/test8/test9');
            mkdirAndParents(path3, function() {
              path.exists(path3, function(exists) {
                assert.ok(exists);
                // cleanup
                rmdirAndChildren(path.join(process.env.HOME, 'test1'), function(err) {
                  rmdirAndChildren(path.join(process.env.HOME, 'test4'), function(err) {
                    tearDown(fn);
                  });
                });
              });
            });
          });
        });
      });
    });
  },
  'create multiple deeply nested directories': function(fn) {
    var path1 = path.join(process.env.HOME, 'test1/test2/test3');
    var path2 = path.join(process.env.HOME, 'test4/test5/test6');
    mkdirAndParents([path1, path2], function() {
      path.exists(path1, function(exists1) {
        path.exists(path2, function(exists2) {
          assert.ok(exists1);
          assert.ok(exists2);
          var cleanupPath1 = path.join(process.env.HOME, 'test1');
          var cleanupPath2 = path.join(process.env.HOME, 'test4');
          rmdirAndChildren([cleanupPath1, cleanupPath2], function(err) {
            tearDown(fn);
          });
        });
      });
    });
  },
  'remove directories and children': function(fn) {
    var path1 = path.join(process.env.HOME, 'test1/test2/test3');
    var subPath1 = path.join(process.env.HOME, 'test1/test2');
    var subPath2 = path.join(process.env.HOME, 'test1');
    mkdirAndParents(path1, function() {
      rmdirAndChildren(subPath1, function(err) {
        path.exists(path1, function(exists) {
          assert.ok(!exists);
          path.exists(subPath1, function(exists) {
            assert.ok(!exists);
            path.exists(subPath2, function(exists) {
              assert.ok(exists);
              var cleanupPath1 = path.join(process.env.HOME, 'test1');
              rmdirAndChildren(cleanupPath1, function(err) {
                tearDown(fn);
              });
            });
          });
        });
      });
    });
  }
};
