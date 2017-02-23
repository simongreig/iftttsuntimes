'use strict';

console.log ("suntimes.js Running in NODE_ENV=" + process.env.NODE_ENV);

var request = require('request');
var SunCalc = require('suncalc');
var geocoder = require('geocoder');
var schedule = require('node-schedule');
var express = require('express');
var cfenv = require('cfenv');
var helmet = require('helmet');
var debug = require('debug')('suntimes');
var db = require ('./suntimes-db');


var app = express();
app.use (helmet());


// serve the files out of ./public as our main files
app.use(express.static(__dirname + '/public'));


var keys = [];
exports.keys = keys; // for testing.  TODO need to make this way better

//******************************************************************************
//
// Partially obfuscate keys.  Only do it for the first 6 chars if the key
// is longer than 10.  Less than 10 implies it is test data.
//
//******************************************************************************
function hideKey (key) {
  var hiddenKey = key ;
  if (hiddenKey.length >= 10) {
    hiddenKey = "******" + key.substring(5, key.length);
  }
  return hiddenKey;
}

//******************************************************************************
//
// Add a key object to the database and the timer list
// Callback(data)
//
//******************************************************************************
var add = function (obj, callback) {

  debug ("add entered:", obj);
  db.addKeyObj (obj, function(dbData){
    debug ("add:", dbData);

    // Data returned the DB summary, now need to get the full record.
    db.getWithID (dbData.id, function(keyObj) {
      addKeyTimer (keyObj);
      debug ("add returned:", keyObj);
      callback (keyObj);
    });

  });

};

//******************************************************************************
//
// Calls the IFTTT maker API.  Uses: callback (key, statusCode, body)
//
//******************************************************************************
var callIFTTT = function (eventName, key, callback) {
  var url = "https://maker.ifttt.com/trigger/" + eventName + "/with/key/" + key;
  request(url, function (error, response, body) {
    debug ("iftttCall:", eventName, " response", response.statusCode, "for key", key, ". Time now " + new Date(),". Body:", body );

    var retObj = {};

    try {
      body=JSON.parse(body);
    }
    catch(err) {
      // Do nothing
    }

    if(typeof body == 'object')
    {
      retObj = body;
    } else {
      retObj.message = body;
    }
    callback (key, response.statusCode, retObj);
  });
};
exports.callIFTTT = callIFTTT;

//******************************************************************************
//
// Find the index of the keyObj in the array.  Returns -1 if not found.
//
//******************************************************************************
var findKeyIndex = function (key) {
  return keys.findIndex(function(obj) {
    return obj.key == key;
  });
};
exports.findKeyIndex = findKeyIndex;

//******************************************************************************
//
// Fires the event with IFTTT and handles errors on the way back.
//
//******************************************************************************
var fireEvent = function (eventName, key) {
  callIFTTT (eventName, key, function(respKey, statusCode, retObj) {
    debug ("fireEvent: IFTTT " + eventName + " response for key " + key + ". Time now " + new Date(), retObj );
    if (statusCode == 401) {
      debug ("fireEvent: IFTTT does not recognise key:", respKey);
      db.deleteKeyObj(respKey, function(data){});

      // Delete the key from the key list for belt and braces.
      var foundIdx = findKeyIndex (respKey);
      if (foundIdx != -1) {
        keys.splice (foundIdx, 1);
      }
      return;  // Don't create another timer.
    }
  });
};


//******************************************************************************
//
// Set a timer.
//
//******************************************************************************
var setTimer = function (eventName, keyObj, date) {

    debug ("setTimer: Setting " + eventName + " trigger for key " + keyObj.key + " at " + date);
    var newTimer = schedule.scheduleJob (date, function(schedKeyObj, schedEvent){

      debug ("setTimer:", schedEvent + " for key " + schedKeyObj.key + ". Time now " + new Date() );

      // Fire event.
      fireEvent (schedEvent, schedKeyObj.key);

      // Work out tomorrow's times and set a new timer.

      var tomorrow = new Date();
      tomorrow = tomorrow.setDate(date.getDate() + 1);

      var times = SunCalc.getTimes(tomorrow, schedKeyObj.lat, schedKeyObj.long);

      var relevantTime;
      if (schedEvent == "sunset") {
        relevantTime = times.sunset;
      } else if (schedEvent == "sunrise") {
        relevantTime = times.sunrise;
      } else {
        relevantTime = null;
      }

      // Not sure if passed by reference or by copy but lets try by refercne
      if (relevantTime) {
        var timerToUpdate = setTimer (schedEvent, schedKeyObj, relevantTime);
        if (schedEvent == "sunrise") {
          schedKeyObj.sunriseTimer = timerToUpdate;
        } else if (schedEvent == "sunset") {
          schedKeyObj.sunsetTimer = timerToUpdate;
        }
      } else {
        debug ("setTimer: Unexpected null timer for", schedEvent, schedKeyObj.key);
      }

    }.bind(null, keyObj, eventName));

    debug ("setTimer:", keyObj.key, eventName, "timer Set " + JSON.stringify(newTimer.nextInvocation()));
    return newTimer;
};
exports.setTimer = setTimer;



//******************************************************************************
//
// Set the sunrise timer.
//
//******************************************************************************
var setSunriseTimer = function (keyObj, date) {
  return setTimer ("sunrise", keyObj, date);
};
exports.setSunriseTimer = setSunriseTimer;





//******************************************************************************
//
// Set the sunset timer.
//
//******************************************************************************
var setSunsetTimer = function (keyObj, date) {
  return setTimer ("sunset", keyObj, date);
};
exports.setSunsetTimer = setSunsetTimer;


//******************************************************************************
//
// This route adds a key to the list based on a key, lat and long in the
// REST URL.
//
// Returns: The list of keys.
//
//******************************************************************************
app.get('/add/:key/:lat/:long', function (req, res) {

  var keyObj = {};
  keyObj.key = req.params.key;
  keyObj.lat = req.params.lat;
  keyObj.long = req.params.long;

  add (keyObj, function(data){
    res.send(data);
  });

});

//******************************************************************************
//
// This route adds a key to the list based on a key and postcode in the
// REST URL.
//
// Returns: The added object
//
//******************************************************************************
app.get('/add/:key/:postcode', function (req, res) {

//  addKey (req.params.key,req.params.lat,req.params.long);

  geocoder.geocode(req.params.postcode, function ( err, data ) {
    // do something with data
//    res.end(JSON.stringify(data));

    debug ("geocoder.geocode", req.params.postcode, err, data);

    if (data.results.length > 0 ) {
      var keyObj = {};
      keyObj.key = req.params.key;
      keyObj.lat = data.results[0].geometry.location.lat;
      keyObj.long = data.results[0].geometry.location.lng;
      keyObj.loc = data.results[0].formatted_address;

      add (keyObj, function(data){
        res.send(data);
      });

    } else {
      res.status(404).send (data);
    }
  });
});


//******************************************************************************
//
// Test sunrise
//
//******************************************************************************
app.get('/test/sunrise/:key', function (req, res) {

  callIFTTT ("sunrise", req.params.key, function (key, statusCode, body) {
    res.status(statusCode).send (body);
  });

});


//******************************************************************************
//
// Test sunset
//
//******************************************************************************
app.get('/test/sunset/:key', function (req, res) {

  callIFTTT ("sunset", req.params.key, function (key, statusCode, body) {
    res.status(statusCode).send (body);
  });

});




//******************************************************************************
//
// This route geocodes a postcode and returns a lat long
//
// Returns: The geocode results
//
//******************************************************************************
app.get('/geocode/:postcode', function (req, res) {


  geocoder.geocode(req.params.postcode, function ( err, data ) {
    // do something with data
    res.send(data);
  });

});


//******************************************************************************
//
// This route list the keys in the list.
//
// Returns: The list of keys.
//
//******************************************************************************
app.get('/list', function (req, res) {
  db.getKeyObjs(function(data){
    var keyList = [];
    for (var i=0;i<data.length;i++) {
      keyList.push (hideKey(data[i].id));
    }
    debug ("/list", keyList);
    res.send (keyList);
  });
});

//******************************************************************************
//
// This route list the keys in the list.
//
// Returns: The list of keys.
//
//******************************************************************************
app.get('/remove/:key', function (req, res) {
  db.deleteKeyObj(req.params.key, function (data) {
    debug ("/remove/", req.params.key, "deleteKeyObj:", data);
    if (data.statusCode ) {
      res.status(data.statusCode).send (data.error);
    } else {
      res.send (data);
    }
  });
});


//******************************************************************************
//
// This route gets the details of the specific key in the list
//
// Returns: The details of the specific key
//
//******************************************************************************
app.get('/key/:key', function (req, res) {
/*  for (var i = 0; i < keys.length; i++) {
    if (keys[i].key == req.params.key)
    {
      res.end(JSON.stringify(keys[i]));
    }
  }
  var error = {};
  error.error = "Key not found";
  res.end(JSON.stringify(error));

*/

  db.getWithKey ( req.params.key, function (data) {
    res.send (data);
  });
});


//******************************************************************************
//
// This route gets the details timers
//
// Returns: The details of the timers
//
//******************************************************************************
app.get('/timers/:key', function (req, res) {

  var picked = keys.filter(function(obj) {
    return obj.key == req.params.key;
  });

  debug ("/timers/" + req.params.key, picked);

  var obj = {};
  if (picked.length > 0 ) {
    obj.key = req.params.key;
    obj.sunrise = picked[0].sunriseTimer.nextInvocation();
    obj.sunset = picked[0].sunsetTimer.nextInvocation();
    obj.lat = picked[0].lat;
    obj.long = picked[0].long;
    obj.loc = picked[0].loc;
  } else {
    obj.error = "Key not found";
    obj.key = req.params.key;
    debug ("/timers/" + req.params.key, obj);
  }


  res.send (obj);

});


//******************************************************************************
//
// This route gets the list of locations in the database
//
// Returns: The list of locations
//
//******************************************************************************
app.get('/map', function (req, res) {

  db.getKeyObjs ( function(data) {
    debug ("/map getKeyObjs:", data);
    var retObj = [];

    function handleResp (keyObj) {
      // addKeyTimer(data);
      var locObj = {} ;
      locObj.lat = keyObj.lat;
      locObj.long = keyObj.long;
      locObj.loc = keyObj.loc;
      retObj.push (locObj);
      debug ("/map: Received", retObj.length, "Waiting for", data.length);
      if (retObj.length == data.length) {
        res.end (JSON.stringify(retObj));
      }
    }

    for (var i = 0; i < data.length; i++) {
      db.getWithID (data[i].key, handleResp);
    }
  });
});




//******************************************************************************
//
// Add Key to the master list.
//
//******************************************************************************
var addKeyTimer = function (keyObj) {

/*  var keyObj = {};
  keyObj.key = key;
  keyObj.lat = lat;
  keyObj.long = long;*/

  // Does this key already exist?
  var foundIdx = findKeyIndex (keyObj.key);

  if (foundIdx != -1) {
    // Remove existing and cancel timers.
    debug ("Cancelled timers for key:", keyObj.key);
    keys[foundIdx].sunriseTimer.cancel();
    keys[foundIdx].sunsetTimer.cancel();
    keys.splice (foundIdx, 1);
  }

  // Find out if today's sunrise and set have already happened.
  var now = new Date ();
  var times = SunCalc.getTimes(now, keyObj.lat, keyObj.long);

  var tomorrow = new Date();
  tomorrow = tomorrow.setDate(now.getDate() + 1);

  // Sunrise
  if (now > times.sunrise)
  {
    // Today's sunrise has aldready happened so find out tomorrow's
    times = SunCalc.getTimes(tomorrow, keyObj.lat, keyObj.long);
  }

  keyObj.sunriseTimer = setSunriseTimer (keyObj, times.sunrise);

  // Sunset
  times = SunCalc.getTimes(now, keyObj.lat, keyObj.long);
  if (now > times.sunset)
  {
    // Today's sunset has already happened so find out tomorrow's
    times = SunCalc.getTimes(tomorrow, keyObj.lat, keyObj.long);
  }

  keyObj.sunsetTimer = setSunsetTimer (keyObj, times.sunset);

  keys.push(keyObj);

  return keyObj;
};
exports.addKeyTimer = addKeyTimer;

//******************************************************************************
//
// List the keys from the database and start new timers for each
//
//******************************************************************************
var initTimers = function () {
  db.getKeyObjs ( function(data) {
    debug ("Start up keys:", data);

    function handleResp (data) {
      addKeyTimer(data);
    }

    for (var i = 0; i < data.length; i++) {
      db.getWithID (data[i].key, handleResp);
    }
  });
};

// Initialise the timers upon start up.
initTimers();

// get the app environment from Cloud Foundry
var appEnv = cfenv.getAppEnv();

// start server on the specified port and binding host
app.listen(appEnv.port, '0.0.0.0', function() {
  // print a message when the server starts listening
  console.log("IFTTT Sun Times starting on " + appEnv.url);
});
