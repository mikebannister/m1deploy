var EventEmitter = require('events').EventEmitter;

var RepositoryListener = exports.RepositoryListener = function(webApp, appManager) {
  var self = this;
  EventEmitter.call(this);
  var handler = function(req, res) {
    console.log(44);
    if (req.body.payload) {
      var payload = JSON.parse(req.body.payload),
          reposUrl = payload.repository.url,
          app = appManager.lookupByUrl(reposUrl);
      if (app) {
        self.emit('commit', app);
      }
    }
    res.send('{"ok": true}');
  };
  webApp.post('/notify/', handler);
};
RepositoryListener.prototype = Object.create(EventEmitter.prototype);
