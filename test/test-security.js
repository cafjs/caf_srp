
var caf_comp = require('caf_components');
var async = caf_comp.async;
var myUtils = caf_comp.myUtils;
var fs = require('fs');
var path = require('path');
var caf_security = require('caf_security');
var tokens = caf_security.tokens;
var srp = require('../index.js');
var srpClient = srp.client;
var srpServer = srp.server;

var hello = require('./hello/main.js');
var app = hello;

var HOST='localhost';
var PORT=3000;
var privKey1 = fs.readFileSync(path.resolve(__dirname,
                                            'hello/dummy1PrivKey.key'));
var privKey2 = fs.readFileSync(path.resolve(__dirname,
                                            'hello/dummy2PrivKey.key'));

var pubKey1 = fs.readFileSync(path.resolve(__dirname,
                                            'hello/dummy1PubKey.pem'));
var pubKey2 = fs.readFileSync(path.resolve(__dirname,
                                            'hello/dummy2SelfSigned.pem'));


var APP_PUBLISHER_1='someone1';
var APP_LOCAL_NAME_1='fooApp1';
var CA_OWNER_1='other1';
var CA_LOCAL_NAME_1='bar1';
var FROM_1 =  CA_OWNER_1 + '-' + CA_LOCAL_NAME_1;

var APP_PUBLISHER_2='someone2';
var APP_LOCAL_NAME_2='fooApp2';
var CA_OWNER_2='other2';
var CA_LOCAL_NAME_2='bar2';
var FROM_2 =  CA_OWNER_2 + '-' + CA_LOCAL_NAME_2;

var BAD_APP_PUBLISHER = 'some$one';

var APP_PUBLISHER_PUB_1 = "F1CD0B760DCEE7DE770249F4512A9D0A";
var APP_PUBLISHER_PUB_NAME_1 = "myApp";

var PASSWD1 = 'foo';
var PASSWD2 = 'bar';

process.on('uncaughtException', function (err) {
               console.log("Uncaught Exception: " + err);
               console.log(myUtils.errToPrettyStr(err));
               process.exit(1);

});

module.exports = {
    setUp: function (cb) {
       var self = this;
        app.init( {name: 'top'}, 'framework.json', null,
                      function(err, $) {
                          if (err) {
                              console.log('setUP Error' + err);
                              console.log('setUP Error $' + $);
                              // ignore errors here, check in method
                              cb(null);
                          } else {
                              self.$ = $;
                              cb(err, $);
                          }
                      });
    },

    tearDown: function (cb) {
        var self = this;
        if (!this.$) {
            cb(null);
        } else {
            this.$.top.__ca_graceful_shutdown__(null, cb);
        }
    },
    srp: function(test) {
        var self = this;
        test.expect(7);
        var p1 = tokens.newPayload(APP_PUBLISHER_PUB_1,
                                   APP_PUBLISHER_PUB_NAME_1,
                                   CA_OWNER_1, CA_LOCAL_NAME_1, 100000);
        var p2 = tokens.newPayload(null, null, CA_OWNER_1, null, 100000);

        var p1Bad = tokens.newPayload(APP_PUBLISHER_PUB_1,
                                      APP_PUBLISHER_PUB_NAME_1,
                                      CA_OWNER_2, CA_LOCAL_NAME_1, 100000);
        var transmit = function(x) {
            return JSON.parse(JSON.stringify(x));
        };

        // create account
        var client = srpClient.clientInstance(CA_OWNER_1, PASSWD1);
        var accounts = {};
        var server = srpServer.serverInstance(accounts, privKey1, pubKey1);
        var newAcc = client.newAccount();
        server.newAccount(transmit(newAcc));
        test.ok(accounts[CA_OWNER_1]);
        // duplicate
        test.throws(function() {  server.newAccount(transmit(newAcc));});

        // get token
        var user = client.hello();
        var helloReply = transmit(server.hello(transmit(user)));
        var loginReply = transmit(client.login(helloReply));
        var tokenReply = transmit(server.newToken(loginReply, p1));
        test.throws(function() {server.newToken(loginReply, p1Bad);});

        var tokenStr = client.newToken(tokenReply, p1);
        console.log(tokenStr);
        var tok = tokens.validate(tokenStr, pubKey1);
        test.ok(tokens.similar(tok, p1, true));
        test.throws(function() {client.newToken(tokenReply, p2);});

        // bad password
        client = srpClient.clientInstance(CA_OWNER_1, PASSWD2);
        user = client.hello();
        helloReply = server.hello(user);
        loginReply = client.login(helloReply);
        test.throws(function() { server.newToken(loginReply, p1); });

        // bad username
        client = srpClient.clientInstance(CA_OWNER_2, PASSWD1);
        user = client.hello();
        test.throws(function() { server.hello(user);});

        test.done();


    }
};
