var common = require('./common'),
    express = require('express'),
    RepositoryListener = require('repository-listener').RepositoryListener,
    AppManager = require('app-manager').AppManager;

var webApp,
    appManager,
    repositoryListener,
    testCommitPayload = 'payload=%7b%22commits%22%3a%5b%7b%22modified%22%3a%5b%22test.txt%22%5d%2c%22author%22%3a%7b%22email%22%3a%22mike%40mike101.net%22%2c%22name%22%3a%22Mike%20Bannister%22%2c%22username%22%3a%22possibilities%22%7d%2c%22timestamp%22%3a%222010-12-17T22%3a47%3a12-08%3a00%22%2c%22url%22%3a%22https%3a%2f%2fgithub.com%2fm1deploy%2fluluApp%2fcommit%2fb7f1ef567024d9f58c99f21eae461df86873bf1f%22%2c%22message%22%3a%22test%20commit%22%2c%22added%22%3a%5b%5d%2c%22removed%22%3a%5b%5d%2c%22id%22%3a%22b7f1ef567024d9f58c99f21eae461df86873bf1f%22%7d%5d%2c%22ref%22%3a%22refs%2fheads%2fmaster%22%2c%22forced%22%3afalse%2c%22compare%22%3a%22https%3a%2f%2fgithub.com%2fm1deploy%2fluluApp%2fcompare%2f4890d22...b7f1ef5%22%2c%22repository%22%3a%7b%22open_issues%22%3a0%2c%22created_at%22%3a%222010%2f12%2f17%2021%3a35%3a41%20-0800%22%2c%22has_issues%22%3atrue%2c%22url%22%3a%22https%3a%2f%2fgithub.com%2fm1deploy%2fluluApp%22%2c%22description%22%3a%22Lulu%27s%20test%20app%20for%20m1deploy%22%2c%22fork%22%3afalse%2c%22has_downloads%22%3atrue%2c%22private%22%3afalse%2c%22pushed_at%22%3a%222010%2f12%2f17%2022%3a47%3a13%20-0800%22%2c%22owner%22%3a%7b%22email%22%3a%22notimpossiblemike%40gmail.com%22%2c%22name%22%3a%22m1deploy%22%7d%2c%22name%22%3a%22luluApp%22%2c%22watchers%22%3a3%2c%22has_wiki%22%3atrue%2c%22forks%22%3a1%2c%22homepage%22%3a%22%22%7d%2c%22before%22%3a%224890d22ebf0e095ddf4e9c7454eb2cd212b47183%22%2c%22pusher%22%3a%7b%22email%22%3a%22mikebannister%40gmail.com%22%2c%22name%22%3a%22mikebannister%22%7d%2c%22after%22%3a%22b7f1ef567024d9f58c99f21eae461df86873bf1f%22%7d';

var tearDown = function(fn) {
  destroyFakeFilesystem(fn);
};

module.exports = {
  setup: function(fn) {
    initMockAppObjects();
    buildFakeFilesystem(fn);
  },
  
  'accepts web requests': function(fn) {
    var webApp = express.createServer();
    var port = 5542;
    var events = [];
    var webAppSocket;
    
    // setup web app
    webApp.use(express.bodyDecoder());
    webApp.use(express.methodOverride());
    
    var appManager = new AppManager();
    var repositoryListener = new RepositoryListener(webApp, appManager);
    
    // routing middleware
    webApp.use(express.router);
    
    // setup template engine
    webApp.set('views', __dirname + '/../lib/views');
    webApp.register('.html', require('ejs'));
    webApp.set('view engine', 'html');
    
    webApp.get('/', function(req, res) {
      res.render('dashboard',{
        locals: {
          events: events,
          port: port
        }
      });
    });
    
    // stop the manager
    appManager.scheduler.stop();
    assert.response(webApp, {
      url: '/notify/',
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'content-length': testCommitPayload.length
      },
      body: testCommitPayload
    },{
      status: 200
    }, function(res) {
      assert.eql(res.body, '{"ok": true}');
      tearDown(fn);
    });
  }
};
