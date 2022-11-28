var caf_core = require('caf_core');
var json_rpc = caf_core.caf_transport.json_rpc;
var myUtils = caf_core.caf_components.myUtils;
var async = caf_core.async;
var cli = caf_core.caf_cli;
var accounts = require('./accounts/main.js');
var hello = require('./helloSecurity/main.js');

var app = hello;

var HOST_AUTH='root-accounts.localtest.me';
var PORT_AUTH=3001;
var HOST='root-hello.localtest.me';
var PORT=3000;

var srpClient = require('../index.js').client;

var options = { from : 'foo-ca1', ca : 'foo-ca1', unrestrictedToken : true,
                password : 'pleasechange',
                log: function(x) { console.error(x);},
                accountsURL : 'http://root-accounts.localtest.me:3001',
                securityClient: srpClient
              };

var badOptions = { from : 'foo-ca1', ca : 'foo-ca1', unrestrictedToken : true,
                   password : 'badpassword',
                   log: function(x) { console.error(x);},
                   accountsURL : 'http://root-accounts.localtest.me:3001',
                   securityClient: srpClient
              };

process.on('uncaughtException', function (err) {
               console.log("Uncaught Exception: " + err);
               console.log(myUtils.errToPrettyStr(err));
               process.exit(1);

});

module.exports = {
    setUp: function (cb) {
        var self = this;
        async.series([
                         function(cb1) {
                             app.load(null, {name: 'top'}, 'framework.json',
                                      null,
                                      function(err, $) {
                                          if (err) {
                                              console.log('setUP Error' + err);
                                              cb1(err);
                                          } else {
                                              self.$ = $;
                                              cb1(err, $);
                                          }
                                      });
                         },
                         function(cb1) {
                             accounts.load(null, {name: 'top'},
                                           'framework.json', null,
                                           function(err, $) {
                                               if (err) {
                                                   console.log('setUP AcError' +
                                                               err);
                                                   cb1(err);
                                               } else {
                                                   self.acc$ = $;
                                                   cb1(err, $);
                                               }
                                           });
                         }
                     ], function(err, data) {
                         cb(err, data);
                     });
    },
    tearDown: function (cb) {
        var self = this;
        if (!this.$) {
            cb(null);
        } else {
            async.series([
                             function(cb1) {
                                 self.$.top.__ca_graceful_shutdown__(null, cb1);
                             },
                             function(cb1) {
                                 self.acc$.top.__ca_graceful_shutdown__(null,
                                                                        cb1);
                             }
                         ], cb);
        }
    },
    hello: function(test) {
        var self = this;
        test.expect(4);
        var s;
        async.waterfall(
            [
                function(cb) {
                    s = new cli.Session('http://root-helloworld.localtest.me:3000',
                                        null, options);
                    s.onopen = function() {
                        s.getState(cb);
                    };
                    s.onclose = function(err) {
                        if (err) {
                            console.log(err);
                        }
                        test.ok(!err);
                    };
                },
                function(res, cb) {
                    test.equals(typeof res, 'number');
                    s.onclose = function(err) {
                        test.ok(!err);
                        test.ok(s.isClosed());
                        cb(null, null);
                    };
                    s.close();
                }
            ], function(err, res) {
                test.ifError(err);
                test.done();
            });
    },
    helloBadPassword: function(test) {
        var self = this;
        test.expect(3);
        var s;
        async.waterfall(
            [
                function(cb) {
                    s = new cli.Session('http://root-helloworld.localtest.me:3000',
                                        null, badOptions);
                    s.onopen = function() {
                        var cb1 = function(err, data) {
                            // never called, error in `onclose`
                            test.ok(false);
                        };
                        s.getState(cb1);
                    };
                    s.onclose = function(err) {
                        test.ok(err);
                        test.ok(s.isClosed());
                        console.log(err);
                        cb(null, null);
                    };
                }
            ], function(err, res) {
                test.ifError(err);
                test.done();
            });
    }

};
