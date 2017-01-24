'use strict';

console.log ("suntimes.js Running in NODE_ENV=" + process.env.NODE_ENV);

var request = require('request');
var SunCalc = require('suncalc');
var geocoder = require('geocoder');
var schedule = require('node-schedule');
const express = require('express');
var cfenv = require('cfenv');
var Cloudant = require('cloudant');
var helmet = require('helmet')
var debug = require('debug')('suntimes');

const app = express();
app.use (helmet());

var credentials = {} ;

//******************************************************************************
//
// Get the database parameters from the VCAP_SERVICES.  If running locally
// then get from the local environment.
//
//******************************************************************************
function initDBConnection() {
  var vcapServices = {};
  if (process.env.VCAP_SERVICES) {
    vcapServices = JSON.parse(process.env.VCAP_SERVICES);
  } else {
    try {
      vcapServices = require('./local/VCAP_SERVICES.json');
      console.log ("Running with LOCAL VCAP_SERVICES", vcapServices);
    } catch (e) {
      debug(e);
    }
  }

	if(vcapServices) {
    credentials = vcapServices.cloudantNoSQLDB[0].credentials ;
    debug ("Using credentials", credentials);
	} else{
		debug ('VCAP_SERVICES environment variable not set!');
	}
}

// Sort out the database connections and names.
initDBConnection();
var cloudant = Cloudant(credentials);
var dbName = "iftttsuntimes-test";
if (process.env.NODE_ENV == "production") {
  dbName = "iftttsuntimes";
}
console.log ("Using DB:", dbName);
var db = cloudant.db.use(dbName);


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
    updateData.keyObj.loc = obj.loc;


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

  db.get(key, function(err, data) {

    if (err) {
      debug ("deleteKeyObj: Error:", err)
      // callback(err);
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
function setSunriseTimer (keyObj, date) {

  console.log ("Setting sunrise trigger for key " + hideKey(keyObj.key) + " at " + date);
  var sunriseTimer = schedule.scheduleJob (date, function(schedKey){

    console.log ("Sunrise for key " + hideKey(schedKey.key) + ". Time now " + new Date() );

    // Fire event.
    var url = "https://maker.ifttt.com/trigger/sunrise/with/key/" + schedKey.key;
    request(url, function (error, response, body) {
      console.log ("IFTTT sunrise response for key " + hideKey(schedKey.key) + ". Time now " + new Date(), body );
      if (response.statusCode == 401) {
        debug ("setSunriseTimer: IFTTT does not recognise key:", schedKey.key);
        deleteKeyObj(schedKey.key);
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
        deleteKeyObj(schedKey.key);
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
  addKeyTimer (keyObj);
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
//    res.end(JSON.stringify(data));

    debug ("geocoder.geocode", req.params.postcode, err, data);

    if (data.results.length > 0 ) {
      var keyObj = {};
      keyObj.key = req.params.key;
      keyObj.lat = data.results[0].geometry.location.lat;
      keyObj.long = data.results[0].geometry.location.lng;
      keyObj.loc = data.results[0].formatted_address;

      addKeyTimer (keyObj);
      addKeyObj (keyObj, function(){
        getKeyObjs(function(data){

          var picked = keys.filter(function(obj) {
            return obj.key == req.params.key;
          });

          debug ("geocoder.geocode", picked[0])

          res.end (JSON.stringify(picked[0]));
        })
      });

    } else {
      res.end (JSON.stringify(data));
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
    debug ("/list", data);
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


  res.end (JSON.stringify(obj));

});


//******************************************************************************
//
// This route gets the list of locations in the database
//
// Returns: The list of locations
//
//******************************************************************************
app.get('/map', function (req, res) {

  getKeyObjs ( function(data) {
    var retObj = [];
    for (var i = 0; i < data.length; i++) {
      getKeyObj (data[i].key, function (keyObj) {
        // addKeyTimer(data);
        var locObj = {} ;
        locObj.lat = keyObj.lat;
        locObj.long = keyObj.long;
        locObj.loc = keyObj.loc;
        retObj.push (locObj);
        debug ("/map: Received", retObj.length, "Waiting for", data.length)
        if (retObj.length == data.length) {
          res.end (JSON.stringify(retObj));
        }
      });
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

  // Sunrise
  if (now > times.sunrise)
  {
    // Today's sunrise has aldready happened so find out tomorrow's
    var tomorrow = new Date();
    tomorrow = tomorrow.setDate(now.getDate() + 1);

    times = SunCalc.getTimes(tomorrow, keyObj.lat, keyObj.long);
  }

  keyObj.sunriseTimer = setSunriseTimer (keyObj, times.sunrise);

  // Sunset
  times = SunCalc.getTimes(now, keyObj.lat, keyObj.long);
  if (now > times.sunset)
  {
    // Today's sunset has already happened so find out tomorrow's
    var tomorrow = new Date();
    tomorrow = tomorrow.setDate(now.getDate() + 1);

    times = SunCalc.getTimes(tomorrow, keyObj.lat, keyObj.long);
  }

  keyObj.sunsetTimer = setSunsetTimer (keyObj, times.sunset);

  keys.push(keyObj);

  return keyObj;
}

// List the keys from the database and start new timers for each
getKeyObjs ( function(data) {
  for (var i = 0; i < data.length; i++) {
    getKeyObj (data[i].key, function (data) {
      addKeyTimer(data);
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
