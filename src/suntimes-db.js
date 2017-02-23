/*jshint node: true*/

'use strict';

var CryptoJS = require ('crypto-js');
var Cloudant = require('cloudant');
var debug = require('debug')('suntimes-db');

// Make sure there is a CRYPTO_KEY environment variable
var CRYPTO_KEY = process.env.CRYPTO_KEY ;
if (!CRYPTO_KEY) {
  console.log ("suntimes.js **MISSING CRYPTO_KEY ENVIRONMENT VARIABLE** exiting");
  process.exit (1);
} else {
  console.log ("suntimes-db.js Found crypto key");
}


// Sort out the database connections and names.
var cloudant = initDBConnection();
var dbName = "iftttsuntimes";
if (process.env.NODE_ENV != "production") {
  dbName = dbName + "-" + process.env.NODE_ENV;
}
console.log ("Using DB:", dbName);
var db = cloudant.db.use(dbName);



//******************************************************************************
//
// Get the database parameters from the VCAP_SERVICES.  If running locally
// then get from the local environment.
//
//******************************************************************************
function initDBConnection() {
  var credentials = {} ;
  var vcapServices = {};
  if (process.env.VCAP_SERVICES) {
    vcapServices = JSON.parse(process.env.VCAP_SERVICES);
  } else {
    try {
      vcapServices = require('../local/VCAP_SERVICES.json');
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

  return Cloudant (credentials);

}

//******************************************************************************
//
// Does what it says on the tin
//
//******************************************************************************
var encrypt = function (plaintext) {
  return CryptoJS.AES.encrypt (plaintext, CRYPTO_KEY).toString();
};
exports.encrypt = encrypt;

//******************************************************************************
//
// Does what it says on the tin
//
//******************************************************************************
var decrypt = function (ciphertext) {
  var bytes  = CryptoJS.AES.decrypt(ciphertext.toString(), CRYPTO_KEY);
  var plaintext = bytes.toString(CryptoJS.enc.Utf8);
  return plaintext ;
};
exports.decrypt = decrypt;


//******************************************************************************
//
// Does what it says on the tin
//
//******************************************************************************
var hash = function (plaintext) {
  return CryptoJS.HmacSHA1(plaintext, CRYPTO_KEY).toString() ;
};
exports.hash = hash;

//******************************************************************************
//
// Does what it says on the tin
//
//******************************************************************************
var hashCheck = function (plaintext, hashstring) {
  if (hash(plaintext) == hashstring) {
    return true;
  } else {
    return false;
  }
};
exports.hashCheck = hashCheck;

//******************************************************************************
//
// Add a key object to the database.
//
//******************************************************************************
var addKeyObj = function (obj, callback) {
  // Try to add the key by first reading it to make sure we don't duplicate.
  debug ("addKeyObj entered:", obj);
  db.get(hash(obj.key), function(err, data) {

    debug ("addKeyObj PRE-GET:", err, data);


    var updateData = {};
    if (data) {
      // Row exists so do an update.
      updateData._id = data._id;
      updateData._rev = data._rev;

    } else {
      // No row exists
      updateData._id = hash(obj.key);
    }

    updateData.keyObj = {};
    updateData.keyObj.key = encrypt(obj.key);
    updateData.keyObj.lat = obj.lat;
    updateData.keyObj.long = obj.long;
    updateData.keyObj.loc = obj.loc;
    updateData.keyObj.timestamp = new Date();

    db.insert(updateData, function(err, data) {
      debug ("addKeyObj INSERT:", err, data);
      if (err) {
        callback (err);
      } else {
        callback (data);
      }
    });
  });
};
exports.addKeyObj = addKeyObj;

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
};
exports.getKeyObjs = getKeyObjs;

//******************************************************************************
//
// Get details about an object.
//
//******************************************************************************
var getWithKey = function (key, callback) {
  getWithID(hash(key), callback);
};
exports.getWithKey = getWithKey;

//******************************************************************************
//
// Get details about an object and decrpyts the key.
//
//******************************************************************************
var getWithID = function (id, callback) {
  debug ("getWithID entered:", id);
  db.get(id, function(err, data) {
    if (!data) {
      debug ("getWithID ERROR returned:", err);
      callback(err);
    } else {
      debug ("getWithID", data);
      if (data.keyObj) {
        var keyObj = data.keyObj;
        keyObj.key = decrypt (keyObj.key);
        debug ("getWithID returned:", data.keyObj);
        callback (data.keyObj);
      }
    }
  });
};
exports.getWithID = getWithID;

//******************************************************************************
//
// Get details about an object without decrypting the contents.
//
//******************************************************************************
var getRaw = function (id, callback) {
  debug ("getRaw entered:", id);
  db.get(id, function(err, data) {
    if (!data) {
      debug ("getRaw ERROR returned:", err);
      callback(err);
    } else {
      debug ("getRaw", data);
      if (data.keyObj) {
        var keyObj = data.keyObj;
        keyObj.key = keyObj.key;
        debug ("getRaw returned:", data.keyObj);
        callback (data.keyObj);
      }
    }
  });
};
exports.getRaw = getRaw;

//******************************************************************************
//
// Delete a key object from the database
//
//******************************************************************************
var deleteKeyObj = function (key, callback) {

  db.get(hash(key), function(err, data) {

    if (err) {
      debug ("deleteKeyObj: Error:", err);
      callback(err);
    } else {
      db.destroy(data._id, data._rev, function(err, data) {
        debug ("deleteKeyObj: Destroy:", err, data);
        if (err) {
          callback(err);
        } else {
          callback (data);
        }
      });
    }
  });
};
exports.deleteKeyObj = deleteKeyObj;
