

var request = require('request');
var SunCalc = require('suncalc');
var geocoder = require('geocoder');
var schedule = require('node-schedule');
const express = require('express');
var cfenv = require('cfenv');
var Cloudant = require('cloudant');
const app = express();

// TODO move these into an environment file.
var credentials = {
  "username": "83652124-65a3-421f-8693-5358fd836b05-bluemix",
  "password": "84a75c81cf6c0217c19ace8478f2355b6c8d392ea355abff76c357251f6ffd20",
  "host": "83652124-65a3-421f-8693-5358fd836b05-bluemix.cloudant.com",
  "port": 443,
  "url": "https://83652124-65a3-421f-8693-5358fd836b05-bluemix:84a75c81cf6c0217c19ace8478f2355b6c8d392ea355abff76c357251f6ffd20@83652124-65a3-421f-8693-5358fd836b05-bluemix.cloudant.com"
}

// Initialize the library with my account.
var cloudant = Cloudant(credentials);

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
// Add a key object to the database.
//
//******************************************************************************
var addKeyObj = function (obj, callback) {
  var db = cloudant.db.use("iftttsuntimes");

  // Try to add the key by first reading it to make sure we don't duplicate.
  db.get(obj.key, function(err, data) {

    var updateData = {};
    if (data) {
      // Row exists so do an update.
      updateData._id = data._id;
      updateData._rev = data._rev;

    } else {
      // No row exists
      updateData._id = obj.key;
    }

    updateData.keyObj = {};
    updateData.keyObj.key = obj.key;
    updateData.keyObj.lat = obj.lat;
    updateData.keyObj.long = obj.long;


    db.insert(updateData, function(err, data) {
      if (err) {
        callback (err);
      } else {
        callback (data);
      }
    });
  });
}

//******************************************************************************
//
// Get all objects.
//
//******************************************************************************
var getKeyObjs = function (callback) {
    var db = cloudant.db.use("iftttsuntimes");
    db.list(function(err, data) {
      if (err) {
        callback (err);
      } else {
        callback ( data.rows );
      }
  });
}

//******************************************************************************
//
// Get details about an object.
//
//******************************************************************************
var getKeyObj = function (key, callback) {
    var db = cloudant.db.use("iftttsuntimes");

    db.get(key, function(err, data) {
      if (!data) {
        callback(err);
      } else {
        callback (data.keyObj);
      }
    });
}

//******************************************************************************
//
// Delete a key object from the database
//
//******************************************************************************
var deleteKeyObj = function (key, callback) {

  var db = cloudant.db.use("iftttsuntimes");

  db.get(key, function(err, data) {

    if (err) {
      callback(err);
    } else {
      db.destroy(data._id, data._rev, function(err, data) {
        // the callback is not in the scope of the destroy function
/*        if (!data) {
          callback(err);
        } else {
          callback (data.keyObj);
        }*/
      });
    }
  });
}


//******************************************************************************
//
// Set the sunrise timer.
//
//******************************************************************************
function setSunriseTimer (key, date) {

  console.log ("Setting sunrise trigger for key " + hideKey(key.key) + " at " + date);
  var sunriseTimer = schedule.scheduleJob (date, function(schedKey){

    console.log ("Sunrise for key " + hideKey(schedKey.key) + "! Time now " + new Date() );

    // Fire event.
    var url = "https://maker.ifttt.com/trigger/sunrise/with/key/" + schedKey.key;
    request(url, function (error, response, body) {
      if (response.statusCode == 401) {
        console.log ("Key does not exist:", schedKey.key);
        deleteKeyObj(schedKey.key);
        return;  // Don't create another timer.
      }
    });

    var tomorrow = new Date();
    tomorrow = tomorrow.setDate(date.getDate() + 1);

    var times = SunCalc.getTimes(tomorrow, schedKey.lat, schedKey.long);

    setSunriseTimer (key, times.sunrise);

  }.bind(null, key));

  console.log ("Sunrise timer Set " + JSON.stringify(sunriseTimer.nextInvocation()));
  return sunriseTimer;
}

//******************************************************************************
//
// Set the sunset timer.
//
//******************************************************************************
function setSunsetTimer (key, date) {

  console.log ("Setting sunset trigger for key " + hideKey(key.key) + " at " + date);
  var sunsetTimer = schedule.scheduleJob (date, function(schedKey){

    console.log ("Sunset for key " + hideKey(schedKey.key) + "! Time now " + new Date() );

    // Fire event.
    var url = "https://maker.ifttt.com/trigger/sunset/with/key/" + schedKey.key;
    request(url, function (error, response, body) {
      if (response.statusCode == 401) {
        console.log ("Key does not exist:", schedKey.key);
        deleteKeyObj(schedKey.key);
        return;  // Don't create another timer.
      }
    });

    var tomorrow = new Date();
    tomorrow = tomorrow.setDate(date.getDate() + 1);

    var times = SunCalc.getTimes(tomorrow, schedKey.lat, schedKey.long);

    setSunsetTimer (key, times.sunset);

  }.bind(null, key));

  console.log ("Sunset timer Set " + JSON.stringify(sunsetTimer.nextInvocation()));
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

  var keyObj = addKeyTimer (req.params.key,req.params.lat,req.params.long);
  addKeyObj (keyObj, function(){
    getKeyObjs(function(data){

      var picked = keys.filter(function(obj) {
        return obj.key == req.params.key;
      });

      res.end (JSON.stringify(picked[0]));
    })
  });
});

//******************************************************************************
//
// This route adds a key to the list based on a key and postcode in the
// REST URL.
//
// Returns: The list of keys.
//
//******************************************************************************
app.get('/add/:key/:postcode', function (req, res) {

//  addKey (req.params.key,req.params.lat,req.params.long);

  geocoder.geocode(req.params.postcode, function ( err, data ) {
    // do something with data
    res.end(JSON.stringify(data));

    var lat = data.results[0].geometry.location.lat;
    var long = data.results[0].geometry.location.lng;

    var keyObj = addKeyTimer (req.params.key,lat,long);
    addKeyObj (keyObj, function(){
      getKeyObjs(function(data){

        var picked = keys.filter(function(obj) {
          return obj.key == req.params.key;
        });

        res.end (JSON.stringify(picked[0]));
      })
    });
  });
});


//******************************************************************************
//
// Test sunrise
//
//******************************************************************************
app.get('/test/sunrise/:key', function (req, res) {

  var url = "https://maker.ifttt.com/trigger/sunrise/with/key/" + req.params.key;
  request(url, function (error, response, body) {
    res.end (body);
  });

});


//******************************************************************************
//
// Test sunset
//
//******************************************************************************
app.get('/test/sunset/:key', function (req, res) {

  var url = "https://maker.ifttt.com/trigger/sunset/with/key/" + req.params.key;
  request(url, function (error, response, body) {
    res.end (body);
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
    res.end(JSON.stringify(data));
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
//  res.end(JSON.stringify(keys));
  getKeyObjs(function(data){
    var keyList = [];
    for (i=0;i<data.length;i++) {
      keyList.push (hideKey(data[i].id));
//      console.log(data[i]);
//      data[i].id = hideKey(data[i].id);
//      data[i].key = hideKey(data[i].key);
    }
    res.end (JSON.stringify(keyList));
  })
});

//******************************************************************************
//
// This route list the keys in the list.
//
// Returns: The list of keys.
//
//******************************************************************************
app.get('/remove/:key', function (req, res) {
//  res.end(JSON.stringify(keys));
  deleteKeyObj(req.params.key, function (data) {
    res.end (JSON.stringify(data));
  })
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

  getKeyObj ( req.params.key, function (data) {
    res.end (JSON.stringify(data));
  })
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

  var obj = {};
  if (picked.length > 0 ) {
    obj.key = req.params.key;
    obj.sunrise = picked[0].sunriseTimer.nextInvocation();
    obj.sunset = picked[0].sunsetTimer.nextInvocation();
  } else {
    obj.error = "Key not found";
    obj.key = req.params.key;
  }


  res.end (JSON.stringify(obj));

});


//******************************************************************************
//
// Add Key to the master list.
//
//******************************************************************************
function addKeyTimer (key, lat, long) {

  var keyObj = {};
  keyObj.key = key;
  keyObj.lat = lat;
  keyObj.long = long;

  // Does this key already exist?
  var foundIdx = keys.findIndex(function(obj) {
    return obj.key == key;
  });

  if (foundIdx != -1) {
    // Remove existing and cancel timers.
    console.log ("Cancelled timers for key:", hideKey(key));
    keys[foundIdx].sunriseTimer.cancel();
    keys[foundIdx].sunsetTimer.cancel();
    keys.splice (foundIdx, 1);
  }

  // Find out if today's sunrise and set have already happened.
  var now = new Date ();
  var times = SunCalc.getTimes(now, lat, long);

  // Sunrise
  if (now > times.sunrise)
  {
    // Today's sunrise has aldready happened so find out tomorrow's
    var tomorrow = new Date();
    tomorrow = tomorrow.setDate(now.getDate() + 1);

    times = SunCalc.getTimes(tomorrow, lat, long);
  }

  keyObj.sunriseTimer = setSunriseTimer (keyObj, times.sunrise);

  // Sunset
  times = SunCalc.getTimes(now, lat, long);
  if (now > times.sunset)
  {
    // Today's sunset has already happened so find out tomorrow's
    var tomorrow = new Date();
    tomorrow = tomorrow.setDate(now.getDate() + 1);

    times = SunCalc.getTimes(tomorrow, lat, long);
  }

  keyObj.sunsetTimer = setSunsetTimer (keyObj, times.sunset);

  keys.push(keyObj);

  return keyObj;
}

// List the keys from the database and start new timers for each
getKeyObjs ( function(data) {
  for (var i = 0; i < data.length; i++) {
    getKeyObj (data[i].key, function (data) {
      addKeyTimer(data.key, data.lat, data.long);
    });
  }
});

// get the app environment from Cloud Foundry
var appEnv = cfenv.getAppEnv();

// start server on the specified port and binding host
app.listen(appEnv.port, '0.0.0.0', function() {
  // print a message when the server starts listening
  console.log("IFTTT Sun Times starting on " + appEnv.url);
});






// *********
// Test block
// *********


/*var keyObj = addKeyTimer ("KEY-TIMER-TEST", "51", "0");
addKeyObj (keyObj, function(){
  getKeyObjs(function(data){
    console.log (JSON.stringify(data));
  })
});*/

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


var times = new Date();
times.setTime(times.getTime() + 1000 * 60);

setSunriseTimer (keyObj, times);
setSunsetTimer (keyObj,times);


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
