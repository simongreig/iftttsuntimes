/*jshint expr: true*/

var chai    = require("chai");
var expect = chai.expect;
var should = chai.should();
var suntimes = require("../src/suntimes");
var suntimesDB = require("../src/suntimes-db");
var request = require("request");
var nock = require('nock');


var urlBase = "http://localhost:6006";

describe ( "Suntimes", function() {

  describe ("API CRUD tests", function() {


    it ("returns an empty object and status code of ZERO_RESULTS when given a duff postcode", function (done) {
      var url = urlBase + "/add/mocha-test/RUBBISHADDRESSNOTWORKING";
      request(url, function(error, response, body) {
        expect(error).to.be.null;
        expect(body).not.to.be.null;
        body = JSON.parse(body);
        expect(body.results.length).to.equal(0);
        expect(body.status).to.equal("ZERO_RESULTS");
        expect(response.statusCode).to.equal(404);
        done();
      });
    });

    // Add, read and delete
    var addKey = "MOCHA-ADD";
    var keyObj = {};

    var baselineDBsize = 0;
    it ("will return a baseline database", function (done) {
      var url = urlBase + "/list";
      request(url, function(error, response, body) {
        expect(response.statusCode).to.equal(200);
        expect(error).to.be.null;
        expect(body).not.to.be.null;
        keyList = JSON.parse(body);
        baselineDBsize = keyList.length;
        expect (baselineDBsize).to.equal(0);
        done();
      });
    });


    it ("will add to the database", function (done) {
      // First add to the database
      this.timeout(3000);
      var addurl = urlBase + "/add/" + addKey + "/SE1%209PZ";
      request(addurl, function(error, response, body) {
        expect(response.statusCode).to.equal(200);
        expect(error).to.be.null;
        expect(body).not.to.be.null;
        keyObj = JSON.parse(body);
        expect(keyObj.key).to.equal(addKey);
        expect(keyObj.lat).to.be.a('number');
        expect(keyObj.long).to.be.a('number');
        expect(keyObj.loc).to.be.a('string');
        expect(keyObj.sunriseTimer).to.be.a('object');
        expect(keyObj.sunsetTimer).to.be.a('object');
        expect(keyObj.timestamp).to.be.a('string');
        done();
      });
    });

    it ("will grow the database by one", function (done) {
      var url = urlBase + "/list";
      request(url, function(error, response, body) {
        expect(response.statusCode).to.equal(200);
        expect(error).to.be.null;
        expect(body).not.to.be.null;
        keyList = JSON.parse(body);
        expect (keyList.length).to.equal(baselineDBsize+1);
        done();
      });
    });


    it ("will read from the database", function (done) {
    var readurl = urlBase + "/key/" + addKey;
      request(readurl, function(error, response, body) {
        expect(response.statusCode).to.equal(200);
        expect(error).to.be.null;
        expect(body).not.to.be.null;
        body = JSON.parse(body);
        expect(body.key).to.equal(keyObj.key);
        expect(body.lat).to.equal(keyObj.lat);
        expect(body.long).to.equal(keyObj.long);
        expect(body.loc).to.equal(keyObj.loc);
        expect(body.timestamp).to.be.a('string');
        done();
      });
    });


      var updatedKeyObj = {};
      it ("will update the database", function (done) {
      var update = urlBase + "/add/" + addKey + "/SO21%202JN";
        request(update, function(error, response, body) {
          expect(response.statusCode).to.equal(200);
          expect(error).to.be.null;
          expect(body).not.to.be.null;
          body = JSON.parse(body);

          // Check the old values have changed.
          expect(body.key).to.equal(keyObj.key);
          expect(body.lat).not.to.equal(keyObj.lat);
          expect(body.long).not.to.equal(keyObj.long);
          expect(body.loc).not.to.equal(keyObj.loc);
          expect(body.timestamp).to.be.a('string');
          updatedKeyObj = body;
          done();
        });
      });




      it ("will read the updated value from the database", function (done) {
        var readurl = urlBase + "/key/" + addKey;
        request(readurl, function(error, response, body) {
          expect(response.statusCode).to.equal(200);
          expect(error).to.be.null;
          expect(body).not.to.be.null;
          body = JSON.parse(body);
          expect(body.key).to.equal(updatedKeyObj.key);
          expect(body.lat).to.equal(updatedKeyObj.lat);
          expect(body.long).to.equal(updatedKeyObj.long);
          expect(body.loc).to.equal(updatedKeyObj.loc);
          expect(body.timestamp).to.be.a('string');
          done();
        });
      });

      it ("will not grow the database by one after the update", function (done) {
        var url = urlBase + "/list";
        request(url, function(error, response, body) {
          expect(response.statusCode).to.equal(200);
          expect(error).to.be.null;
          expect(body).not.to.be.null;
          keyList = JSON.parse(body);
          expect (keyList.length).to.equal(baselineDBsize+1);
          done();
        });
      });


      it ("will return the map ref as a list", function (done) {
        var url = urlBase + "/map";
        request(url, function(error, response, body) {
          expect(response.statusCode).to.equal(200);
          expect(error).to.be.null;
          expect(body).not.to.be.null;
          mapList = JSON.parse(body);
          expect (mapList.length).to.equal(1);
          expect (mapList[0].lat).to.equal(updatedKeyObj.lat);
          expect (mapList[0].long).to.equal(updatedKeyObj.long);
          expect (mapList[0].loc).to.equal(updatedKeyObj.loc);
          done();
        });
      });



      it ("will delete from the database", function (done) {
        var readurl = urlBase + "/remove/" + addKey;
        request(readurl, function(error, response, body) {
          expect(response.statusCode).to.equal(200);
          expect(error).to.be.null;
          expect(body).not.to.be.null;
          body = JSON.parse(body);
          expect (body.ok).to.be.true;
//          expect (body.id).to.equal(updatedKeyObj.key);
//          expect (body.keyObj.long).to.equal(updatedKeyObj.long);
//          expect (body.keyObj.loc).to.equal(updatedKeyObj.loc);
          done();
        });
      });


      it ("will return an error when deleting an invalid key", function (done) {
        var url = urlBase + "/remove/mumbjojumbokey252525";
        request(url, function(error, response, body) {
          expect(response.statusCode).to.equal(404);
          expect(error).to.be.null;
          expect(body).to.equal("not_found");
          done();
        });
      });






  }); // API Tests

  describe ("Timer tests", function() {

    describe ("Generic set timer", function() {

      it ("sets a sunrise timer", function(){
        // Check returns a timer object with the next scehduled date correct
        var keyObj = {
          "key" : "GENERIC_SUNRISE_TIMER",
          "lat" : "51.233738",
          "long" : "-0.558809"
        };

        var trigger = new Date(2117, 01, 03, 10, 08, 31);
        var returnedTimer = suntimes.setTimer ("sunrise", keyObj, trigger);
        expect(returnedTimer).not.to.be.null;
        expect(returnedTimer.nextInvocation()).to.equal(trigger);
      });

      it ("sets a sunset timer", function(){
        // Check returns a timer object with the next scehduled date correct
        var keyObj = {
          "key" : "GENERIC_SUNSET_TIMER",
          "lat" : "51.233738",
          "long" : "-0.558809"
        };

        var trigger = new Date(2117, 10, 03, 20, 08, 31);
        var returnedTimer = suntimes.setTimer ("sunset", keyObj, trigger);
        expect(returnedTimer).not.to.be.null;
        expect(returnedTimer.nextInvocation()).to.equal(trigger);
      });

      it ("triggers a sunrise timer", function(done) {

        // Set it so that the timer goes off within 2 seconds and
        // i) make sure it calls IFTTT nock stub
        // ii) check the next timer is set correctly

        // first define a nock for the call.
        var eventString = "sunrise";
        var okString = "Congratulations! You've fired the " + eventString + " event";
        var testKey = "KEY_GENERIC_SUNRISE_TRIGGER_TEST";
        var ifttt = nock('https://maker.ifttt.com')
                  .get('/trigger/' + eventString + '/with/key/' + testKey)
                  .reply(200, okString);


        // Now set the timer.

        var keyObj = {
          "key" : testKey,
          "lat" : "51.233738",
          "long" : "-0.558809"
        };

        var trigger = new Date();
        trigger.setTime(trigger.getTime() + 1000);
        keyObj.sunriseTimer = suntimes.setTimer (eventString, keyObj, trigger);
        suntimes.keys.push(keyObj);
        var firstTimerTrigger = suntimes.keys[suntimes.findKeyIndex(testKey)].sunriseTimer.nextInvocation();

        setTimeout(function(){
          // check that the nock was called.
          expect(ifttt.isDone()).is.true;

          // check that the key exists in the list still.
          var keyIndex = suntimes.findKeyIndex(testKey);
          expect(keyIndex).is.not.equal(-1);

          // check that the timer set is in the future.
          var newTimer = suntimes.keys[keyIndex].sunriseTimer;
          expect(newTimer).to.not.equal(firstTimerTrigger);
          expect(Date.parse(newTimer.nextInvocation())).to.be.above(Date.parse(trigger));
          expect(suntimes.keys[keyIndex].sunsetTimer).to.be.undefined;
          done();
        }, 1500);
        this.timeout(3000);

      });



      it ("triggers a sunset timer", function(done) {

        // Set it so that the timer goes off within 2 seconds and
        // i) make sure it calls IFTTT nock stub
        // ii) check the next timer is set correctly

        // first define a nock for the call.
        var eventString = "sunset";
        var okString = "Congratulations! You've fired the " + eventString + " event";
        var testKey = "KEY_GENERIC_SUNSET_TRIGGER_TEST";
        var ifttt = nock('https://maker.ifttt.com')
                  .get('/trigger/' + eventString + '/with/key/' + testKey)
                  .reply(200, okString);


        // Now set the timer.

        var keyObj = {
          "key" : testKey,
          "lat" : "51.233738",
          "long" : "-0.558809"
        };

        var trigger = new Date();
        trigger.setTime(trigger.getTime() + 1000);
        keyObj.sunsetTimer = suntimes.setTimer (eventString, keyObj, trigger);
        suntimes.keys.push(keyObj);
        var firstTimerTrigger = suntimes.keys[suntimes.findKeyIndex(testKey)].sunsetTimer.nextInvocation();

        setTimeout(function(){
          // check that the nock was called.
          expect(ifttt.isDone()).is.true;

          // check that the key exists in the list still.
          var keyIndex = suntimes.findKeyIndex(testKey);
          expect(keyIndex).is.not.equal(-1);

          // check that the timer set is in the future.
          var newTimer = suntimes.keys[keyIndex].sunsetTimer;
          expect(newTimer).to.not.equal(firstTimerTrigger);
          expect(Date.parse(newTimer.nextInvocation())).to.be.above(Date.parse(trigger));
          expect(suntimes.keys[keyIndex].sunriseTimer).to.be.undefined;
          done();
        }, 1500);
        this.timeout(3000);

      });


      it ("fails gracefully if an incorrect timer reference is triggered", function () {

        var keyObj = {
          "key" : "testKey",
          "lat" : "51.233738",
          "long" : "-0.558809"
        };

        var trigger = new Date();
        trigger.setTime(trigger.getTime() + 500);
        suntimes.setTimer ( "INCORRECT_EVENT", keyObj, trigger);
      });


    }); // Generic set timer.

    describe ("Add timer tests", function() {
      it ("will add timers to a new key", function(){
        var keyObj = {
          "key" : "ADD_TIMER_TO_NEW",
          "lat" : "51.233738",
          "long" : "-0.558809"
        };

        // Test precondition, key not in the list.
        expect(suntimes.findKeyIndex(keyObj.key)).to.be.equal(-1);

        var startTime = new Date();
        var respKeyObj = suntimes.addKeyTimer (keyObj);
        expect(respKeyObj).to.not.be.undefined;
        expect(respKeyObj).to.not.be.null;
        expect(respKeyObj.sunriseTimer).to.not.be.undefined;
        expect(respKeyObj.sunsetTimer).to.not.be.undefined;
        expect(Date.parse(respKeyObj.sunriseTimer.nextInvocation())).to.be.above(Date.parse(startTime));
        expect(Date.parse(respKeyObj.sunsetTimer.nextInvocation())).to.be.above(Date.parse(startTime));
        expect(suntimes.findKeyIndex(keyObj.key)).to.not.be.equal(-1);

      });

      it ("will replace timers of an existing key", function() {
        // Add a keyObj to create timers
        // Update the keyObj to a new one with a different lat long and update it
        // Validate that the timers have been updated.
        var testKey = "ADD_TIMER_TO_EXISTING";
        var keyObj = {
          "key" : testKey,
          "lat" : "51.233738",
          "long" : "-0.558809"
        };

        // Test precondition, key not in the list.
        expect(suntimes.findKeyIndex(keyObj.key)).to.be.equal(-1);
        var startTime = new Date();
        var respKeyObj = suntimes.addKeyTimer (keyObj);
        expect(suntimes.findKeyIndex(keyObj.key)).to.not.be.equal(-1);

        // Now add another key obj with the same key but different location.
        var newKeyObj = {
          "key" : testKey,
          "lat" : "55.233738",
          "long" : "-2.558809"
        };

        var newRespKeyObj = suntimes.addKeyTimer (newKeyObj);
        expect(newRespKeyObj).to.not.be.undefined;
        expect(newRespKeyObj).to.not.be.null;
        expect(newRespKeyObj.sunriseTimer).to.not.be.undefined;
        expect(newRespKeyObj.sunsetTimer).to.not.be.undefined;
        expect(Date.parse(newRespKeyObj.sunriseTimer.nextInvocation())).to.not.equal(Date.parse(respKeyObj.sunriseTimer.nextInvocation()));
        expect(Date.parse(newRespKeyObj.sunsetTimer.nextInvocation())).to.not.equal(Date.parse(respKeyObj.sunsetTimer.nextInvocation()));
        expect(Date.parse(newRespKeyObj.sunsetTimer.nextInvocation())).to.be.above(Date.parse(startTime));
        expect(Date.parse(newRespKeyObj.sunsetTimer.nextInvocation())).to.be.above(Date.parse(startTime));
        expect(suntimes.findKeyIndex(newKeyObj.key)).to.not.be.equal(-1);


      });

    }); // Add timer tests

    describe ("Sunrise timer tests", function() {

      it ("will start a sunrise timer", function()  {
        // Check returns a timer object with the next scehduled date correct
        var keyObj = {
          "key" : "KEY123",
          "lat" : "51.233738",
          "long" : "-0.558809"
        };

        var trigger = new Date(2117, 01, 03, 10, 08, 31);
        var returnedTimer = suntimes.setSunriseTimer (keyObj, trigger);
        expect(returnedTimer).not.to.be.null;
        expect(returnedTimer.nextInvocation()).to.equal(trigger);

      });

      it ("will trigger a sunrise timer", function(done) {

        // Set it so that the timer goes off within 2 seconds and
        // i) make sure it calls IFTTT nock stub
        // ii) check the next timer is set correctly

        // first define a nock for the call.
        var eventString = "sunrise";
        var okString = "Congratulations! You've fired the " + eventString + " event";
        var testKey = "KEY_SUNRISE_TRIGGER_TEST";
        var ifttt = nock('https://maker.ifttt.com')
                  .get('/trigger/' + eventString + '/with/key/' + testKey)
                  .reply(200, okString);


        // Now set the timer.

        var keyObj = {
          "key" : testKey,
          "lat" : "51.233738",
          "long" : "-0.558809"
        };

        var trigger = new Date();
        trigger.setTime(trigger.getTime() + 2000);
        keyObj.sunriseTimer = suntimes.setSunriseTimer (keyObj, trigger);
        suntimes.keys.push(keyObj);

        setTimeout(function(){
          // check that the nock was called.
          expect(ifttt.isDone()).is.true;

          // check that the key exists in the list still.
          var keyIndex = suntimes.findKeyIndex(testKey);
          expect(keyIndex).is.not.equal(-1);

          // check that the timer set is in the future.
          var newTimer = suntimes.keys[keyIndex].sunriseTimer;
          expect(Date.parse(newTimer.nextInvocation())).to.be.above(Date.parse(trigger));
          expect(suntimes.keys[keyIndex].sunsetTimer).to.be.undefined;
          done();
        }, 2500);
        this.timeout(3000);

      });

    }); // Sunrise timer tests


    describe ("Sunset timer tests", function() {

      it ("will start a sunset timer", function() {
        // Check returns a timer object with the next scehduled date correct
        var keyObj = {
          "key" : "KEY123",
          "lat" : "51.233738",
          "long" : "-0.558809"
        };

        var trigger = new Date(2117, 01, 03, 10, 08, 31);
        var returnedTimer = suntimes.setSunsetTimer (keyObj, trigger);
        expect(returnedTimer).not.to.be.null;
        expect(returnedTimer.nextInvocation()).to.equal(trigger);

      });

      it ("will trigger a sunset timer", function(done) {
        // Set it so that the timer goes off within 2 seconds and
        // i) make sure it calls IFTTT nock stub
        // ii) check the next timer is set correctly

        // first define a nock for the call.
        var eventString = "sunset";
        var okString = "Congratulations! You've fired the " + eventString + " event";
        var testKey = "KEY_SUNSET_TRIGGER_TEST";
        var ifttt = nock('https://maker.ifttt.com')
                  .get('/trigger/' + eventString + '/with/key/' + testKey)
                  .reply(200, okString);


        // Now set the timer.

        var keyObj = {
          "key" : testKey,
          "lat" : "51.233738",
          "long" : "-0.558809"
        };

        var trigger = new Date();
        trigger.setTime(trigger.getTime() + 2000);
        keyObj.sunsetTimer = suntimes.setSunsetTimer (keyObj, trigger);
        suntimes.keys.push(keyObj);

        setTimeout(function(){
          // check that the nock was called.
          expect(ifttt.isDone()).is.true;

          // check that the key exists in the list still.
          var keyIndex = suntimes.findKeyIndex(testKey);
          expect(keyIndex).is.not.equal(-1);

          // check that the timer set is in the future.
          var newTimer = suntimes.keys[keyIndex].sunsetTimer;
          expect(Date.parse(newTimer.nextInvocation())).to.be.above(Date.parse(trigger));
          expect(suntimes.keys[keyIndex].sunriseTimer).to.be.undefined;
          done();
        }, 2500);
        this.timeout(3000);

      });
    }); // Sunset timer tests

  }); // Timer tests


  describe ("IFTTT tests", function() {

/*
    var ifttt = nock('https://maker.ifttt.com')
                    .get('/trigger/TESTEVENT/with/key/TESTKEY')
                    .reply(200, {
                      _id: '123ABC',
                      _rev: '946B7D1C',
                      username: 'pgte',
                      email: 'pedro.teixeira@gmail.com'
                     });
*/

    var eventString = "TESTEVENT";
    var errorString = '{"errors":[{"message":"You sent an invalid key."}]}';
    var okString = "Congratulations! You've fired the " + eventString + " event";
    var goodSunriseString = '{"message":"Congratulations! You\'ve fired the sunrise event"}';
    var goodSunsetString = '{"message":"Congratulations! You\'ve fired the sunset event"}';

    before(function () {
      var ifttt = nock('https://maker.ifttt.com')
                .get('/trigger/' + eventString + '/with/key/TESTKEY')
                .reply(200, okString);

      var blah  = nock('https://maker.ifttt.com')
                      .get('/trigger/' + eventString + '/with/key/BADKEY')
                      .reply(401, errorString);


      var goodsunrise  = nock('https://maker.ifttt.com')
                      .get('/trigger/sunrise/with/key/TESTKEY')
                      .reply(200, goodSunriseString);

      var goodsunset  = nock('https://maker.ifttt.com')
                      .get('/trigger/sunset/with/key/TESTKEY')
                      .reply(200, goodSunsetString);

      var badsunrise  = nock('https://maker.ifttt.com')
                      .get('/trigger/sunrise/with/key/BADKEY')
                      .reply(401, errorString);

      var badsunset  = nock('https://maker.ifttt.com')
                      .get('/trigger/sunset/with/key/BADKEY')
                      .reply(401, errorString);


    });

    after(function () {
      nock.restore();
    });

    it ("will handle OK response from IFTTT with a valid event and key", function (done)  {

      var inputEvent = eventString;
      var inputKey = "TESTKEY";

      // The callback function from the method call
      var callback = function (key, statusCode, body)
      {
        // Did the response match the request?
        expect(statusCode).to.equal(200);
        expect(key).to.equal(inputKey);
        expect(body.message).to.equal(okString);

        done();
      };

      suntimes.callIFTTT (inputEvent, inputKey, callback);
    });

    it ("will handle error response from IFTTT with an invalid key", function (done)  {

      var inputEvent = eventString;
      var inputKey = "BADKEY";

      // The callback function from the method call
      var callback = function (key, statusCode, body)
      {
        // Did the response match the request?
        expect(statusCode).to.equal(401);
        expect(key).to.equal(inputKey);
        expect(JSON.stringify(body)).to.equal(errorString);

        done();
      };

      suntimes.callIFTTT (inputEvent, inputKey, callback);

    });



    it ("will trigger a sunrise event when sent a valid key", function (done)  {

      var key = "TESTKEY";
      var url = urlBase + "/test/sunrise/" + key;
      request(url, function(error, response, body) {
        expect(response.statusCode).to.equal(200);
        expect(error).to.be.null;
        expect(body).not.to.be.null;
        expect (body).to.equal(goodSunriseString);
        done();
      });

    });

    it ("will trigger a sunset event when sent a valid key", function (done)  {

      var key = "TESTKEY";
      var url = urlBase + "/test/sunset/" + key;
      request(url, function(error, response, body) {
        expect(response.statusCode).to.equal(200);
        expect(error).to.be.null;
        expect(body).not.to.be.null;
        expect (body).to.equal(goodSunsetString);
        done();
      });

    });

    it ("will not trigger a sunrise event when sent an invalid key", function (done) {

      var key = "BADKEY";
      var url = urlBase + "/test/sunrise/" + key;
      request(url, function(error, response, body) {
        expect(response.statusCode).to.equal(401);
        expect(error).to.be.null;
        expect(body).not.to.be.null;
        expect (body).to.equal(errorString);
        done();
      });

    });

    it ("will not trigger a sunset event when sent an invalid key", function (done) {

      var key = "BADKEY";
      var url = urlBase + "/test/sunset/" + key;
      request(url, function(error, response, body) {
        expect(response.statusCode).to.equal(401);
        expect(error).to.be.null;
        expect(body).not.to.be.null;
        expect (body).to.equal(errorString);
        done();
      });

    });

    describe ("Delete timers tests", function () {

      var testKey = "DELETE_TIMERS_TEST";

      var keyObj = {
        "key" : testKey,
        "lat" : "51.233738",
        "long" : "-0.558809"
      };
      beforeEach(function(done) {
        // Add a timer to the database.
        suntimesDB.addKeyObj (keyObj, function (resp){
          done();
        });

      });

      afterEach (function(done) {
        // Delete the object in case the test failed
        suntimesDB.deleteKeyObj (testKey, function(resp){done();});
      });



      it ("will delete a key from the database when IFTTT reports invalid sunrise", function(done) {
        // Preconditions
//        expect(suntimes.keys.length).to.equal(0);   // Because I have not tidied up after myself higher up!

        var sunriseError  = nock('https://maker.ifttt.com')
                        .get('/trigger/sunrise/with/key/'+testKey)
                        .reply(401, errorString);


        // Add a dummy key to the database
        // Call the IFTTT call with the dummy key
        // Check the key is removed from the database (do a DB lookup and check for 404 error)

        var trigger = new Date();
        trigger.setTime(trigger.getTime() + 1000);
        keyObj.sunriseTimer = suntimes.setSunriseTimer (keyObj, trigger);
        suntimes.keys.push(keyObj);

        setTimeout(function(){
          // check that the nock was called.
          expect(sunriseError.isDone()).is.true;

          // check that the key no longer exists in the list.
          var keyIndex = suntimes.findKeyIndex(testKey);
          expect(keyIndex).is.equal(-1);

          // check that the key is no longer in the database
          suntimesDB.getWithKey(testKey, function(resp) {
            expect(resp.statusCode).is.equal(404);
            done();
          });
        }, 1500);
        this.timeout(3000);

      });


      it ("will delete a key from the database when IFTTT reports invalid sunset", function(done) {
        // Preconditions
//        expect(suntimes.keys.length).to.equal(0);   // Because I have not tidied up after myself higher up!
        var sunsetError  = nock('https://maker.ifttt.com')
                           .get('/trigger/sunset/with/key/'+testKey)
                           .reply(401, errorString);


        // Add a dummy key to the database
        // Call the IFTTT call with the dummy key
        // Check the key is removed from the database (do a DB lookup and check for 404 error)
        var trigger = new Date();
        trigger.setTime(trigger.getTime() + 1000);
        keyObj.sunsetTimer = suntimes.setSunsetTimer (keyObj, trigger);
        suntimes.keys.push(keyObj);

        setTimeout(function(){
          // check that the nock was called.
          expect(sunsetError.isDone()).is.true;

          // check that the key no longer exists in the list.
          var keyIndex = suntimes.findKeyIndex(testKey);
          expect(keyIndex).is.equal(-1);

          // check that the key is no longer in the database
          suntimesDB.getWithKey(testKey, function(resp) {
            expect(resp.statusCode).is.equal(404);
            done();
          });
        }, 1500);
        this.timeout(3000);

      });




    }); // Delete timers tests


  }); // IFTTT tests



}); // Testing suntimes
