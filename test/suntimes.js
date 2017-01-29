var chai    = require("chai");
var expect = chai.expect;
var should = chai.should();
var suntimes = require("../suntimes");
var request = require("request");


var urlBase = "http://localhost:6006";


describe ( "Suntimes", function() {

  describe ("API CRUD tests", function() {


    it ("returns an empty object and status code of ZERO_RESULTS when given a duff postcode", (done) => {
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
    it ("will return a baseline database", (done) => {
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


    it ("will add to the database", (done) => {
      // First add to the database
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

    it ("will grow the database by one", (done) => {
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


    it ("will read from the database", (done) => {
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
      it ("will update the database", (done) => {
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




      it ("will read the updated value from the database", (done) => {
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

      it ("will not grow the database by one after the update", (done) => {
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


      it ("will return the map ref as a list", (done) => {
        var url = urlBase + "/map";
        request(url, function(error, response, body) {
          expect(response.statusCode).to.equal(200);
          expect(error).to.be.null;
          expect(body).not.to.be.null;
          mapList = JSON.parse(body);
          console.log ("******", mapList, keyObj, updatedKeyObj);
          expect (mapList.length).to.equal(1);
          expect (mapList[0].lat).to.equal(updatedKeyObj.lat);
          expect (mapList[0].long).to.equal(updatedKeyObj.long);
          expect (mapList[0].loc).to.equal(updatedKeyObj.loc);
          done();
        });
      });



      it ("will delete from the database", (done) => {
        var readurl = urlBase + "/remove/" + addKey;
        request(readurl, function(error, response, body) {
          expect(response.statusCode).to.equal(200);
          expect(error).to.be.null;
          expect(body).not.to.be.null;
          done();
        });
      });


      it ("will shrink the database by one after the delete", (done) => {
        var url = urlBase + "/list";
        request(url, function(error, response, body) {
          expect(response.statusCode).to.equal(200);
          expect(error).to.be.null;
          expect(body).not.to.be.null;
          keyList = JSON.parse(body);
          expect (keyList.length).to.equal(baselineDBsize);
          done();
        });
      });






  }); // API Tests
}); // Testing suntimes
