/*
  Copyright (C) 2017 - 2020 MWSOFT

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
/* jshint esnext: true */
var fs = require('fs');
var path = require('path');
var config = require('/Users/nikolajuskarpovas/Desktop/AWS/chatster_microservices/api-user-c/config/config.js');
var aws = require("aws-sdk");
var s3 = new aws.S3();
var admin = require('firebase-admin');
var serviceAccount = require(config.firebase.service_account);
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: config.firebase.databaseURL
});
var db = admin.database();
var ref = db.ref();
var usersRef = ref.child('users');
var rn = require('random-number');
var gen = rn.generator({
    min: 1000,
    max: 9999,
    integer: true
});
var contentType = require('content-type');
var fileType = require('file-type');
var multer = require('multer');
const uploadImageMessage = multer({
    dest: 'images/',
    limits: { fileSize: 10000000, files: 1 },
    fileFilter: (req, file, callback) => {
        if (!file.originalname.match(/\.(jpg|jpeg)$/)) {
            return callback(new Error('Only Images are allowed !'), false)
        }
        callback(null, true);
    }
}).single('image');
const uploadGroupImageMessage = multer({
    dest: 'imagesGroup/',
    limits: { fileSize: 10000000, files: 1 },
    fileFilter: (req, file, callback) => {
        if (!file.originalname.match(/\.(jpg|jpeg)$/)) {
            return callback(new Error('Only Images are allowed !'), false)
        }
        callback(null, true);
    }
}).single('image');

var email = require('/Users/nikolajuskarpovas/Desktop/AWS/chatster_microservices/api-user-c/lib/email_lib.js');
var time = require('/Users/nikolajuskarpovas/Desktop/AWS/chatster_microservices/api-user-c/lib/time_lib.js');


/**
 *  Setup the pool of connections to the db so that every connection can be reused upon it's release
 *
 */
var mysql = require('mysql');
var Sequelize = require('sequelize');
const sequelize = new Sequelize(config.db.name, config.db.user_name, config.db.password, {
    host: config.db.host,
    dialect: config.db.dialect,
    port: config.db.port,
    operatorsAliases: config.db.operatorsAliases,
    pool: {
      max: config.db.pool.max,
      min: config.db.pool.min,
      acquire: config.db.pool.acquire,
      idle: config.db.pool.idle
    }
});

/**
 *  Publishes message on api-user-q topic
 */
function publishOnUserQ(amqpConn, message, topic) {
    if (amqpConn !== null) {
        amqpConn.createChannel(function(err, ch) {
            var exchange = 'apiUserQ.*';
            var toipcName = `apiUserQ.${topic}`;
            ch.assertExchange(exchange, 'topic', { durable: true });
            ch.publish(exchange, toipcName, new Buffer(message));
        });
    }else {
        // log and send error
        email.sendApiUserCErrorEmail('API User C publishOnUserQ AMPQ connection was null');
    }
}

/**
 *  Publishes message on user-msqp topic
 */
function publishOnUserMSQP(amqpConn, message, topic) {
    if (amqpConn !== null) {
        amqpConn.createChannel(function(err, ch) {
            var exchange = 'userMSQP.*';
            var toipcName = `userMSQP.${topic}`;
            ch.assertExchange(exchange, 'topic', { durable: true });
            ch.publish(exchange, toipcName, new Buffer(message));
        });
    } else {
        // log and send error
        email.sendApiUserCErrorEmail('API User C publishOnUserMSQP AMPQ connection was null');
    }
}

/**
 *  Publishes message on api-e2e-q topic
 */
function publishOnE2EC(amqpConn, message, topic) {
    if (amqpConn !== null) {
        amqpConn.createChannel(function(err, ch) {
            var exchange = 'apiE2EC.*';
            var toipcName = `apiE2EC.${topic}`;
            ch.assertExchange(exchange, 'topic', { durable: true });
            ch.publish(exchange, toipcName, new Buffer(message));
        });
    }else {
        // log and send error
        email.sendApiUserCErrorEmail('API User C publishOnE2EQ AMPQ connection was null');
    }
}

/**
 *  Publishes message on api-creator-c topic
 */
function publishOnApiCreatorC(amqpConn, message, topic) {
    if (amqpConn !== null) {
        amqpConn.createChannel(function(err, ch) {
            var exchange = 'apiCreatorC.*';
            var toipcName = `apiCreatorC.${topic}`;
            ch.assertExchange(exchange, 'topic', { durable: true });
            ch.publish(exchange, toipcName, new Buffer(message));
        });
    }else {
        // log and send error
        email.sendApiUserCErrorEmail('API User C publishOnApiCreatorC AMPQ connection was null');
    }
}


/**
 * Creates creators folder for the user
 *
 * (req Object): object that holds all the request information
 * (res Object): object that is used to send user response
 * (image String): base64 encoded String that holds the image
 * (userCallback function): callback function upon successfull storage of the image
 */
function createCreatorFolder(req, res, image, amqpConn, userCallback) {
    let params = {
        Bucket: 'chatster-creator-posts',
        Key: `${req.query.userName}/`,
        ACL: 'public-read',
        Body: 'create folder to store posts for this creator'
    };
    s3.putObject(params, function(err, data) {
        if (!err) {
            saveUserDefaultProfilePic(req, res, image, amqpConn, userCallback);
        } else {
            email.sendApiUserCErrorEmail(err);
            res.json(null);
        }
    });
}


/**
 * Stores default img for each new user
 *
 * (req Object): object that holds all the request information
 * (res Object): object that is used to send user response
 * (image String): base64 encoded String that holds the image
 * (userCallback function): callback function upon successfull storage of the image
 */
function saveUserDefaultProfilePic(req, res, data, amqpConn, userCallback) {
    let params = {
        Bucket: 'chatster-users',
        Key: `users/${req.query.userId}.jpg`,
        Body: new Buffer(data, 'base64'),
        ContentEncoding: 'base64',
        ContentType: 'image/jpg'
    };
    s3.putObject(params, function(err, data) {
        if (!err) {
            userCallback(req, res, `//doyyiwyfw4865.cloudfront.net/users/${req.query.userId}.jpg`, amqpConn);
        } else {
            email.sendApiUserCErrorEmail(err);
            res.json(null);
        }
    });
}


/**
 *  Starts create new user routine
 *
 * (req Object): object that holds all the request information
 * (res Object): object that is used to send user response
 */
module.exports.createUser = function (req, res, amqpConn) {
    email.sendNewUserRegisteredEmail(req.query.userId, req.query.userName);
    if (req.query.userId !== null && req.query.userName !== null) {
        sequelize.query('CALL GetUserByName(?)',
        { replacements: [ req.query.userName ],
             type: sequelize.QueryTypes.RAW }).then(result => {
                 if(result.length > 0){
                    var responseUser = {
                        _id: 1234567890,
                        name: "unavailable",
                        statusMessage: "unavailable",
                        profilePic: "unavailable",
                        chatsterContacts: [0,0],
                        userAlreadyExists: true
                    };
                    // send the response object in json
                    res.json(responseUser);
                }else{
                    // call img server to create user dir and store default img in it
                    var bitmap = fs.readFileSync(config.path.userDefaultProfilePicLocalPath);
                    // convert binary data to base64 encoded string
                    var data = new Buffer(bitmap).toString('base64');
                    createCreatorFolder(req, res, data, amqpConn, userCallback);
                }
        }).error(function(err){
            email.sendApiUserCErrorEmail(err);
            res.json(null);
        });
    } else {
        res.json(null);
    }
};

/**
 *  Saves new user into database
 *
 * (req Object): object that holds all the request information
 * (res Object): object that is used to send user response
 * (userProfilePicS3Url String): URL to the users profile picture
 */
function userCallback(req, res, userProfilePicS3Url, amqpConn) {
    // check if user has entered status message 
    // if not, assign default status message
    var myutc = time.getCurrentUTC();
    var status = "";
    if (req.query.statusMessage != null) {
        if (req.query.statusMessage.length > 0) {
            status = req.query.statusMessage;
        } else {
            status = `Hi, my name is ${req.query.userName}.`;
        }
    } else {
        status = `Hi, my name is ${req.query.userName}.`;
    }

    var chatsterContacts = [];
    sequelize.query('CALL GetUsersWithIdIn(?)',
    { replacements: [ req.query.contacts.toString() ],
         type: sequelize.QueryTypes.RAW }).then(result => {
             if(result.length > 0){
                for (var i = 0; i < result.length; i++) {
                    chatsterContacts.push(parseInt(result[i].user_id));
                }
            }
            var responseUser = {
                _id: parseInt(req.query.userId),
                name: req.query.userName,
                profilePic: userProfilePicS3Url,
                statusMessage: status,
                chatsterContacts: chatsterContacts,
                userAlreadyExists: false
            };
            sequelize.query('CALL SaveNewUser(?,?,?,?,?,?,?,?)',
            { replacements: [ req.query.userId, req.query.userName, userProfilePicS3Url, status, myutc, myutc, req.query.contacts.toString(), myutc ],
                 type: sequelize.QueryTypes.RAW }).then(result => {
                     var firebaseUser = {
                        messaging_token: req.query.messagingToken
                    };
                    usersRef.child(req.query.userId).set(firebaseUser); 

                    // 1. Create and publish creator object to api-creator-c
                    var creator = {
                        creatorId: req.query.userId,
                        creatorName: req.query.userName,
                        profilePic: userProfilePicS3Url,
                        statusMessage: status,
                        creatorProfileCreated: myutc,
                        creatorProfileLastUpdated: myutc,
                        creatorPosts: 0,
                        creatorProfileViews: 0,
                        creatorTotalLikes: 0,
                        creatorWebsite: 'No website added',
                        dateCreated: myutc
                    };
                    publishOnApiCreatorC(amqpConn, JSON.stringify(creator), config.rabbitmq.topics.newCreatorU);

                    // 2. Create and publish user object to api-user-q and user-msqp 
                    var user = {
                        userId: req.query.userId,
                        userName: req.query.userName,
                        profilePic: userProfilePicS3Url,
                        statusMessage: status,
                        userProfileCreated: myutc,
                        userProfileLastUpdated: myutc,
                        contactIds: req.query.contacts.toString(),
                        dateCreated: myutc
                    };
                    publishOnUserQ(amqpConn, JSON.stringify(user), config.rabbitmq.topics.newUser);
                    publishOnUserMSQP(amqpConn, JSON.stringify(user), config.rabbitmq.topics.newUser);

                    // 3. Publish one time keys to api-e2e-c
                    publishOnE2EC(amqpConn, req.query.oneTimePreKeyPairPbks, config.rabbitmq.topics.newUserE2EKeys);

                    res.json(responseUser);
            }).error(function(err){
                email.sendApiUserCErrorEmail(err);
                res.json(null);
            });
    }).error(function(err){
        email.sendApiUserCErrorEmail(err);
        res.json(null);
    });
}


/**
 *  Checks if user name is available
 *
 * (userName String): name to be checked fot availability
 * (socket Object): Socket.IO object that is used to send user response
 */
module.exports.checkIfUserNameIsAvailable = function (userName,socket){
    sequelize.query('CALL GetUserByName(?)',
    { replacements: [ userName ],
         type: sequelize.QueryTypes.RAW }).then(result => {
            if(result.length > 0){
                socket.emit("checkUserNameAvailability", "unavailable");
            }else{
                socket.emit("checkUserNameAvailability", "available");
            } 
    }).error(function(err){
        email.sendApiUserCErrorEmail(err);
        socket.emit("checkUserNameAvailability", "error");
    });
};


/**
 *  Updates user profile pic and status message
 *
 * (userId int): id of the user who's profile picture and status are to be updated
 * (statusMessage String): status message
 * (profilePicUrl String): URL to profile picture
 * (socket Object): Socket.IO object that is used to send user response
 */
function updateStatusAndProfilePic(userId, statusMessage, profilePicUrl, socket, amqpConn){
    // update statusMessage and profile pic for user with id
    sequelize.query('CALL UpdateUserStatusAndProfilePicture(?,?,?)',
        { replacements: [ userId.toString(), statusMessage, profilePicUrl ],
            type: sequelize.QueryTypes.RAW }).then(result => {
                socket.emit("updatedUser", "success");
                var message = {
                    userId: userId.toString(),
                    statusMessage: statusMessage,
                    profilePicUrl: profilePicUrl
                };
                publishOnUserQ(amqpConn, JSON.stringify(message), config.rabbitmq.topics.userUpdateProfile);
                publishOnUserMSQP(amqpConn, JSON.stringify(message), config.rabbitmq.topics.userUpdateProfile);
    }).error(function(err){
        email.sendApiUserCErrorEmail(err);
        socket.emit("updatedUser", "error");
    });
}

module.exports.updateUserProfilePic = function (userId, statusMessage, profilePic, socket, amqpConn) {    
    let params = {
        Bucket: 'chatster-users',
        Key: `users/${userId}.jpg`,
        Body: new Buffer(profilePic, 'base64'),
        ContentEncoding: 'base64',
        ContentType: 'image/jpg'
    };
    s3.putObject(params, function(err, data) {
        if (err) {
            socket.emit("updatedUser", "error");
            email.sendApiUserCErrorEmail(err);
        }else{
            var profilePicUrl = `//doyyiwyfw4865.cloudfront.net/${params.Key}`;
            updateStatusAndProfilePic(userId, statusMessage, profilePicUrl, socket, amqpConn);
        }
    });
};


/**
 *  Updates user is allowed to unsend
 *
 * (userId int): id of the user of who is allowing their contact to unsend messages
 * (contactId int): id of the contact to whom the user is allowing to unsend messages
 * (socket Object): Socket.IO object that is used to send user response
 */
module.exports.updateUserIsAllowedToUnsend = function (userId, contactId, socket, amqpConn){
    sequelize.query('CALL UpdateContactIsAllowedToUnsend(?,?)',
    { replacements: [ userId, contactId ],
         type: sequelize.QueryTypes.RAW }).then(result => {
             socket.emit("updatedUnsend", "success");
             var message = {
                userId: userId,
                contactId: contactId
             };
             publishOnUserQ(amqpConn, JSON.stringify(message), config.rabbitmq.topics.userAllowUnsend);
             publishOnUserMSQP(amqpConn, JSON.stringify(message), config.rabbitmq.topics.userAllowUnsend);
    }).error(function(err){
        email.sendApiUserCErrorEmail(err);
        socket.emit("updatedUnsend", "error");
    });
};


/**
 *  Updates user is not allowed to unsend
 *
 * (userId int): id of the user of who is not allowing their contact to unsend messages
 * (contactId int): id of the contact to whom the user is not allowing to unsend messages
 * (socket Object): Socket.IO object that is used to send user response
 */
module.exports.updateUserIsNotAllowedToUnsend = function (userId, contactId, socket, amqpConn){
    sequelize.query('CALL UpdateContactIsNotAllowedToUnsend(?,?)',
    { replacements: [ userId, contactId ],
         type: sequelize.QueryTypes.RAW }).then(result => {
             socket.emit("updatedUnsend", "success");
             var message = {
                userId: userId,
                contactId: contactId
             };
             publishOnUserQ(amqpConn, JSON.stringify(message), config.rabbitmq.topics.userDisAllowUnsend);
             publishOnUserMSQP(amqpConn, JSON.stringify(message), config.rabbitmq.topics.userDisAllowUnsend);
    }).error(function(err){
        email.sendApiUserCErrorEmail(err);
        socket.emit("updatedUnsend", "error");
    });
};


/**
 *  Updates users Firebase messaging token
 *
 * (req Object): object that holds all the request information
 * (res Object): object that is used to send user response
 */
module.exports.updateUserMessagingToken = function (req, res){
    if (req.query.userId !== null && req.query.messagingToken !== null) {
        usersRef.child(req.query.userId).child("messaging_token").set(req.query.messagingToken);
        res.json("doneUpdatingToken");
    } else {
        res.json("UpdatingTokenWrongValues");
    }
};


/**
 *  Sends user an email with an invitation to join Chatster
 *
 * (req Object): object that holds all the request information
 * (res Object): object that is used to send user response
 */
module.exports.inviteUser = function (req, res){
    email.inviteUser(req,res);
};