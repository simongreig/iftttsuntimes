

var request = require('request');
/*
request('http://www.google.com', function (error, response, body) {
  if (!error && response.statusCode == 200) {
    console.log(body) // Show the HTML for the Google homepage.
  }
})
*/

var SunCalc = require('suncalc');


const express = require('express');
var cfenv = require('cfenv');

const app = express();

// serve the files out of ./public as our main files
app.use(express.static(__dirname + '/public'));






// Get this from a database eventually

/*
var iftttKey =   {
  "keys": [{
    "key": "cgQvZHbPdm3zVOjip5H77r", "values":{
       "date": "",
       "lat": "51.233738",
       "long": "-0.558809",
       "sunrise": "",
       "sunset": "",
       "isDay": false
     }} ]
  };

  */

var keys = [];


  // TODO
  // On start up read the locations from the database and set up
  // schedules

  // Scedule example
var schedule = require('node-schedule');

  // var date = new Date(2012, 11, 21, 5, 30, 0);

  // var j = schedule.scheduleJob(date, function(){
  // console.log('The world is going to end today.');
  // });

  // To cancel
  // j.cancel();



// New logic.


// Set sunrise time for the future

// In the sunrise vent trigger do:
// Fire the IFTTT event for this key
// Caluclate sunrise time for tomorrow using the lat/long for this key
// date.setDate(date.getDate() + 1);
// Set a new timer to fire for tomorrow's sunrise at the required time




function setSunriseTimer (key, date) {

  console.log ("Setting sunrise trigger for key " + key.key + " at " + date);
  var sunriseTimer = schedule.scheduleJob (date, function(schedKey){

    console.log ("Sunrise for key " + schedKey.key + "! Time now " + new Date() );

    // Fire event.
    var url = "https://maker.ifttt.com/trigger/sunrise/with/key/" + schedKey.key;
    console.log (url);
    request(url, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        console.log(body) // Show the HTML for the Google homepage.
      }
    });

    var tomorrow = new Date();
    tomorrow = tomorrow.setDate(date.getDate() + 1);

    var times = SunCalc.getTimes(tomorrow, schedKey.lat, schedKey.long);

    setSunriseTimer (key, times.sunrise);

  }.bind(null, key));

  console.log ("Sunrise timer Set " + JSON.stringify(sunriseTimer));
}

function setSunsetTimer (key, date) {

  console.log ("Setting sunset trigger for key " + key.key + " at " + date);
  var sunsetTimer = schedule.scheduleJob (date, function(schedKey){

    console.log ("Sunset for key " + schedKey.key + "! Time now " + new Date() );

    // Fire event.
    var url = "https://maker.ifttt.com/trigger/sunset/with/key/" + schedKey.key;
    console.log (url);
    request(url, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        console.log(body) // Show the HTML for the Google homepage.
      }
    });

    var tomorrow = new Date();
    tomorrow = tomorrow.setDate(date.getDate() + 1);

    var times = SunCalc.getTimes(tomorrow, schedKey.lat, schedKey.long);

    setSunsetTimer (key, times.sunset);

  }.bind(null, key));

  console.log ("Sunset timer Set " + JSON.stringify(sunsetTimer));
}





//******************************************************************************
//
// The main event.
//
//******************************************************************************
function evaluate (idx) {
//    var localValues = iftttKey.keys[idx].values ;
//    var key = iftttKey.keys[idx].key;
    var localValues = keys[idx] ;

    if (!localValues) {
      console.log ("Key array empty");
      return;
    }

    var key = localValues.key;


    // Check if there is a calculated sunrise / sunset time by checking if the
    // date is the same as today.
    var today = new Date();
    if (today != localValues.date) {
      localValues.date = today ;

      var times = SunCalc.getTimes(today, localValues.lat, localValues.long);
//      localValues.sunrise = times.sunrise.toTimeString();
//      localValues.sunset = times.sunset.toTimeString();
      localValues.sunrise = times.sunrise;
      localValues.sunset = times.sunset;

    }

    console.log (localValues.isDay + " : isDay for " + key);
    console.log (localValues.sunset + " : sunset for " + key);
    console.log (today + " : timestamp");

    var supposedToBeDay = isDay (today, localValues.sunrise, localValues.sunset);

    console.log (supposedToBeDay + " : supposedToBeDay");

    if (supposedToBeDay != localValues.isDay) {
      if (supposedToBeDay) {
        // sunrise
        console.log ("Sunrise is now! Time now: " + today.toTimeString() + "Sunrise time: " + localValues.sunrise);
        localValues.isDay = true ;

        // Fire the IFTTT trigger.
        var url = "https://maker.ifttt.com/trigger/sunrise/with/key/" + key;
        console.log (url);
      } else {
        console.log ("Sunset is now! Time now: " + today.toTimeString() + "Sunset time: " + localValues.sunset);
        localValues.isDay = false ;

        // Fire the IFTTT trigger.
        var url = "https://maker.ifttt.com/trigger/sunset/with/key/" + key;
        console.log (url);
      }

      request(url, function (error, response, body) {
        if (!error && response.statusCode == 200) {
          console.log(body) // Show the HTML for the Google homepage.
        }
      });

    }

/*

    // Now check if the Day/Night indicator is correct.  Log a console event if there is a change.
    if (localValues.isDay && today > localValues.sunset) {
      console.log ("Sunset is now! Time now: " + today.toTimeString() + "Sunset time: " + localValues.sunset);
      localValues.isDay = false ;

      // Fire the IFTTT trigger.
      var url = "https://maker.ifttt.com/trigger/sunset/with/key/" + key;
      console.log (url);

      return;
    }

    if (!localValues.isDay && today > localValues.sunrise) {
      console.log ("Sunrise is now! Time now: " + today.toTimeString() + "Sunrise time: " + localValues.sunrise);
      localValues.isDay = true ;

      // Fire the IFTTT trigger.
      var url = "https://maker.ifttt.com/trigger/sunrise/with/key/" + key;
      console.log (url);

      return;
    }


    */

  }


//******************************************************************************
//
// Evaluates if it is currently day time.
//
//******************************************************************************
function isDay (time, sunrise, sunset) {
    if ( time <= sunrise && time <= sunset )
    {
      // Before dawn
      return false;
    }

    if (time >= sunrise && time <= sunset)
    {
      // Day time
      return true;
    }

    if (time >= sunrise && time >= sunset)
    {
      // After dusk
      return false;
    }

  }

//******************************************************************************
//
// Add Key to the master list.
//
//******************************************************************************
function addKey (key, lat, long) {
    console.log ("ADD KEY");

    var now = new Date();
    var localValue = {};
    localValue.key = key;
    localValue.lat = lat;
    localValue.long = long;


    // Add the key to the list
    // Find the sunrise/sunset times for the location
    var times = SunCalc.getTimes(now, localValue.lat, localValue.long);


    localValue.sunrise = times.sunrise;
    localValue.sunset = times.sunset;

    // Work out what the initial Day/Night setting needs to be.
    localValue.isDay = isDay (now, times.sunrise, times.sunset);

    console.log (localValue);

    keys.push(localValue);

    console.log (JSON.stringify(keys));

    // Store it to Cloudant!


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

//  addKey (req.params.key,req.params.lat,req.params.long);
  addKeyTimer (req.params.key,req.params.lat,req.params.long);
  res.end(JSON.stringify(keys));

});

//******************************************************************************
//
// This route list the keys in the list.
//
// Returns: The list of keys.
//
//******************************************************************************
app.get('/list', function (req, res) {
  res.end(JSON.stringify(keys));
});

//******************************************************************************
//
// This route gets the details of the specific key in the list
//
// Returns: The details of the specific key
//
//******************************************************************************
app.get('/key/:key', function (req, res) {
  for (var i = 0; i < keys.length; i++) {
    if (keys[i].key == req.params.key)
    {
      res.end(JSON.stringify(keys[i]));
    }
  }
  var error = {};
  error.error = "Key not found";
  res.end(JSON.stringify(error));
});


function addKeyTimer (key, lat, long) {

  var keyObj = {};
  keyObj.key = key

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

  setSunriseTimer (keyObj, times.sunrise);

  // Sunset
  times = SunCalc.getTimes(now, lat, long);
  if (now > times.sunset)
  {
    // Today's sunset has already happened so find out tomorrow's
    var tomorrow = new Date();
    tomorrow = tomorrow.setDate(now.getDate() + 1);

    times = SunCalc.getTimes(tomorrow, lat, long);
  }

  setSunsetTimer (keyObj, times.sunset);

}


// *********
// Test block
// *********

    addKey ("KEY1","51.233738","-0.558809");
    evaluate (0);


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


// **********
//  END Test block
// **********


// get the app environment from Cloud Foundry
var appEnv = cfenv.getAppEnv();

// start server on the specified port and binding host
app.listen(appEnv.port, '0.0.0.0', function() {
  // print a message when the server starts listening
  console.log("IFTTT Sun Times starting on " + appEnv.url);
});


/*

// Start a one minute timer to evaluate the time settings
setInterval(function() {
  var date = new Date();
  if ( date.getSeconds() === 0 ) {

    console.log ("Found " + keys.length + " key(s) to evaluate!");

    // Evaluate each of the array items
    for (var i = 0; i < keys.length; i++) {
      evaluate (i);
    }
  }
}, 1000);

*/
