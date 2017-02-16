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
// Set the sunrise timer.
//
//******************************************************************************
function setSunriseTimer (keyObj, date) {
  debug ("setSunriseTimer", keyObj, date);
  console.log ("Setting sunrise trigger for key " + hideKey(keyObj.key) + " at " + date);
  var sunriseTimer = schedule.scheduleJob (date, function(schedKey){

    console.log ("Sunrise for key " + hideKey(schedKey.key) + ". Time now " + new Date() );

    // Fire event.
    var url = "https://maker.ifttt.com/trigger/sunrise/with/key/" + schedKey.key;
    request(url, function (error, response, body) {
      console.log ("IFTTT sunrise response for key " + hideKey(schedKey.key) + ". Time now " + new Date(), body );
      if (response.statusCode == 401) {
        debug ("setSunriseTimer: IFTTT does not recognise key:", schedKey.key);
        db.deleteKeyObj(schedKey.key);
        return;  // Don't create another timer.
      }
    });

    var tomorrow = new Date();
    tomorrow = tomorrow.setDate(date.getDate() + 1);

    var times = SunCalc.getTimes(tomorrow, schedKey.lat, schedKey.long);

    var timer = setSunriseTimer (schedKey, times.sunrise);

    // Find the timer in the array.
    var foundIdx = keys.findIndex(function(obj) {
      return obj.key == schedKey.key;
    });


    if (foundIdx != -1) {
      // Remove existing and cancel timers.
      debug ("Replacing sunrise object for key ", schedKey.key, "with", timer.nextInvocation());
      keys[foundIdx].sunriseTimer = timer;
    } else {
      debug ("setSunriseTimer: Can't find keyObj for key", schedKey.key, keys);
    }

  }.bind(null, keyObj));

  console.log (hideKey(keyObj.key), "Sunrise timer Set " + JSON.stringify(sunriseTimer.nextInvocation()));
  return sunriseTimer;
}

//******************************************************************************
//
// Set the sunset timer.
//
//******************************************************************************
function setSunsetTimer (keyObj, date) {

  console.log ("Setting sunset trigger for key " + hideKey(keyObj.key) + " at " + date);
  var sunsetTimer = schedule.scheduleJob (date, function(schedKey){

    console.log ("Sunset for key " + hideKey(schedKey.key) + ". Time now " + new Date() );

    // Fire event.
    var url = "https://maker.ifttt.com/trigger/sunset/with/key/" + schedKey.key;
    request(url, function (error, response, body) {
      console.log ("IFTTT sunrise response for key" + hideKey(schedKey.key) + ". Time now " + new Date(), body );
      if (response.statusCode == 401) {
        debug ("setSunsetTimer: IFTTT does not recognise key:", schedKey.key);
        db.deleteKeyObj(schedKey.key);
        return;  // Don't create another timer.
      }
    });

    var tomorrow = new Date();
    tomorrow = tomorrow.setDate(date.getDate() + 1);

    var times = SunCalc.getTimes(tomorrow, schedKey.lat, schedKey.long);

    var timer = setSunsetTimer (schedKey, times.sunset);

    // Find the timer in the array.
    var foundIdx = keys.findIndex(function(obj) {
      return obj.key == schedKey.key;
    });

    if (foundIdx != -1) {
      // Remove existing and cancel timers.
      debug ("Replacing sunset object for key", schedKey.key, "with", timer.nextInvocation());
      keys[foundIdx].sunsetTimer = timer;
    } else {
      debug ("setSunsetTimer: Can't find keyObj for key", schedKey.key);
    }



  }.bind(null, keyObj));

  console.log (hideKey(keyObj.key), "Sunset timer Set " + JSON.stringify(sunsetTimer.nextInvocation()));
  return sunsetTimer;
}


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

  var url = "https://maker.ifttt.com/trigger/sunrise/with/key/" + req.params.key;
  debug ("test/sunrise", url);
  request(url, function (error, response, body) {
    debug ("test/sunrise", body);
    var retObj = {};

    try {
      body=JSON.parse(body);
    }
    catch(err) {
      // Do nothing
    }

    if(typeof body =='object')
    {
      retObj = body;
    } else {
      retObj.message = body;
    }
    res.end (JSON.stringify(retObj));
  });

});


//******************************************************************************
//
// Test sunset
//
//******************************************************************************
app.get('/test/sunset/:key', function (req, res) {

  var url = "https://maker.ifttt.com/trigger/sunset/with/key/" + req.params.key;
  debug ("test/sunset", url);
  request(url, function (error, response, body) {
    debug ("test/sunset", body);
    var retObj = {};

    try {
      body=JSON.parse(body);
    }
    catch(err) {
      // Do nothing
    }


    if(typeof body =='object')
    {
      retObj = body;
    } else {
      retObj.message = body;
    }
    res.end (JSON.stringify(retObj));
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
//      console.log(data[i]);
//      data[i].id = hideKey(data[i].id);
//      data[i].key = hideKey(data[i].key);
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
function addKeyTimer (keyObj) {

/*  var keyObj = {};
  keyObj.key = key;
  keyObj.lat = lat;
  keyObj.long = long;*/

  // Does this key already exist?
  var foundIdx = keys.findIndex(function(obj) {
    return obj.key == keyObj.key;
  });

  if (foundIdx != -1) {
    // Remove existing and cancel timers.
    console.log ("Cancelled timers for key:", hideKey(keyObj.key));
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
}

// List the keys from the database and start new timers for each
db.getKeyObjs ( function(data) {
  debug ("Start up keys:", data);

  function handleResp (data) {
    addKeyTimer(data);
  }

  for (var i = 0; i < data.length; i++) {
    db.getWithID (data[i].key, handleResp);
  }
});

// get the app environment from Cloud Foundry
var appEnv = cfenv.getAppEnv();

// start server on the specified port and binding host
app.listen(appEnv.port, '0.0.0.0', function() {
  // print a message when the server starts listening
  console.log("IFTTT Sun Times starting on " + appEnv.url);
});

//app.set('port', appEnv.port);
//console.log(app.get('port'));
module.exports = app; // for testing


/*
var obj = {};
obj.key="TEST";
obj.lat=51
obj.long=-2
obj.loc="Winchester"
add(obj, function (ret) {
  console.log ("***ADD", ret);
});
*/



// *********
// Test block
// *********


/*

// Testing that a key object will go into the database correctly.
var keyObj = {};
keyObj.key = "KEY-TIMER-TEST";
keyObj.lat = "51";
keyObj.long = "0";
keyObj.loc = "Somewhere, someplace, UK";
addKeyTimer (keyObj);
addKeyObj (keyObj, function(){
  getKeyObjs(function(data){
    console.log (JSON.stringify(data));
  })
});

*/

/*

var keyObj = {
  "key" : "KEY123",
  "lat" : "51.233738",
  "long" : "-0.558809"
};


addKeyTimer (keyObj.key, keyObj.lat, keyObj.long);
console.log(JSON.stringify(keys));
keyObj.lat = "22";
keyObj.long = "11";
addKeyTimer (keyObj.key, keyObj.lat, keyObj.long);
console.log(JSON.stringify(keys));
*/


/*
// Test the timers fire correctly

var keyObj = {
  "key" : "KEY123",
  "lat" : "51.233738",
  "long" : "-0.558809"
};



var times = new Date();
times.setTime(times.getTime() + 1000 * 30);

keyObj.sunriseTimer = setSunriseTimer (keyObj, times);
keyObj.sunsetTimer = setSunsetTimer (keyObj,times);
keys.push(keyObj);
*/


/*
addKeyObj (keyObj, function(){
  getKeyObjs(function(data){
    console.log (JSON.stringify(data));
  })
});

*/




/*
//    addKey ("KEY1","51.233738","-0.558809");
//    evaluate (0);


    var key = {
      "key" : "KEY-TIMER-TEST",
      "lat" : "51.233738",
      "long" : "-0.558809"
    };

//    var times = SunCalc.getTimes(new Date(), key.lat, key.long);
//    setSunriseTimer (key, times.sunrise);



  // TODO   Add function needs to check if today's sunrise/set is in the past
  // and if so work out the times for tomorrow.

    var times = new Date();
    times.setTime(times.getTime() + 1000 * 60);

    setSunriseTimer (key, times);
    setSunsetTimer (key,times);

    console.log (JSON.stringify(schedule.scheduledJobs));
*/

// **********
//  END Test block
// **********
