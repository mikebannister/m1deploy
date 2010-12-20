var common = require('./common'),
    App = require('app').App,
    AppManager = require('app-manager').AppManager;

module.exports = {
  setup: function(fn) {
    resetFakeFilesystem();
    fn();
  },

  'fires lifecycle events when new apps are discovered': function(fn) {
    
    // get things started
    var appManager = new AppManager(null);

    // spy on all emitted events
    sinon.spy(appManager, 'emit');
    
    // specify the order of expected events
    var expectedEvents = [
      'newListener',
      'add',
      'add',
      'add',
      'add',
      'add',
      'fetchComplete',
      'prepareComplete',
      'prepareComplete',
      'prepareComplete',
      'prepareComplete',
      'prepareComplete',
      'prepareQueueComplete',
    ];
    
    // the prepare queue has finished, time to see what happened
    appManager.on('prepareQueueComplete', function(app) {
      // stop the app manager
      appManager.scheduler.stop();
      // check actual events against expected events
      appManager.emit.args.forEach(function(arg) {
        var expectedEventName = expectedEvents.shift();
        var actualEventName = arg[0];
        assert.eql(expectedEventName, actualEventName);
        if (actualEventName === 'add' || actualEventName === 'prepareComplete') {
          var actualEventFirstArgument = arg[1];
          // make sure these events are also returning an App instance
          assert.ok(actualEventFirstArgument instanceof App);
        }
      });
      fn();
    });
  },
};
