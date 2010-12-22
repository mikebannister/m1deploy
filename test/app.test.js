var common = require('./common'),
    AppManager = require('app-manager').AppManager;

var testConfigs = [
  {
    name: 'test1',
    repository: 'http://repo1'
  },
  {
    name: 'test2',
    repository: 'http://repo2'
  },
  {
    name: 'test3',
    repository: 'http://repo3'
  }
];

var tearDown = function(fn) {
  destroyFakeFilesystem(fn);
};

module.exports = {
  setup: function(fn) {
    buildFakeFilesystem(fn);
  },
  'init from config': function(fn) {
    var testConfig = testConfigs[0];
    // get things started
    var app = new App('mike', testConfig);
    assert.ok(app instanceof App);
    assert.eql(typeof app.stamp, 'number');
    assert.eql(typeof app.date, 'string');
    assert.eql(app.user, 'mike');
    assert.eql(app.name, testConfig.name);
    assert.eql(app.repository, testConfig.repository);
    // stop the app manager
    tearDown(fn);
  },
  
  'init multiple from config': function(fn) {
    // get things started
    var apps = new App.factory('mike', testConfigs);
    //console.log(apps);
    for (var i = 0; i < testConfigs.length; i++) {
      var testConfig = testConfigs[i];
      var app = apps[i];
      assert.ok(app instanceof App);
      assert.eql(typeof app.stamp, 'number');
      assert.eql(typeof app.date, 'string');
      assert.eql(app.user, 'mike');
      assert.eql(app.name, testConfig.name);
      assert.eql(app.repository, testConfig.repository);
    }
    // stop the app manager
    tearDown(fn);
  }
};
