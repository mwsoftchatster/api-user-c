/* jshint esnext: true */
require('events').EventEmitter.prototype._maxListeners = 0;
var config = require('/Users/nikolajuskarpovas/Desktop/AWS/chatster_microservices/api-user-c/config/config.js');
var email = require('/Users/nikolajuskarpovas/Desktop/AWS/chatster_microservices/api-user-c/lib/email_lib.js');
var functions = require('/Users/nikolajuskarpovas/Desktop/AWS/chatster_microservices/api-user-c/lib/func_lib.js');
var fs = require("fs");
var express = require("express");
var http = require('http');
var https = require('https');
var amqp = require('amqplib/callback_api');
var options = {
    key: fs.readFileSync(config.security.key),
    cert: fs.readFileSync(config.security.cert)
};
var app = express();
var bodyParser = require("body-parser");
var cors = require("cors");
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.raw({ limit: '50mb' }));
app.use(bodyParser.text({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: false }));
app.use(express.static("./public"));
app.use(cors());

app.use(function(req, res, next) {
    next();
});

var server = https.createServer(options, app).listen(config.port.user_c_port, function() {
    email.sendNewApiUserCIsUpEmail();
});

/**
 *   RabbitMQ connection object
 */
var amqpConn = null;


/**
 *  Subscribe api-user-c to topic to receive messages
 */
function subscribeToUserC(topic) {
    if (amqpConn !== null) {
        amqpConn.createChannel(function(err, ch) {
            var exchange = 'apiUserC.*';
            var toipcName = `apiUserC.${topic}`;
            ch.assertExchange(exchange, 'topic', { durable: true });
            ch.assertQueue(toipcName, { exclusive: false, auto_delete: true }, function(err, q) {
                ch.bindQueue(q.queue, exchange, toipcName);
                ch.consume(q.queue, function(msg) {
                    // check if status ok or error
                    var message = JSON.parse(msg.content.toString());
                    if (toipcName === `apiUserC.${config.rabbitmq.topics.newUserProcessedQ}`){
                        if (message.status === config.rabbitmq.statuses.error) {
                            // fetch used data from api-user-c db and publish it again
                            // if error persists after specified number of retries, notify and stop for a specified period
                            // after specified period expires try again
                        } 
                    } else if (toipcName === `apiUserC.${config.rabbitmq.topics.newUserProcessedMSQP}`){
                        if (message.status === config.rabbitmq.statuses.error) {
                            // fetch used data from api-user-c db and publish it again
                            // if error persists after specified number of retries, notify and stop for a specified period
                            // after specified period expires try again
                        } 
                    } else if (toipcName === `apiUserC.${config.rabbitmq.topics.userUpdateProfileQ}`){
                        if (message.status === config.rabbitmq.statuses.error) {
                            // fetch used data from api-user-c db and publish it again
                            // if error persists after specified number of retries, notify and stop for a specified period
                            // after specified period expires try again
                        } 
                    } else if (toipcName === `apiUserC.${config.rabbitmq.topics.userAllowUnsendQ}`){
                        if (message.status === config.rabbitmq.statuses.error) {
                            // fetch used data from api-user-c db and publish it again
                            // if error persists after specified number of retries, notify and stop for a specified period
                            // after specified period expires try again
                        } 
                    } else if (toipcName === `apiUserC.${config.rabbitmq.topics.userDisAllowUnsendQ}`){
                        if (message.status === config.rabbitmq.statuses.error) {
                            // fetch used data from api-user-c db and publish it again
                            // if error persists after specified number of retries, notify and stop for a specified period
                            // after specified period expires try again
                        } 
                    } else if (toipcName === `apiUserC.${config.rabbitmq.topics.userUpdateProfileMSQP}`){
                        if (message.status === config.rabbitmq.statuses.error) {
                            // fetch used data from api-user-c db and publish it again
                            // if error persists after specified number of retries, notify and stop for a specified period
                            // after specified period expires try again
                        } 
                    } else if (toipcName === `apiUserC.${config.rabbitmq.topics.userAllowUnsendMSQP}`){
                        if (message.status === config.rabbitmq.statuses.error) {
                            // fetch used data from api-user-c db and publish it again
                            // if error persists after specified number of retries, notify and stop for a specified period
                            // after specified period expires try again
                        } 
                    } else if (toipcName === `apiUserC.${config.rabbitmq.topics.userDisAllowUnsendMSQP}`){
                        if (message.status === config.rabbitmq.statuses.error) {
                            // fetch used data from api-user-c db and publish it again
                            // if error persists after specified number of retries, notify and stop for a specified period
                            // after specified period expires try again
                        } 
                    } else if (toipcName === `apiUserC.${config.rabbitmq.topics.newCreatorC}`){
                        if (message.status === config.rabbitmq.statuses.error) {
                            // fetch used data from api-user-c db and publish it again
                            // if error persists after specified number of retries, notify and stop for a specified period
                            // after specified period expires try again
                        } 
                    }  
                }, { noAck: true });
            });
        });
    }
}

/**
 *  Connect to RabbitMQ
 */
function connectToRabbitMQ() {
    amqp.connect(config.rabbitmq.url, function(err, conn) {
        if (err) {
            console.error("[AMQP]", err.message);
            return setTimeout(connectToRabbitMQ, 1000);
        }
        conn.on("error", function(err) {
            if (err.message !== "Connection closing") {
                console.error("[AMQP] conn error", err.message);
            }
        });
        conn.on("close", function() {
            console.error("[AMQP] reconnecting");
            return setTimeout(connectToRabbitMQ, 1000);
        });
        console.log("[AMQP] connected");
        amqpConn = conn;

        // Subscribe to all the topics
        subscribeToUserC(config.rabbitmq.topics.newUserProcessedQ);
        subscribeToUserC(config.rabbitmq.topics.newUserProcessedMSQP);
        subscribeToUserC(config.rabbitmq.topics.userUpdateProfile);
        subscribeToUserC(config.rabbitmq.topics.newCreatorC);
    });
}

connectToRabbitMQ();


/**
 *  SOCKET.IO listeners
 */
var io = require("socket.io")(server, { transports: ['websocket'] });
io.sockets.on("connection", function(socket) {
    console.log("socket id => " + socket.id + " has connected");
    /**
     * on.updateUser listens for update user info events
     */
    socket.on("updateUser", function(userId, statusMessage, profilePic) {
        console.log("updateUser has been called");
        // send post req to img server to update profile pic
        functions.updateUserProfilePic(userId, statusMessage, profilePic, socket, amqpConn);
    });
    
    /**
     * on.unsendAllow listens for allow unsend messages events
     */
    socket.on("unsendAllow", function(userId, contactId) {
        functions.updateUserIsAllowedToUnsend(userId, contactId, socket, amqpConn);
    });
    
    /**
     * on.unsendForbid listens for forbid unsend messages events
     */
    socket.on("unsendForbid", function(userId, contactId) {
        functions.updateUserIsNotAllowedToUnsend(userId, contactId, socket, amqpConn);
    });
    
    /**
     * on.disconnect listens for disconnect events
     */
    socket.on("disconnect", function() {
        console.log("socket id => " + socket.id + " has disconnected");
    });
}); 


/**
 *  POST createUser request
 * 
 * (req Object): object that holds all the request information
 * (res Object): object that is used to send user response
 */
app.post("/createUser", function(req, res) {
    functions.createUser(req, res, amqpConn);
});


/**
 *  POST update user messaging token
 * 
 * (req Object): object that holds all the request information
 * (res Object): object that is used to send user response
 */
app.post("/updateUserMessagingToken", function(req, res) {
    functions.updateUserMessagingToken(req, res);
});


/**
 *  POST invite user to join Chatster
 * 
 * (req Object): object that holds all the request information
 * (res Object): object that is used to send user response
 */
app.post("/inviteUser", function(req, res) {
    functions.inviteUser(req,res);
});