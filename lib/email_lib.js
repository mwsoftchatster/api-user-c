/* jshint esnext: true */
var config = require('/Users/nikolajuskarpovas/Desktop/AWS/chatster_microservices/api-user-c/config/config.js');
var nodemailer = require('nodemailer');


/**
 * setup the nodemailer
 * create reusable transporter object using the default SMTP transport
 * 
 */
let transporter = nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    secure: config.email.secure,
    auth: {
        user: config.email.auth.user,
        pass: config.email.auth.pass
    }
});


/*
 * Sends email containing generated error
 * 
 */
module.exports.sendApiUserCErrorEmail = function (error) {
  var mailOptions = {
      from: '"Chatster" <mwsoft01@mwsoft.nl>', // sender address
      to: 'n.karpovas@yahoo.com', // list of receivers
      subject: 'Chatster Api User C Error', // Subject line
      text: `Chatster User C Error`, // plain text body
      html: `<p>The following error has been generated:</p> <p>${error}</p>` // html body
  };
  // send mail with defined transport object
  transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
          // console.log(error);
      }
  });
}


/*
 * Sends an email to notify of successfull startup of this service
 * 
 */
module.exports.sendNewApiUserCIsUpEmail = function () {
  var mailOptions = {
      from: '"Chatster" <mwsoft01@mwsoft.nl>', // sender address
      to: 'n.karpovas@yahoo.com', // list of receivers
      subject: 'Chatster New Api User C Server Is Up', // Subject line
      text: `Chatster New Api User C Server Is Up`
  };
  // send mail with defined transport object
  transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
          // console.log(error);
      }
  });
}


/*
 * Sends an email to notify of new user registration
 * 
 * (userId): int
 * (userName): String
 */
module.exports.sendNewUserRegisteredEmail = function (userId, userName) {
  var mailOptions = {
      from: '"Chatster" <mwsoft01@mwsoft.nl>', // sender address
      to: 'n.karpovas@yahoo.com', // list of receivers
      subject: 'Chatster New User Registered', // Subject line
      text: userName + ` Registered With Id => ` + userId
  };
  // send mail with defined transport object
  transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
          // console.log(error);
      }
  });
}


 /*
 *  Sends an email to invite user to join Chatster
 * 
 */
module.exports.inviteUser = function (req, res) {
    var mailOptions = {
        from: '"Chatster" <mwsoft01@mwsoft.nl>', // sender address
        to: req.query.inviteeEmail, // list of receivers
        subject: 'Join Chatster', // Subject line
        text: 'Hi ' + req.query.inviteeName + ', ' + req.query.userName + ` invites you to join Chatster. Click on this link to install Chatster -> https://play.google.com/store/apps/details?id=nl.mwsoft.www.chatster`
    };
    // send mail with defined transport object
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            res.json("error");
        }else{
            res.json("success");
        }
    });
}

