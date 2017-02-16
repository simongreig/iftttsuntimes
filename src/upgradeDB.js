'use strict';

console.log ("upgradeDB.js Running in NODE_ENV=" + process.env.NODE_ENV);

var debug = require('debug')('upgrade');
var db = require ('./suntimes-db');

// COMMETING OUT INCASE RUN ACCIDENTALLY

/*

// List the keys from the database and start new timers for each
db.getKeyObjs ( function(data) {
  debug ("Start up keys:", data)
  for (var i = 0; i < data.length; i++) {
    var workKey = data[i].key
    db.getRaw (data[i].key, function (keyObj) {
      debug ("Work object:",keyObj);

      db.addKeyObj (keyObj, function (addresp) {
        debug ("Added new:", addresp);
      });
    });
  }
});

*/
