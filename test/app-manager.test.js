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
    buildFakeFilesystem(fn);
  },

  'fires lifecycle events when new apps are discovered': function(fn) {
    // get things started
    var appManager = new AppManager();
  
    // spy on all emitted events
    sinon.spy(appManager, 'emit');
  
    // mock up LocalDeployment mostly because it does messy stuff
    // but we're also going to check to make sure it's members get called
    var LocalDeploymentMock = sinon.mock(LocalDeployment);
    
    var prepareExpectation = LocalDeploymentMock.expects('prepare');
    prepareExpectation.exactly(6);
    prepareExpectation.callsArg(0);
        
    var verifyExpectation = LocalDeploymentMock.expects('verify');
    verifyExpectation.exactly(6);
    verifyExpectation.callsArg(0);
  
    var activateExpectation = LocalDeploymentMock.expects('activate');
    activateExpectation.exactly(6);
    activateExpectation.callsArg(0);
        
    // specify the order of expected events
    var expectedEvents = [
      'newListener',
      'configAdd', 'configAdd', 'configAdd', 
      'configAdd', 'configAdd', 'configAdd',
      'queueReady',
      'prepareComplete', 'prepareComplete', 'prepareComplete', 
      'prepareComplete', 'prepareComplete', 'prepareComplete',
      'prepareQueueComplete',
      'verifyComplete', 'verifyComplete', 'verifyComplete', 
      'verifyComplete', 'verifyComplete', 'verifyComplete',
      'verifyQueueComplete',
      'activateComplete', 'activateComplete', 'activateComplete', 
      'activateComplete', 'activateComplete', 'activateComplete',
      'activateQueueComplete'
    ];
    
    // these events require an app instance argument
    var eventsRequireAppInstanceArgument = [
      'configAdd', 
      'prepareComplete', 
      'verifyComplete', 
      'activateComplete'
    ];
  
    // the prepare queue has finished, time to see what happened
    appManager.on('activateQueueComplete', function(app) {
      // stop the app manager
      appManager.scheduler.stop();
      
      // verify expectations
      LocalDeploymentMock.verify();
      
      // check actual events against expected events
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
      // cleanup
      tearDown(fn);
    });
  },
  'fires lifecycle events when an app repository url is changed': function(fn) {
    // get things started
    var appManager = new AppManager();
    
    // spy on all emitted events
    sinon.spy(appManager, 'emit');
  
    // mock up LocalDeployment mostly because it does messy stuff
    // but we're also going to check to make sure it's members get called
    var LocalDeploymentMock = sinon.mock(LocalDeployment);
    
    var prepareExpectation = LocalDeploymentMock.expects('prepare');
    // once for each config plus one for when the config changes
    prepareExpectation.exactly(7);
    prepareExpectation.callsArg(0);
        
    var verifyExpectation = LocalDeploymentMock.expects('verify');
    // once for each config plus one for when the config changes
    verifyExpectation.exactly(7);
    verifyExpectation.callsArg(0);
    
    var activateExpectation = LocalDeploymentMock.expects('activate');
    // once for each config plus one for when the config changes
    activateExpectation.exactly(7);
    activateExpectation.callsArg(0);
    
    // specify the order of expected events
    var expectedEvents = [
      'newListener',
      'configUpdate',
      'prepareComplete',
      'prepareQueueComplete',
      'verifyComplete',
      'verifyQueueComplete',
      'activateComplete',
      'activateQueueComplete'
    ];
    
    // these events require an app instance argument
    var eventsRequireAppInstanceArgument = [
      'configUpdate', 
      'prepareComplete', 
      'verifyComplete', 
      'activateComplete'
    ];
    
    appManager.on('activateQueueComplete', function(app) {
      appManager.removeAllListeners('activateQueueComplete');
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
          appManager.on('configUpdate', function(app) {
            // stop the app manager
            appManager.scheduler.stop();
            // verify expectations
            LocalDeploymentMock.verify();
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
    });
  },
  'fires lifecycle events when a config is deleted': function(fn) {
    // get things started
    var appManager = new AppManager();
    
    // spy on all emitted events
    sinon.spy(appManager, 'emit');
    // use a fake clock
    var clock = fakeTimers.useFakeTimers();
    
    // mock up LocalDeployment mostly because it does messy stuff
    // but we're also going to check to make sure it's members get called
    var LocalDeploymentMock = sinon.mock(LocalDeployment);
    
    var prepareExpectation = LocalDeploymentMock.expects('prepare');
    // once for each config plus one for when the config changes
    prepareExpectation.exactly(6);
    prepareExpectation.callsArg(0);
        
    var verifyExpectation = LocalDeploymentMock.expects('verify');
    // once for each config plus one for when the config changes
    verifyExpectation.exactly(6);
    verifyExpectation.callsArg(0);
    
    var activateExpectation = LocalDeploymentMock.expects('activate');
    // once for each config plus one for when the config changes
    activateExpectation.exactly(6);
    activateExpectation.callsArg(0);
    
    var prepareExpectation = LocalDeploymentMock.expects('remove');
    prepareExpectation.exactly(1);
  
    appManager.on('activateQueueComplete', function(app) {
      appManager.removeAllListeners('activateQueueComplete');
      // simulate the conf file changing
      var yngwieConfPath = path.join(path.dirname(process.env.HOME), 'yngwie', '.m1deploy.cfg');
      rmdirAndChildren(yngwieConfPath, function() {
        // 5s is the default polling interval
        clock.tick(5000);
        appManager.on('configRemove', function(app) {
          // stop the app manager
          appManager.scheduler.stop();
          // verify expectations
          LocalDeploymentMock.verify();
          // make sure event returned an App instance
          assert.ok(app instanceof App, "expected an instance of App but received a '" + (typeof actualEventFirstArgument) + "' instead");
          // cleanup
          tearDown(function() {
            clock.restore();
            fn();
          });
        });
      });
    });
  },
};
