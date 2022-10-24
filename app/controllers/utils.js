var utils = require('./utils');
require('./constant');
var City = require('mongoose').model('City');
var moment = require('moment');
var moment_timezone = require('moment-timezone');
var nodemailer = require('nodemailer');
var fs = require("fs");
var twilio = require('twilio');
var SmsDetail = require('mongoose').model('sms_detail');
var Settings = require('mongoose').model('Settings');
var Wallet_history = require('mongoose').model('Wallet_history');
var Document = require('mongoose').model('Document');
var User_Document = require('mongoose').model('User_Document');
var Provider_Document = require('mongoose').model('Provider_Document');
var Transfer_History = require('mongoose').model('transfer_history');
var CityZone = require('mongoose').model('CityZone');
var AWS = require('aws-sdk');
var console = require('./console');
config_json = require('../../admin_panel_string.json');
constant_json = require('../../constants.json');
var Provider = require('mongoose').model('Provider');
var FCM = require('fcm-node');
var jwt = require('jsonwebtoken')
var path = require('path');
var apn = require("apn")
var Partner = require('mongoose').model('Partner');

exports.error_response = function(err, res){
    console.log(err);
    res.json({
        success: false,
        error_code: error_message.ERROR_CODE_SOMETHING_WENT_WRONG
    });
}

exports.check_request_params = function (request_data_body, params_array, response) {
  var missing_param = '';
  var is_missing = false;
  var invalid_param = '';
  var is_invalid_param = false;
  if(request_data_body){
      params_array.forEach(function (param) {
        if(request_data_body[param.name] == undefined){
          missing_param = param.name;
          is_missing = true;
        } else {
          if(typeof request_data_body[param.name] !== param.type){
            is_invalid_param = true;
            invalid_param = param.name;
          }
        }
      });

      if(is_missing){
        response({success: false, error_code:  error_message.ERROR_CODE_PARAMETER_MISSING , error_description: missing_param+' parameter missing'});
      } else if(is_invalid_param){
        response({success: false, error_code:  error_message.ERROR_CODE_PARAMETER_INVALID, error_description: invalid_param+' parameter invalid'});
      }
      else {
        response({success: true});
      }
    }
      else {
        response({success: true});
      }
}

exports.check_request_params_for_web = function (request_data_body, params_array, response) {
  var missing_param = '';
  var is_missing = false;
  var invalid_param = '';
  var is_invalid_param = false;
  if(request_data_body){
      params_array.forEach(function (param) {
        if(request_data_body[param.name] == undefined){
          missing_param = param.name;
          is_missing = true;
        } else {
          if(typeof request_data_body[param.name] !== param.type){
            is_invalid_param = true;
            invalid_param = param.name;
          }
        }
      });

      if(is_missing){
        response({success: false, error_code:  error_message.PARAMETER_MISSING , error_description: missing_param+' parameter missing'});
      } else if(is_invalid_param){
        response({success: false, error_code:  error_message.PARAMETER_INVALID, error_description: invalid_param+' parameter invalid'});
      }
      else {
        response({success: true});
      }
  }
      else {
        response({success: true});
      }
}

exports.generate_token = function(){
    try {
        var token = jwt.sign({}, TOKEN_SECRET, { expiresIn: 120 });
        return {
            success:true,
            data:token
        }        
      } catch(err) {
        return {
            success:false,
            data:null
        };
      }
}

exports.sendSMS = function (to, msg) {
    Settings.findOne({}, function (err, setting) {
        if (setting)
        {

            var twilio_account_sid = setting.twilio_account_sid;
            var twilio_auth_token = setting.twilio_auth_token;
            var twilio_number = setting.twilio_number;
            if (twilio_account_sid != "" && twilio_auth_token != "" && twilio_number != "")
            {
                var client = new twilio(twilio_account_sid, twilio_auth_token);

                client.messages.create({
                    body: msg,
                    to: to, // Text this number
                    from: twilio_number // From a valid Twilio number
                }, function (err) {
                    if (err) {
                        console.error(err);
                    } else {
                        console.log("here send sms ... ... ...");
                    }
                });

                /*var client = twilio(twilio_account_sid, twilio_auth_token, twilio_number);
                 
                 try {
                 client.sendMessage({
                 to: to,
                 from: twilio_number,
                 body: msg
                 });
                 console.log("send sms ... ... ...");
                 
                 } catch (error) {
                 console.error(error);
                 }*/
            }
        }
    });
}

exports.sendSmsForOTPVerificationAndForgotPassword = function (phoneWithCode, smsID, extraParam) {
    SmsDetail.findOne({smsUniqueId: smsID}, function (err, sms_data) {
        var smsContent = sms_data.smsContent;
        if (smsID == 1 || smsID == 2 || smsID == 3) {
            smsContent = smsContent.replace("XXXXXX", extraParam);
        } else if (smsID == 7) {
            smsContent = smsContent.replace("%USERNAME%", extraParam[0]).replace("%PROVIDERNAME%", extraParam[1]).replace("%PICKUPADD%", extraParam[2]).replace("%DESTINATIONADD%", extraParam[3]);
        }

        utils.sendSMS(phoneWithCode, smsContent);
    });
};

exports.sendOtherSMS = function (phoneWithCode, smsID) {
    SmsDetail.findOne({smsUniqueId: smsID}, function (err, sms_data) {
        utils.sendSMS(phoneWithCode, sms_data.smsContent);
    });
};

///////////////// SEND SMS TO EMERGENCY  CONTACT///////
exports.sendSmsToEmergencyContact = function (phoneWithCode, smsID, extraParam, url) {
    SmsDetail.findOne({smsUniqueId: smsID}, function (err, sms_data) {
        var smsContent = sms_data.smsContent;
        if (smsID == 8) {
            smsContent = smsContent.replace("%USERNAME%", extraParam);
            smsContent = smsContent + url;
        }

        utils.sendSMS(phoneWithCode, smsContent);
    });
};


/////////////////////////////////////////////////////

exports.mail_notification = function (to, sub, text, html) {

    try {
        Settings.findOne({}, function (err, setting) {

            var email = setting.email;
            var password = setting.password;
            var smtp_configuration = {}

            if(setting.domain == 'gmail'){
                smtp_configuration = {
                    service: 'gmail',
                    auth: {
                        user: email, // Your email id
                        pass: password // Your password
                    }
                }
            } else {
                var secure = false;
                if(setting.smtp_port == 465){
                    secure = true;
                }

                smtp_configuration = {
                    host: setting.smtp_host,
                    port: setting.smtp_port,
                    secure: secure, 
                    auth: {
                        user: email, 
                        pass: password 
                    }
                }
            }
            var transporter = nodemailer.createTransport(smtp_configuration);
            var mailOptions = {
                from: email,
                to: to,
                subject: sub,
                text: text,
                html: html
            }

            transporter.sendMail(mailOptions, function (error, info) {
                if (error) {
                    console.log(error);
                } else {

                    console.log(info.response);
                };
            });
        });

    } catch (error) {
        console.error(error);
    }
};

////////////// TOKEN GENERATE ////////
exports.tokenGenerator = function (length) {

    if (typeof length == "undefined")
        length = 32;
    var token = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (var i = 0; i < length; i++)
        token += possible.charAt(Math.floor(Math.random() * possible.length));
    return token;

};

////////FOR Distance
exports.getDistanceFromTwoLocation = function (fromLocation, toLocation) {

    var lat1 = fromLocation[0];
    var lat2 = toLocation[0];
    var lon1 = fromLocation[1];
    var lon2 = toLocation[1];

    ///////  TOTAL DISTANCE ////

    var R = 6371; // km (change this constant to get miles)
    var dLat = (lat2 - lat1) * Math.PI / 180;
    var dLon = (lon2 - lon1) * Math.PI / 180;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

///////////// FOR IOS CERTIFICATE //////

exports.getIosCertiFolderName = function (id) {
    switch (id) {
        case 1:// ios_push
            return 'ios_push/';

        default:
            break;
    }
};

exports.saveIosCertiFolderPath = function (id) {
    return './app/' + utils.getIosCertiFolderName(id);
};

exports.saveIosCertiFromBrowser = function (local_image_path, image_name, id) {
    var file_new_path = utils.saveIosCertiFolderPath(id) + image_name;
    // start 31 march 
    fs.readFile(local_image_path, function (err, data) {
        fs.writeFile(file_new_path, data, 'binary', function (err) {
            if (err) {
            } else {
                    fs.unlink(local_image_path, function(error) {
                        if(error){
                            console.log(error);
                        } else {

                            response = {
                                message: 'File uploaded successfully'
                            };
                        }
                    });
            }
        });
    });
};
/////////////////////////////////

exports.getImageFolderName = function (id) {
    switch (id) {
        case 1: // user
            return 'user_profile/';
        case 2: // provider
            return 'provider_profile/';
        case 3: // provider
            return 'provider_document/';
        case 4: // provider
            return 'service_type_images/';
        case 5: // provider
            return 'service_type_map_pin_images/';
        case 6: //  web_images
            return 'web_images/';
        case 7: // partner
            return 'partner_profile/';
        case 8: // partner
            return 'partner_document/';
        case 9: // partner
            return 'user_document/';
        default:
            break;
    }
};

exports.getImageFolderPath = function (req, id) {
    //// return req.protocol + '://' + req.get('host') + utils.getImageFolderName(id);
    return utils.getImageFolderName(id);
};

exports.saveImageFolderPath = function (id) {

    if(setting_detail.is_use_aws_bucket){
        return utils.getImageFolderName(id);
    } else {
        return './data/' + utils.getImageFolderName(id);
    }
};

exports.saveImageFromBrowser = function (local_image_path, image_name, id) {
    var file_new_path = utils.saveImageFolderPath(id) + image_name;

    if(setting_detail.is_use_aws_bucket) {
        AWS.config.update({accessKeyId: setting_detail.access_key_id, secretAccessKey: setting_detail.secret_key_id});
        fs.readFile(local_image_path, function (err, data) {
            var s3 = new AWS.S3();
            var base64data = new Buffer(data, 'binary');
            s3.putObject({
                Bucket: setting_detail.aws_bucket_name,
                Key: file_new_path,
                Body: base64data,
                ACL: 'public-read'
            }, function () {
                // fs.unlink(local_image_path);
            });
        });
    } else {
        fs.readFile(local_image_path, function (err, data) {
            fs.writeFile(file_new_path, data, 'binary', function (err) {
                if (err) {
                } else {
                    // fs.unlink(local_image_path);
                    response = {
                        message: 'File uploaded successfully'
                    };
                }
            });
        });
    }
};


exports.saveImageAndGetURL = function (imageID, req, res, id) {
    var pictureData = req.body.pictureData;
    function decodeBase64Image(dataString) {
        res.pictureData = new Buffer(pictureData, 'base64');
        return res;
    }
    var urlSavePicture = utils.saveImageFolderPath(id);
    urlSavePicture = urlSavePicture + imageID + '.jpg';
    var imageBuffer = decodeBase64Image(pictureData);

    if(setting_detail.is_use_aws_bucket) {

        AWS.config.update({accessKeyId: setting_detail.access_key_id, secretAccessKey: setting_detail.secret_key_id});

        var s3 = new AWS.S3();
        s3.putObject({
            Bucket: setting_detail.aws_bucket_name,
            Key: urlSavePicture,
            Body: imageBuffer.pictureData,
            ACL: 'public-read'
        }, function () {
            // fs.unlink(local_image_path);
        });

    } else {
        pictureData = pictureData.replace(/^data:image\/png;base64,/, "");
        fs.writeFile(urlSavePicture, pictureData, 'base64', function () {
            // fs.unlink(imageID);
        });
    }

};

exports.deleteImageFromFolder = function (old_img_path, id) {


    if (old_img_path != "" || old_img_path != null) {
        var old_file_name = old_img_path.split('/');

        var fs = require('fs');

        var old_file_path = utils.saveImageFolderPath(id) + old_file_name[1];

        if(setting_detail.is_use_aws_bucket){
            AWS.config.update({accessKeyId: setting_detail.access_key_id, secretAccessKey: setting_detail.secret_key_id});
            var s3 = new AWS.S3();
            s3.deleteObject({
                Bucket: setting_detail.aws_bucket_name,
                Key: old_file_path
            },function (){})
        } else {
            fs.unlink(old_file_path, function (err) {
                if (err) {
                    console.error(err);
                } else {
                    console.log('successfully remove image');
                }
            });
        }
    }

};

// OTHER
exports.getTimeDifferenceInSecond = function (endDate, startDate) {

    var difference = 0;
    var startDateFormat = moment(startDate, constant_json.DATE_FORMAT);
    var endDateFormat = moment(endDate, constant_json.DATE_FORMAT);
    difference = endDateFormat.diff(startDateFormat, 'seconds')
    difference = (difference.toFixed(2));

    return difference;
};

exports.getTimeDifferenceInMinute = function (endDate, startDate) {

    var difference = 0;
    var startDateFormat = moment(startDate, constant_json.DATE_FORMAT);
    var endDateFormat = moment(endDate, constant_json.DATE_FORMAT);
    difference = endDateFormat.diff(startDateFormat, 'minutes')
    difference = (difference.toFixed(2));

    return difference;
};

exports.sendMassPushNotification = function (app_type, device_type, device_token, messageCode) {
    try {
        if (device_type == constant_json.PUSH_DEVICE_TYPE_ANDROID) {
            Settings.findOne({}, function (err, setting_data) {
                var android_provider_app_gcm_key = setting_data.android_provider_app_gcm_key;
                var android_user_app_gcm_key = setting_data.android_user_app_gcm_key;

                var sender_key;
                var regTokens = device_token;

                if (app_type == constant_json.PROVIDER_UNIQUE_NUMBER) {

                    sender_key = android_provider_app_gcm_key;
                } else {
                    sender_key = android_user_app_gcm_key;
                }

                var fcm = new FCM(sender_key);

                var message = {
                    registration_ids: regTokens, // required
                    data: {
                        id: messageCode,
                    }
                };

                try {
                    fcm.send(message, function (err, messageId) {
                        if (err) {
                            // console.log(err)
                            // console.log("Something has gone wrong!");
                        } else {
                            console.log("Sent with message ID: ", messageId);
                        }
                    });
                } catch (error) {

                    //throw error
                    console.error(error);
                }

            });

        }

        ///////////// IOS PUSH NOTIFICATION ///////////
        if (device_type == constant_json.PUSH_DEVICE_TYPE_IOS) {
            if (device_token == "" || device_token == null) {
                console.log("IOS PUSH NOTIFICATION NOT SENT");
            } else {
                console.log("IOS PUSH NOTIFICATION");

                Settings.findOne({}, function (error, setting) {

                    var ios_certificate_mode = setting.ios_certificate_mode;
                    var ios_push_certificate_path = constant_json.PUSH_CERTIFICATE_PATH;
                    var teamId = setting.team_id;
                    var keyId = setting.key_id;
                    var bundle_id;
                    var cert_file_name = constant_json.IOS_CERT_FILE_NAME;
                    cert_file_name = path.join(ios_push_certificate_path, cert_file_name)

                    if (app_type == constant_json.PROVIDER_UNIQUE_NUMBER) {
                        bundle_id = setting.provider_bundle_id;
                    } else {
                        bundle_id = setting.user_bundle_id;
                    }

                    try {
                        var is_production = false
                        if (ios_certificate_mode == "production") {
                            is_production = true;
                        } else {
                            is_production = false;
                        }

                        var options = {
                            token: {
                                key: cert_file_name,
                                keyId: keyId,
                                teamId: teamId
                            },
                            production: is_production
                        };

                        var apnProvider = new apn.Provider(options);
                        var note = new apn.Notification();
                        note.expiry = Math.floor(Date.now() / 1000) + 3600; // Expires 1 hour from now.
                        note.badge = 1;
                        note.sound = 'default';
                        note.alert = { "loc-key": messageCode, "id": messageCode };
                        note.payload = { 'messageFrom': 'Caroline' };
                        note.topic = bundle_id;
                        apnProvider.send(note, device_token).then(() => {
                        });

                    } catch (err) {
                        console.log(err);
                    }

                });

            }
        }
    } catch (err) {
        console.log(err)
    }
};

exports.sendPushNotification = function (app_type, device_type, device_token, messageCode, soundFileName, extraParam) {
    try {
        var serverKey = '';
        var android_user_app_gcm_key = setting_detail.android_user_app_gcm_key;
        var android_provider_app_gcm_key = setting_detail.android_provider_app_gcm_key;

        if (app_type == constant_json.PROVIDER_UNIQUE_NUMBER) {
            serverKey = android_provider_app_gcm_key;
        } else {
            serverKey = android_user_app_gcm_key;
        }

        var fcm = new FCM(serverKey);
        var message = {
            to: device_token,
            data: {
                id: (messageCode).toString(),
                extraParam: extraParam
            },
            notification: {
                body_loc_key: 'PUSH_MESSAGE_' + (messageCode).toString(),
                sound: 'default'   //FOR IOS
            },
            sound: 'enabled' //FOR ANDROID
        };

        if ((messageCode).toString() == (push_messages.PUSH_CODE_FOR_PROVIDER_LOGIN_IN_OTHER_DEVICE).toString()) {
            delete message.notification;
        }

        //added for new push tone
        if ((messageCode).toString() == (push_messages.PUSH_CODE_FOR_NEW_TRIP).toString()) {
            message = {
                to: device_token,
                data: {
                    id: (messageCode).toString(),
                    sound: 'request_sound',
                    extraParam: extraParam
                },
                notification: {
                    body_loc_key: 'PUSH_MESSAGE_' + (messageCode).toString(),
                    android_channel_id: 'newTrip'
                },
                sound: 'enabled' //FOR ANDROID
            };
        }

        fcm.send(message, function (err) {
            if (err) {
                //   console.log(err)
                //   console.log("Something has gone wrong!");
            } else {
                //   console.log("Successfully sent with response: ", response);
            }
        });


        ///////////// IOS PUSH NOTIFICATION ///////////
        if (device_type == constant_json.PUSH_DEVICE_TYPE_IOS) {
            if (device_token == "" || device_token == null) {
                console.log("IOS PUSH NOTIFICATION NOT SENT");
            } else {
                console.log("IOS PUSH NOTIFICATION");

                Settings.findOne({}, function (error, setting) {

                    var ios_certificate_mode = setting.ios_certificate_mode;
                    var ios_push_certificate_path = constant_json.PUSH_CERTIFICATE_PATH;
                    var teamId = setting.team_id;
                    var keyId = setting.key_id;
                    var bundle_id;
                    var cert_file_name = constant_json.IOS_CERT_FILE_NAME;
                    cert_file_name = path.join(ios_push_certificate_path, cert_file_name)

                    if (app_type == constant_json.PROVIDER_UNIQUE_NUMBER) {
                        bundle_id = setting.provider_bundle_id;
                    } else {
                        bundle_id = setting.user_bundle_id;
                    }

                    try {
                        var is_production = false
                        if (ios_certificate_mode == "production") {
                            is_production = true;
                        } else {
                            is_production = false;
                        }

                        var options = {
                            token: {
                                key: cert_file_name,
                                keyId: keyId,
                                teamId: teamId
                            },
                            production: is_production
                        };

                        var apnProvider = new apn.Provider(options);
                        var note = new apn.Notification();
                        note.expiry = Math.floor(Date.now() / 1000) + 3600; // Expires 1 hour from now.
                        note.badge = 1;
                        note.sound = 'default';

                        //added for new push tone
                        if ((messageCode).toString() == (push_messages.PUSH_CODE_FOR_NEW_TRIP).toString()) {
                            note.sound = 'request_sound.caf';
                        }
                        note.alert = { "loc-key": messageCode, "id": messageCode };
                        note.payload = { 'messageFrom': 'Caroline' };
                        note.topic = bundle_id;
                        apnProvider.send(note, device_token).then(() => {
                        });

                    } catch (err) {
                        console.log(err);
                    }

                });

            }
        }
    } catch (err) {
        console.log(err)
    }
};

var PAYMENT_TYPES = [
    {id: 10, name: "Stripe"}

];

exports.PAYMENT_TYPES = function () {
    return PAYMENT_TYPES;
}
/////////////////////////////////////////

exports.getSmoothPath = function (main_path_location, response) {

    var size = main_path_location.length;
    var main_gap = 100;
    var new_result = '';

    if (size > 2) {

        if (size > main_gap) {
            var pre_point = main_path_location[0];
            var result = [];
            result.push(pre_point);
            var point = [];

            var start_index = 5;
            var end_index = size - start_index;

            for (var i = 0; i < size; i++) {
                point = main_path_location[i];

                if (i < start_index || i > end_index) {
                    result.push(point);
                } else if (utils.getDistanceFromTwoLocation(point, pre_point) > 0.01) {
                    pre_point = main_path_location[i];
                    result.push(point);
                }
            }

            size = result.length;

            var gap = (size / main_gap);
            var gap2 = Math.ceil(gap);
            var gap1 = Math.floor(gap);
            var x = (gap - gap1) * main_gap;
            var k = 0;

            for (var i = 0; i < size; ) {

                new_result = new_result + result[i][0] + "," + result[i][1] + "|";
                if (k <= x) {
                    // console.log(k + " " + gap2)
                    i = i + gap2;
                } else {
                    // console.log(k + " " + gap1)
                    i = i + gap1;
                }
                k++;
            }
            new_result = new_result.substring(0, new_result.length - 1);
            response(new_result);

            // return new_result
        } else if (size > 2) {
            for (var i = 0; i < size; i++) {
                new_result = new_result + main_path_location[i][0] + "," + main_path_location[i][1] + "|";
            }
            new_result = new_result.substring(0, new_result.length - 1);
            response(new_result);
        } else {
            response(new_result);
        }

    } else {
        response('');
    }
};

exports.bendAndSnap = function (points_in_string, location_length, bendAndSnapresponse) {

    var request = require('request');
    var base_url = "https://roads.googleapis.com/v1/snapToRoads?";

    if (points_in_string !== '' && location_length > 2)
    {
        Settings.findOne({}, function (err, setting_detail) {
            var google_key = setting_detail.road_api_google_key;
            if (google_key !== '' && google_key !== null && google_key !== undefined) {

                var path_cord = "path=" + points_in_string;
                var url = base_url + path_cord + "&interpolate=true&key=" + google_key;

                request(url, function (error, response, body) {
                    if (!error && response.statusCode == 200) {
                        utils.processSnapToRoadResponse(body, function (finalRoadCoordinates) {

                            var cord_size = finalRoadCoordinates.length;
                            var temp_array = [];
                            var distance = 0;
                            var d = 0;
                            for (var i = 0; i < cord_size; i++) {
                                if (i != 0) {
                                    d = utils.getDistanceFromTwoLocation(finalRoadCoordinates[i - 1], finalRoadCoordinates[i]);
                                }
                                distance = +distance + +d;
                                temp_array.push(finalRoadCoordinates[i]);
                                if (i == cord_size - 1) {
                                    bendAndSnapresponse({temp_array: temp_array, distance: distance})

                                }
                            }
                        });
                    } else {
                        bendAndSnapresponse(null)
                    }
                });
            } else {
                bendAndSnapresponse(null)
            }
        })
    } else {
        bendAndSnapresponse(null)
    }
};

exports.processSnapToRoadResponse = function (data, SnapRoadResponse) {
    var finalRoadCoordinates = [];
    var snappedPoints = [];
    try {
        snappedPoints = (JSON.parse(data)).snappedPoints;
        var size = snappedPoints.length;
        for (var i = 0; i < size; i++) {

            finalRoadCoordinates.push([snappedPoints[i].location.latitude, snappedPoints[i].location.longitude]);

            if (i == size - 1) {
                SnapRoadResponse(finalRoadCoordinates)
            }
        }
    } catch (exception) {
        snappedPoints = [];
        SnapRoadResponse(snappedPoints)
    }

};


exports.precisionRoundTwo = function (number) {
    return utils.precisionRound(number, 2);
};

exports.precisionRound = function (number, precision) {
    var factor = Math.pow(10, precision);
    return Math.round(number * factor) / factor;
};



// add_wallet_history
exports.addWalletHistory = function (user_type, user_unique_id, user_id, country_id, from_currency_code, to_currency_code,
        current_rate, from_amount, wallet_amount, wallet_status, wallet_comment_id, wallet_description) {
    var wallet_payment_in_user_currency = 0;
    var total_wallet_amount = 0;

    if (wallet_status % 2 == 0)
    {
        wallet_payment_in_user_currency = utils.precisionRoundTwo(from_amount / current_rate);

        total_wallet_amount = wallet_amount - wallet_payment_in_user_currency;
    } else
    {
        current_rate = 1 / current_rate;
        wallet_payment_in_user_currency = utils.precisionRoundTwo(from_amount * current_rate);

        total_wallet_amount = +wallet_amount + +wallet_payment_in_user_currency;

    }
    total_wallet_amount = utils.precisionRoundTwo(total_wallet_amount);


    var wallet_data = new Wallet_history({
        user_type: user_type,
        user_unique_id: user_unique_id,
        user_id: user_id,
        country_id: country_id,

        from_currency_code: from_currency_code,
        from_amount: from_amount,
        to_currency_code: to_currency_code,
        current_rate: utils.precisionRound(current_rate, 4),

        wallet_amount: wallet_amount,
        added_wallet: wallet_payment_in_user_currency,
        total_wallet_amount: total_wallet_amount,
        wallet_status: wallet_status,
        wallet_comment_id: wallet_comment_id,
        wallet_description: wallet_description
    });

    wallet_data.save();
    return total_wallet_amount;
};



exports.get_date_in_city_timezone = function (date, timezone) {
//    console.log("*   *   *   *   *   *");

    var convert_date = new Date(date);
    var zone_time_diff = moment_timezone.tz.zone(timezone).utcOffset(moment_timezone.utc());

    convert_date.setMinutes(convert_date.getMinutes() + zone_time_diff);
    convert_date = new Date(convert_date);
    return convert_date;
};

exports.get_date_now_at_city = function (date, timezone) { // use when you convert date now to city timezone
    var convert_date = new Date(date);
    var zone_time_diff = moment_timezone.tz.zone(timezone).utcOffset(moment_timezone.utc());
    zone_time_diff = -1 * zone_time_diff;
    convert_date.setMinutes(convert_date.getMinutes() + zone_time_diff);
    convert_date = new Date(convert_date);
    return convert_date;
};




exports.set_google_road_api_locations = function (tripLocation) {
    Settings.findOne({}, function (err, setting_detail) {

        var google_key = setting_detail.road_api_google_key;
        if (google_key !== '' && google_key !== null && google_key !== undefined) {

            var index = tripLocation.index_for_that_covered_path_in_google;
            var startTripToEndTripLocations = tripLocation.startTripToEndTripLocations;
            var size = startTripToEndTripLocations.length;
            var gap = 95;

            var end_index = (index + 1) * gap; // 95 , 190 , 285
            var start_index = end_index - gap - 1; // -1 , 94  , 189
            if (start_index < 0) {
                start_index = 0;
            }

            if (size >= end_index) {
                var new_result = "";

                for (; start_index < end_index; start_index++) {
                    new_result = new_result + startTripToEndTripLocations[start_index][0] + "," + startTripToEndTripLocations[start_index][1] + "|";
                }
                new_result = new_result.substring(0, new_result.length - 1);

                utils.bendAndSnap(new_result, gap, function (response) {
                    if (response) {
                        utils.save_google_path_locations(tripLocation, response, gap);
                    } else {
                        // utils.set_google_road_api_locations(tripLocation);
                    }
                });
            }
        }
    });
};

exports.save_google_path_locations = function (tripLocation, response, gap) {
    var index = tripLocation.index_for_that_covered_path_in_google;
    var google_start_trip_to_end_trip_locations = tripLocation.google_start_trip_to_end_trip_locations;
    google_start_trip_to_end_trip_locations = google_start_trip_to_end_trip_locations.concat(response.temp_array);
    tripLocation.google_start_trip_to_end_trip_locations = google_start_trip_to_end_trip_locations;
    tripLocation.google_total_distance = +tripLocation.google_total_distance + +response.distance;
    index++;
    tripLocation.index_for_that_covered_path_in_google = index;
    tripLocation.save(function (err) {
        if (err) {
            utils.save_google_path_locations(tripLocation, response, gap);
        } else {
            var end_index = (index + 1) * gap;
            if (tripLocation.startTripToEndTripLocations.length >= end_index) {
                utils.set_google_road_api_locations(tripLocation);
            }
        }
    });
};


exports.getCurrencyConvertRate = function (from_amount, from_currency, to_currency, return_data) {

    var request = require('request');
    if (from_currency == to_currency)
    {
        return_data({success: true, current_rate: 1});
        return;
    }
    var base_url = "http://free.currencyconverterapi.com/api/v5/convert?";
    var tag = from_currency + "_" + to_currency;
    var url = base_url + "q=" + tag + "&compact=y&apiKey=sample-key-do-not-use";

    request(url, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            try {
                var json_obj = JSON.parse(body);
                var value = json_obj[tag]["val"];
                if (from_amount != 1) {
                    value = value * from_amount;
                }
                return_data({success: true, current_rate: utils.precisionRound(Number(value), 4)});
            } catch (err) {
                return_data({success: true, current_rate: 1});
            }

        } else {
            return_data({success: false});

        }
    });
};


exports.insert_documets_for_new_users = function (user, document_for, country_id, response) {

    Document.find({countryid: country_id, type: document_for}, function (err, document) {
        var is_document_uploaded = 1;
        var document_size = document.length;

        if (document_size !== 0) {
            for (var i = 0; i < document_size; i++) {
                if (document[i].option == 1) {
                    is_document_uploaded = 0;
                }
            }

            document.forEach(function (entry) {
                var userdocument = new User_Document({
                    user_id: user._id,
                    document_id: entry._id,
                    name: entry.title,
                    option: entry.option,
                    document_picture: "",
                    unique_code: "",
                    expired_date: null,
                    is_unique_code: entry.is_unique_code,
                    is_expired_date: entry.is_expired_date,
                    is_uploaded: 0
                });
                userdocument.save(function (err) {
                    if (err) {
                        throw err;
                    }
                });
            });
        }
        user.is_document_uploaded = is_document_uploaded;
        user.save();
        response({is_document_uploaded: is_document_uploaded})

    });
};

exports.insert_documets_for_new_providers = function (provider, document_for, country_id, response) {
    Document.find({countryid: country_id, type: document_for}, function (err, document) {
        var is_document_uploaded = 1;
        var document_size = document.length;
        if (document_size !== 0) {
            for (var i = 0; i < document_size; i++) {
                if (document[i].option == 1) {
                    is_document_uploaded = 0;
                }
            }
            document.forEach(function (entry) {
                var providerdocument = new Provider_Document({
                    provider_id: provider._id,
                    document_id: entry._id,
                    name: entry.title,
                    option: entry.option,
                    document_picture: "",
                    unique_code: "",
                    expired_date: null,
                    is_unique_code: entry.is_unique_code,
                    is_expired_date: entry.is_expired_date,
                    is_uploaded: 0
                });
                providerdocument.save(function () {
                });
            });
        }
        
        response({is_document_uploaded: is_document_uploaded})
    });
};


exports.saveImageFromBrowserStripe = function (local_image_path, image_name, id, response) {

    var file_new_path = utils.saveImageFolderPath(id) + image_name;

    fs.readFile(local_image_path, function (err, data) {
        fs.writeFile(file_new_path, data, 'binary', function (err) {
            if (err) {
            } else {
                fs.unlink(local_image_path);
                var message = 'File uploaded successfully';
                // console.log(message);
                response(message);
            }
        });
    });
};

exports.encryptPassword = function (password) {
    var crypto = require('crypto');
    try {
        return  crypto.createHash('md5').update(password).digest('hex');
    } catch (error) {
        console.error(error);
    }

};



exports.generatePassword = function (length) {
    try {
        if (typeof length === "undefined")
            length = 6;
        var password = "";
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        for (var i = 0; i < length; i++)
            password += possible.charAt(Math.floor(Math.random() * possible.length));
        return password;
    } catch (error) {
        console.error("error" + error);
    }
};


exports.generateOtp = function (length) {
    try {
        if (typeof length === "undefined")
            length = 32;
        var otpCode = "";
        var possible = "0123456789";
        for (var i = 0; i < length; i++)
            otpCode += possible.charAt(Math.floor(Math.random() * possible.length));
        return otpCode;
    } catch (error) {
        console.error(error);
    }

};

exports.add_transfered_history = function (type, type_id, country_id, amount, currency_code, transfer_status, transfer_id, transfered_by, error) {
    var transfer_history = new Transfer_History({
        user_type: type,
        user_id: type_id,
        country_id: country_id,
        amount: amount,
        currency_code: currency_code,
        transfer_status: transfer_status,
        transfer_id: transfer_id,
        transfered_by: transfered_by,
        error: error
    });
    transfer_history.save();
};


exports.stripe_auto_transfer = function (amount, detail, currencycode, payment_gateway_type, return_data) {

    if(!payment_gateway_type || payment_gateway_type == PAYMENT_GATEWAY.stripe){
        var stripe_secret_key = setting_detail.stripe_secret_key;
        var stripe = require("stripe")(stripe_secret_key);
        if (amount > 0) {
            stripe.transfers.create({
                amount: Math.round(amount * 100),
                currency: currencycode,
                destination: detail.account_id

            }, function (error, transfer) {
                if (error) {
                    return_data({success: false, error: error});
                } else {
                    return_data({success: true, transfer_id: transfer.id});
                }
            });
        }
    } else if(payment_gateway_type == PAYMENT_GATEWAY.paystack){
        const https = require('https')
        const params = JSON.stringify({
          "type": "nuban",
          "name": detail.first_name + ' '+ detail.last_name,
          "description": "Transfer",
          "account_number": detail.account_number,
          "bank_code": detail.bank_code,
          "currency": currencycode
        })
        const options = {
          hostname: 'api.paystack.co',
          port: 443,
          path: '/transferrecipient',
          method: 'POST',
          headers: {
            Authorization: 'Bearer '+setting_detail.paystack_secret_key,
            'Content-Type': 'application/json'
          }
        }
        const req = https.request(options, res => {
          let data = ''
          res.on('data', (chunk) => {
            data += chunk
          });
          res.on('end', () => {
            console.log(JSON.parse(data))
            if(JSON.parse(data).status){
                const params = JSON.stringify({
                  "source": "balance", 
                  "reason": "Transfer", 
                  "amount":Math.round(amount * 100), 
                  "recipient": JSON.parse(data).data.recipient_code
                })
                const options = {
                  hostname: 'api.paystack.co',
                  port: 443,
                  path: '/transfer',
                  method: 'POST',
                  headers: {
                    Authorization: 'Bearer '+setting_detail.paystack_secret_key,
                    'Content-Type': 'application/json'
                  }
                }
                const req = https.request(options, res => {
                  let data = ''
                  res.on('data', (chunk) => {
                    data += chunk
                  });
                  res.on('end', () => {
                    console.log(JSON.parse(data))
                    if(JSON.parse(data).status){
                        return_data({success: true, transfer_id: JSON.parse(data).data.transfer_code});
                    } else {
                        return_data({success: false, error: JSON.parse(data).message});
                    }
                  })
                }).on('error', error => {
                  console.error(error)
                })
                req.write(params)
                req.end()
            } else {
                return_data({success: false, error: JSON.parse(data).message});
            }
          })
        }).on('error', error => {
          console.error(error)
        })
        req.write(params)
        req.end()
    }
};

exports.send_socket_request = function(trip_id, provider_id){
    var provider_id = "'get_new_request_"+provider_id+"'";
    // console.log('provider_id: '+provider_id)
    socket_object.emit(provider_id, {
        trip_id: trip_id,
        time_left_to_responds_trip: setting_detail.provider_timeout
    });
}

exports.update_request_status_socket = function (trip_id) {
    var trip_id ="'"+trip_id+"'";
    // console.trace('update_request_status_socket: ' + trip_id)
    socket_object.emit(trip_id, {
        is_trip_updated: true, trip_id: trip_id
    });
}

exports.dateWithTimeZone = function (timeZone, param_date) {
    let year = param_date.getFullYear()
    let month = param_date.getMonth()
    let day = param_date.getDate()
    let hour = param_date.getHours()
    let minute = param_date.getMinutes()
    let second = param_date.getSeconds()
    let date = new Date(Date.UTC(year, month, day, hour, minute, second));

    let utcDate = new Date(date.toLocaleString('en-US', { timeZone: "UTC" }));
    let tzDate = new Date(date.toLocaleString('en-US', { timeZone: timeZone }));
    let offset = utcDate.getTime() - tzDate.getTime();

    date.setTime(date.getTime() + offset);

    return date;
};

exports.create_user = function (user, user_type, response, is_retry = false) {
    try {
        var user_email = user.email;
        if (user_email == "" || user_email == null || is_retry) {
            user_email = exports.get_random_email()
        }
        var email = ''
        switch (user_type) {
            case Number(constant_json.USER_UNIQUE_NUMBER):
                email = 'user_' + user_email
                break;
            case Number(constant_json.PROVIDER_UNIQUE_NUMBER):
                email = 'provider_' + user_email
                break;
            case Number(constant_json.ADMIN_UNIQUE_NUMBER):
                email = 'admin_' + user_email
                break;
            default:
                email = 'default_' + user_email
                break;
        }

        email = email.toString().trim()
        fireUser.createUser({ email: email }).then(user => {
            response({ success: true, user })
        }).catch(error => {
            if (is_retry) {
                console.log(error)
                response({ success: false, error_code: error_message.ERROR_CODE_SOMETHING_WENT_WRONG })
            } else {
                exports.create_user(user, user_type, response, true);
            }
        })
    } catch (error) {
        console.log(error)
        response({ success: false, error_code: error_message.ERROR_CODE_SOMETHING_WENT_WRONG })
    }
}

exports.create_user_token = function (user, user_type, response) {
    try {
        if (user.uid) {
            fireUser.createCustomToken(user.uid).then(firebase_token => {
                response({ success: true, firebase_token })
            }).catch(error => {
                console.log(error)
                response({ success: false, error_code: error_message.ERROR_CODE_SOMETHING_WENT_WRONG })
            })
        } else {
            exports.create_user(user, user_type, response_data => {
                if (response_data.success) {
                    user.uid = response_data.user.uid
                    user.save().then(() => {
                        fireUser.createCustomToken(user.uid).then(firebase_token => {
                            response({ success: true, firebase_token })
                        }).catch(error => {
                            console.log(error)
                            response({ success: false, error_code: error_message.ERROR_CODE_SOMETHING_WENT_WRONG })
                        })
                    }).catch(error => {
                        console.log(error)
                        response({ success: false, error_code: error_message.ERROR_CODE_SOMETHING_WENT_WRONG })
                    })
                } else {
                    response({ success: false, error_code: error_message.ERROR_CODE_SOMETHING_WENT_WRONG })
                }
            })
        }
    } catch (error) {
        console.log(error)
        response({ success: false, error_code: error_message.ERROR_CODE_SOMETHING_WENT_WRONG })
    }
}

exports.get_random_email = function () {
    var chars = 'abcdefghijklmnopqrstuvwxyz1234567890';
    var string = '';
    for (var ii = 0; ii < 15; ii++) {
        string += chars[Math.floor(Math.random() * chars.length)];
    }
    return (string + '@domain.com');
}

exports.add_in_zone_queue_new = function (city_zone_id, provider) {
    return new Promise(async (resolve, reject) => {
        await CityZone.updateOne({ _id: city_zone_id }, { $push: { total_provider_in_zone_queue: provider._id } });
        let updated_provider = await Provider.findByIdAndUpdate(provider._id, { zone_queue_id: city_zone_id }, { new: true });
        if (updated_provider) {
            // console.log("add_in_zone_queue_new:" + updated_provider.unique_id)
            resolve(updated_provider);
        } else {
            reject(provider);
        }
    })
}

exports.remove_from_zone_queue_new = function (provider) {
    return new Promise(async (resolve, reject) => {
        await CityZone.updateOne({ _id: provider.zone_queue_id }, { $pull: { total_provider_in_zone_queue: provider._id } });
        let updated_provider = await Provider.findByIdAndUpdate(provider._id, { zone_queue_id: null }, { new: true });
        if (updated_provider) {
            // console.log("remove_from_zone_queue_new:" + updated_provider.unique_id)
            resolve(updated_provider);
        } else {
            reject(provider);
        }
    })
}

exports.trip_provider_profit_card_wallet_settlement = async function (trip, city = null, provider = null) {
    if (!trip.is_provider_earning_set_in_wallet) {
        if (!provider) {
            provider = await Provider.findOne({ _id: trip.confirmed_provider });
        }
        if (!city) {
            city = await City.findOne({ _id: trip.city_id });
        }
        let payment_mode = trip.payment_mode;
        let is_provider_earning_set_in_wallet_on_other_payment = false;
        let is_provider_earning_set_in_wallet_on_cash_payment = false;
        if (city) {
            is_provider_earning_set_in_wallet_on_other_payment = city.is_provider_earning_set_in_wallet_on_other_payment;
            is_provider_earning_set_in_wallet_on_cash_payment = city.is_provider_earning_set_in_wallet_on_cash_payment;
        }
        if ((payment_mode == Number(constant_json.PAYMENT_MODE_CASH) && is_provider_earning_set_in_wallet_on_cash_payment) ||
            (payment_mode == Number(constant_json.PAYMENT_MODE_CARD) && is_provider_earning_set_in_wallet_on_other_payment)) {
            if (provider.provider_type == Number(constant_json.PROVIDER_TYPE_NORMAL)) {
                if (trip.pay_to_provider < 0) {
                    total_wallet_amount = utils.addWalletHistory(constant_json.PROVIDER_UNIQUE_NUMBER, provider.unique_id, provider._id, provider.country_id,
                        provider.wallet_currency_code, trip.currencycode,
                        1, Math.abs(trip.pay_to_provider), provider.wallet, constant_json.DEDUCT_WALLET_AMOUNT, constant_json.SET_TRIP_PROFIT, "Set Profit Of This Trip : " + trip.unique_id);
                } else {
                    total_wallet_amount = utils.addWalletHistory(constant_json.PROVIDER_UNIQUE_NUMBER, provider.unique_id, provider._id, provider.country_id,
                        provider.wallet_currency_code, trip.currencycode,
                        1, trip.pay_to_provider, provider.wallet, constant_json.ADD_WALLET_AMOUNT, constant_json.SET_TRIP_PROFIT, "Set Profit Of This Trip : " + trip.unique_id);
                }
                provider.wallet = total_wallet_amount;
                await provider.save();
            } else {
                let partner = await Partner.findOne({ _id: trip.provider_type_id })
                if (trip.pay_to_provider < 0) {
                    total_wallet_amount = utils.addWalletHistory(constant_json.PARTNER_UNIQUE_NUMBER, partner.unique_id, partner._id, partner.country_id,
                        partner.wallet_currency_code, trip.currencycode,
                        1, Math.abs(trip.pay_to_provider), partner.wallet, constant_json.DEDUCT_WALLET_AMOUNT, constant_json.SET_TRIP_PROFIT, "Set Profit Of This Trip : " + trip.unique_id);
                } else {
                    total_wallet_amount = utils.addWalletHistory(constant_json.PARTNER_UNIQUE_NUMBER, partner.unique_id, partner._id, partner.country_id,
                        partner.wallet_currency_code, trip.currencycode,
                        1, trip.pay_to_provider, partner.wallet, constant_json.ADD_WALLET_AMOUNT, constant_json.SET_TRIP_PROFIT, "Set Profit Of This Trip : " + trip.unique_id);

                }
                partner.wallet = total_wallet_amount;
                await partner.save();
            }
            trip.is_provider_earning_set_in_wallet = true;
            trip.provider_income_set_in_wallet = Math.abs(trip.pay_to_provider);
            await trip.save();
        }
    }
}
exports.trip_payment_failed = async function (trip, city = null, provider = null) {
    if (!provider) {
        provider = await Provider.findOne({ _id: trip.confirmed_provider });
    }
    if (!city) {
        city = await City.findOne({ _id: trip.city_id });
    }
    if (city.is_payment_mode_cash == 1) {
        utils.sendPushNotification(constant_json.PROVIDER_UNIQUE_NUMBER, provider.device_type, provider.device_token, push_messages.PUSH_CODE_FOR_TRIP_PAYMENT_FAILED_CASH, constant_json.PUSH_NOTIFICATION_SOUND_FILE_IN_IOS);
    } else {
        utils.sendPushNotification(constant_json.PROVIDER_UNIQUE_NUMBER, provider.device_type, provider.device_token, push_messages.PUSH_CODE_FOR_TRIP_PAYMENT_FAILED_WALLET, constant_json.PUSH_NOTIFICATION_SOUND_FILE_IN_IOS);
    }
}
exports.get_reverse_service_fee = function (min_fare, tax_per) {
    return ((100 * min_fare) / ((tax_per * 100 * 0.01) + 100)).toFixed(2)
}