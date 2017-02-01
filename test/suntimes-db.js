var chai    = require("chai");
var expect = chai.expect;
var should = chai.should();
var suntimesDB = require("../suntimes-db");



//describe.only ( "Database & Security", function() {
describe ( "Database & Security", function() {

  describe ("Hash tests", function() {

    var str = "Hello World";
    var h1 = suntimesDB.hash(str);
    var h2 = suntimesDB.hash(str);

    it ("consistently returns the same hash string every time", (done) => {
      expect (h1).to.not.equal(str);
      expect(h1).to.be.a('string');
      expect(h2).to.equal(h1);
      done();
    });

    it ("returns true if passed the same string", (done) => {
      expect(suntimesDB.hashCheck(str, h1)).to.equal(true);
      done();
    });

    it ("returns false if passed a different string", (done) => {
      expect(suntimesDB.hashCheck("a different str", h1)).to.equal(false);
      done();
    });

  }); // Hash tests

  describe ("Security tests", function() {

    var str = "Howdy partner";
    var crypto ;
    it ("encrypts a string", (done) => {
      crypto = suntimesDB.encrypt (str);
      expect(str).to.not.equal(crypto);
      expect(crypto).not.to.be.null;
      done();
    });

    it ("decrypts a string", (done) => {
      decrypted = suntimesDB.decrypt (crypto);
      expect (decrypted).to.equal(str);
      done();
    });

  }); // Security tests

  describe ("Database tests", function() {

    var testKey = "TEST12345";
    describe ("addKeyObj", function() {

      it ("inserts into the database with the ID being the hash of the keyObj key", (done) => {
        var keyObj = {};
        keyObj.key = testKey;
        keyObj.lat = 20;
        keyObj.long = 10;
        keyObj.loc = "Berlin"

        suntimesDB.addKeyObj (keyObj, function (data) {
          expect(data).not.to.be.null;
          expect(data.ok).to.be.true;
          done();
        });
      });
      it ("updates the database with new values correctly", (done) => {
        var keyObj = {};
        keyObj.key = testKey;
        keyObj.lat = 5;
        keyObj.long = 7;
        keyObj.loc = "Winchester"

        suntimesDB.addKeyObj (keyObj, function (data) {
          expect(data).not.to.be.null;
          expect(data.ok).to.be.true;
          suntimesDB.getWithKey (testKey, function (data) {
             expect(data.key).to.equal(keyObj.key);
             expect(data.lat).to.equal(keyObj.lat);
             expect(data.long).to.equal(keyObj.long);
             expect(data.loc).to.equal(keyObj.loc);
             done();
          });
        });
      });
    });

    describe ("getKeyObjs", function() {
      it ("returns a valid object in plaintext", (done) => {
        suntimesDB.getKeyObjs (function (data) {
          expect(data).not.to.be.null;
          expect(data).to.be.a('array');
          done();
        });
      });
    });

    describe ("getWithKey", function() {
      it ("returns a valid object in plaintext when given a valid key", (done) => {
        suntimesDB.getWithKey (testKey, function (data) {
           expect(data.key).to.equal(testKey);
           done();
        });
      });

      it ("returns a valid error when given an invalid key", (done) => {
        suntimesDB.getWithKey ("RUBBISHADDRESSNOTWORKING", function (data) {
           expect(data.statusCode).to.equal(404);
           done();
        });
      });

    });

    describe ("getWithID", function() {
      it ("returns a valid object in plaintext when given a valid key", (done) => {
        suntimesDB.getWithID (suntimesDB.hash(testKey), function (data) {
           expect(data.key).to.equal(testKey);
           done();
        });
      });

      it ("returns a valid error when given an invalid key", (done) => {
        suntimesDB.getWithID (suntimesDB.hash("RUBBISHADDRESSNOTWORKING"), function (data) {
           expect(data.statusCode).to.equal(404);
           done();
        });
      });

    });

    describe ("deleteKeyObj", function() {

      it ("returns a valid object in plaintext", (done) => {
        suntimesDB.deleteKeyObj (testKey, function (data) {
           expect(data.ok).to.be.true;
           expect(data.id).to.equal(suntimesDB.hash(testKey));
           done();
        });
      });

      it ("returns a valid error when given an invalid key", (done) => {
        suntimesDB.deleteKeyObj ("RUBBISHADDRESSNOTWORKING", function (data) {
           expect(data.statusCode).to.equal(404);
           done();
        });
      });
    });

  }); // Security tests




}); // Testing suntimes-db
