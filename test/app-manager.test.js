//TODO--tests for when things go wrong

var common = require('./common'),
    path = require('path'),
    App = require('app').App,
    LocalDeployment = require('deploy-recipes').LocalDeployment,
    AppManager = require('app-manager').AppManager,
    Scheduler = require('scheduler').Scheduler,
    fakeTimers = require('sinon/util/fake_timers');

var tearDown = function(fn) {
  destroyFakeFilesystem(fn);
};

module.exports = {
  setup: function(fn) {
    initMockAppObjects();
    buildFakeFilesystem(fn);
  },
  'fires lifecycle events when new apps are discovered': function(fn) {
    // get things started
    var appManager = new AppManager();
  
    // spy on all emitted events
    sinon.spy(appManager, 'emit');
  
    // specify the order of expected events
    var expectedEvents = [
      'newListener',
      'configAdd', 'prepareComplete', 'verifyComplete', 'activateComplete', 
      'configAdd', 'prepareComplete', 'verifyComplete', 'activateComplete', 
      'configAdd', 'prepareComplete', 'verifyComplete', 'activateComplete', 
      'configAdd', 'prepareComplete', 'verifyComplete', 'activateComplete', 
      'configAdd', 'prepareComplete', 'verifyComplete', 'activateComplete', 
      'configAdd', 'prepareComplete', 'verifyComplete', 'activateComplete', 
      'configAdd', 'prepareComplete', 'verifyComplete', 'activateComplete',
    ];
    
    // these events require an app instance argument
    var eventsRequireAppInstanceArgument = [
      'configAdd', 
      'prepareComplete', 
      'verifyComplete', 
      'activateComplete'
    ];
  
    var count = 0;
    appManager.on('activateComplete', function(app) {
      if (count >= 6) {
        appManager.scheduler.stop();
        assert.eql(App.prototype.prepare.callCount, 7);
        assert.eql(App.prototype.verify.callCount, 7);
        assert.eql(App.prototype.activate.callCount, 7);
        for (var i = 0; i < expectedEvents.length; i++) {
          var expectedEventName = expectedEvents[i];
          var actualEventName = appManager.emit.args[i][0];
          assert.eql(expectedEventName, actualEventName, "a '" + expectedEventName + "' event was expected but a '" + actualEventName + "' was fired");
          // make sure certain events return an App instance
          var actualEventFirstArgument = appManager.emit.args[i][1];
          if (_(eventsRequireAppInstanceArgument).include(actualEventName)) {
            assert.ok(actualEventFirstArgument instanceof App, "expected an instance of App but received a '" + (typeof actualEventFirstArgument) + "' instead");
          } else {
            // for completeness make sure that other events don't return an App instance
            assert.ok(!(actualEventFirstArgument instanceof App), 'the event argument should not be an instance of App');
          }
        }
        tearDown(fn);
      }
      count++;
    });
  },
  'fires lifecycle events when an app repository url is changed': function(fn) {
    // get things started
    var appManager = new AppManager();
    
    // spy on all emitted events
    sinon.spy(appManager, 'emit');
    
    // specify the order of expected events
    var expectedEvents = [
      'newListener',
      'configUpdate',
      'prepareComplete', 'verifyComplete', 'activateComplete'
    ];
    
    // these events require an app instance argument
    var eventsRequireAppInstanceArgument = [
      'configUpdate', 
      'prepareComplete', 
      'verifyComplete', 
      'activateComplete'
    ];
    
    var count = 0;
    appManager.on('activateComplete', function(app) {
      if (count >= 6) {
        appManager.removeAllListeners('activateComplete');
        assert.eql(App.prototype.prepare.callCount, 7);
        assert.eql(App.prototype.verify.callCount, 7);
        assert.eql(App.prototype.activate.callCount, 7);
        var clock = fakeTimers.useFakeTimers();
        // simulate the conf file changing
        var rebeccaConfPath = path.join(path.dirname(process.env.HOME), 'rebecca', '.m1deploy.cfg');
        jsonFile2Obj(rebeccaConfPath, function(err, rebeccaConf) {
          if (err) throw err;
          rebeccaConf[0].repository = 'https://github.com/m1deploy/yngwieApp.git';
          obj2JsonFile(rebeccaConf, rebeccaConfPath, function(err) {
            if (err) throw err;
            // fast forward to 5 seconds from now
            clock.tick(5000);
            appManager.on('activateComplete', function(app) {
              // stop the app manager
              appManager.scheduler.stop();
  
              // fast forwad because we don't care what happened before the configUpdate event fired
              var fastFowardPoint = 29;
              // check actual events against expected events
              for (var i = 0; i < expectedEvents.length; i++) {
                var expectedEventName = expectedEvents[i];
                var actualEventName = appManager.emit.args[i+fastFowardPoint][0];
                assert.eql(expectedEventName, actualEventName, "a '" + expectedEventName + "' event was expected but a '" + actualEventName + "' was fired");
                // make sure certain events return an App instance
                var actualEventFirstArgument = appManager.emit.args[i+fastFowardPoint][1];
                if (_(eventsRequireAppInstanceArgument).include(actualEventName)) {
                  assert.ok(actualEventFirstArgument instanceof App, "expected an instance of App but received a '" + (typeof actualEventFirstArgument) + "' instead");
                } else {
                  // for completeness make sure that other events don't return an App instance
                  assert.ok(!(actualEventFirstArgument instanceof App), 'the event argument should not be an instance of App');
                }
              }
              // cleanup
              tearDown(function() {
                clock.restore();
                fn();
              });
            });
          });
        });
      }
      count++;
    });
  },
  'fires lifecycle events when a config is deleted': function(fn) {
    // get things started
    var appManager = new AppManager();
    
    // spy on all emitted events
    sinon.spy(appManager, 'emit');
    
    // specify the order of expected events
    var expectedEvents = [
      'newListener',
      'configRemove'
    ];
    
    // these events require an app instance argument
    var eventsRequireAppInstanceArgument = [
      'configRemove', 
      'prepareComplete', 
      'verifyComplete', 
      'activateComplete'
    ];
    
    var count = 0;
    appManager.on('activateComplete', function(app) {
      if (count >= 6) {
        appManager.removeAllListeners('activateComplete');
        var clock = fakeTimers.useFakeTimers();
        var yngwieConfPath = path.join(path.dirname(process.env.HOME), 'yngwie', '.m1deploy.cfg');
        rmdirAndChildren(yngwieConfPath, function() {
          clock.tick(5000);
          appManager.on('configRemove', function(app) {
            assert.eql(App.prototype.prepare.callCount, 7);
            assert.eql(App.prototype.verify.callCount, 7);
            assert.eql(App.prototype.activate.callCount, 7);
            // stop the app manager
            appManager.scheduler.stop();
            // fast forwad because we don't care what happened before the configUpdate event fired
            var fastFowardPoint = 29;
            // check actual events against expected events
            for (var i = 0; i < expectedEvents.length; i++) {
              var expectedEventName = expectedEvents[i];
              var actualEventName = appManager.emit.args[i+fastFowardPoint][0];
              assert.eql(expectedEventName, actualEventName, "a '" + expectedEventName + "' event was expected but a '" + actualEventName + "' was fired");
              // make sure certain events return an App instance
              var actualEventFirstArgument = appManager.emit.args[i+fastFowardPoint][1];
              if (_(eventsRequireAppInstanceArgument).include(actualEventName)) {
                assert.ok(actualEventFirstArgument instanceof App, "expected an instance of App but received a '" + (typeof actualEventFirstArgument) + "' instead");
              } else {
                // for completeness make sure that other events don't return an App instance
                assert.ok(!(actualEventFirstArgument instanceof App), 'the event argument should not be an instance of App');
              }
            }
            // cleanup
            tearDown(function() {
              clock.restore();
              fn();
            });
          });
        });
      }
      count++;
    });
  },
  'lookup apps by repository url': function(fn) {
    // get things started
    var appManager = new AppManager();
    
    var count = 0;
    appManager.on('activateComplete', function(app) {
      if (count >= 6) {
        appManager.removeAllListeners('activateComplete');
        // stop the app manager
        appManager.scheduler.stop();
  
        // make sure looked up apps are valid
        assert.eql(appManager.lookupByUrl('https://github.com/mikebannister/m1deploy.git').length, 1);
        assert.eql(appManager.lookupByUrl('https://github.com/mikebannister/m1deploy.git')[0].name, 'm1deploy');
        assert.ok(appManager.lookupByUrl('https://github.com/mikebannister/m1deploy.git')[0] instanceof App);
  
        assert.eql(appManager.lookupByUrl('https://github.com/m1deploy/derridaApp.git').length, 2);
        
        assert.ok(appManager.lookupByUrl('https://github.com/m1deploy/derridaApp.git')[0] instanceof App);
        assert.ok(appManager.lookupByUrl('https://github.com/m1deploy/derridaApp.git')[1] instanceof App);
        assert.eql(appManager.lookupByUrl('https://github.com/m1deploy/derridaApp.git')[0].name, 'derridaApp');
        assert.eql(appManager.lookupByUrl('https://github.com/m1deploy/derridaApp.git')[1].name, 'derridaApp');
        var user1 = appManager.lookupByUrl('https://github.com/m1deploy/derridaApp.git')[0].user;
        assert.ok(user1 === 'derrida' || user1 === 'rebecca');
        var user2 = appManager.lookupByUrl('https://github.com/m1deploy/derridaApp.git')[1].user;
        assert.ok(user1 === 'derrida' || user2 === 'rebecca');
  
        assert.eql(appManager.lookupByUrl('https://github.com/m1deploy/yngwieApp.git').length, 1);
        assert.eql(appManager.lookupByUrl('https://github.com/m1deploy/yngwieApp.git')[0].name, 'yngwieApp');
        assert.eql(appManager.lookupByUrl('https://github.com/m1deploy/yngwieApp.git')[0].user, 'yngwie');
        assert.ok(appManager.lookupByUrl('https://github.com/m1deploy/yngwieApp.git')[0] instanceof App);
  
        assert.eql(appManager.lookupByUrl('https://github.com/m1deploy/mikeApp.git').length, 1);
        assert.eql(appManager.lookupByUrl('https://github.com/m1deploy/mikeApp.git')[0].name, 'mikeApp');
        assert.eql(appManager.lookupByUrl('https://github.com/m1deploy/mikeApp.git')[0].user, 'mike');
        assert.ok(appManager.lookupByUrl('https://github.com/m1deploy/mikeApp.git')[0] instanceof App);
  
        assert.eql(appManager.lookupByUrl('https://github.com/m1deploy/rebeccaApp.git').length, 1);
        assert.eql(appManager.lookupByUrl('https://github.com/m1deploy/rebeccaApp.git')[0].name, 'rebeccaApp');
        assert.eql(appManager.lookupByUrl('https://github.com/m1deploy/rebeccaApp.git')[0].user, 'rebecca');
        assert.ok(appManager.lookupByUrl('https://github.com/m1deploy/rebeccaApp.git')[0] instanceof App);
  
        assert.eql(appManager.lookupByUrl('https://github.com/m1deploy/luluApp.git').length, 1);
        assert.eql(appManager.lookupByUrl('https://github.com/m1deploy/luluApp.git')[0].name, 'luluApp');
        assert.eql(appManager.lookupByUrl('https://github.com/m1deploy/luluApp.git')[0].user, 'lulu');
        assert.ok(appManager.lookupByUrl('https://github.com/m1deploy/luluApp.git')[0] instanceof App);
  
        tearDown(fn);
      }
      count++;
    });
  }
};
