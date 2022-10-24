var User = require('mongoose').model('User');
var crypto = require('crypto');
var utils = require('../controllers/utils');
var allemails = require('../controllers/emails');
var moment = require('moment');
var Provider = require('mongoose').model('Provider');
var Trip = require('mongoose').model('Trip');
var Trip_history = require('mongoose').model('Trip_history');
var Trip_Location = require('mongoose').model('trip_location');
var Country = require('mongoose').model('Country');
var City = require('mongoose').model('City');
var User_Document = require('mongoose').model('User_Document');
var Document = require('mongoose').model('Document');
var Promo_Code = require('mongoose').model('Promo_Code');
var User_Document = require('mongoose').model('User_Document');
var User_promo_use = require('mongoose').model('User_promo_use');
require('../controllers/constant');
var moment = require('moment-timezone');
var xl = require('excel4node');
var fs = require("fs");
var console = require('../controllers/console');
var Wallet_history = require('mongoose').model('Wallet_history');
let country_list = require('../../country_list.json');

exports.user_register = function (req, res) {
    if (typeof req.session.user == 'undefined') {
        res.redirect('/');
    } else {
        res.redirect('/create_trip');
        delete message;

    }
}

exports.user_register_post = function (req, res) {
    if (typeof req.session.user == 'undefined') {
        var email = req.body.email;
        if (email != "" && email != undefined) {
            email = ((email).trim()).toLowerCase();
        } else {
            email = "";
        }
        req.session.type = "user";
        User.findOne({ email: email }).then((user) => {
        
            if (user && email != "") {
                if (user.user_type == constant_json.USER_TYPE_DISPATCHER) {
                    message = admin_messages.admin_messages_email_already_used;
                    res.redirect('/');
                } else if (user.login_by == 'manual') {
                    message = admin_messages.admin_messages_email_already_used;
                    res.redirect('/');
                } else {
                    message = admin_messages.admin_messages_email_already_used;
                    res.redirect('/');
                }
            } else {
              
                User.findOne({ phone: req.body.phone, country_phone_code: req.body.country_phone_code }).then((user) => {

                    if (user) {
                        message = admin_messages.admin_messages_mobile_no_already_used;
                        res.redirect('/');
                    } else {
                        if (req.body.is_referral == 0) {
                            req.body.referred_by = null;
                        }
                        //////// Generate refferal code ///////////

                        var code = req.body.country_phone_code;
                        var code_name = code.split(' ');
                        var country_code = code_name[0];
                        var country_name = "";

                        for (i = 1; i <= (code_name.length) - 1; i++) {

                            country_name = country_name + " " + code_name[i];
                        }

                        country_name = country_name.substr(1);
    
                        var cityid = req.body.city;
                        City.findById(cityid).then(() => {
                            //  var city = city.cityname

                            var crypto = require('crypto');
                            var now = new Date(Date.now());

                            var token = utils.tokenGenerator(32);
                            var referral_code = (utils.tokenGenerator(8)).toUpperCase();

                            var first_name = req.body.first_name;
                            first_name = first_name.charAt(0).toUpperCase() + first_name.slice(1);
                            var last_name = req.body.last_name;
                            last_name = last_name.charAt(0).toUpperCase() + last_name.slice(1);

                            var gender = req.body.gender;
                            if (gender != undefined) {
                                gender = ((gender).trim()).toLowerCase();
                            }


                            var first_name = req.body.first_name;
                            var last_name = req.body.last_name;
                            var email = req.body.email;

                            if (email == undefined || email == null || email == "") {
                                email = null;
                            } else {
                                email = ((email).trim()).toLowerCase();
                            }

                            if (email == null) {
                                email = "";
                            }


                            if (first_name.length > 0) {
                                first_name = first_name.charAt(0).toUpperCase() + first_name.slice(1);
                            } else {
                                first_name = "";
                            }

                            if (last_name.length > 0) {
                                last_name = last_name.charAt(0).toUpperCase() + last_name.slice(1);
                            } else {
                                last_name = "";
                            }

                            var user = new User({
                                first_name: first_name,
                                last_name: last_name,
                                email: email,
                                country_phone_code: country_code,
                                phone: req.body.phone,
                                device_token: req.body.device_token,
                                device_type: req.body.device_type,
                                bio: req.body.bio,
                                zipcode: req.body.zipcode,
                                login_by: req.body.login_by,
                                city: req.body.city,
                                token: token,
                                country: country_name,
                                referral_code: referral_code,
                                promo_count: 0,
                                is_referral: req.body.is_referral,
                                rate: 0,
                                rate_count: 0,
                                total_referrals: 0,
                                refferal_credit: req.body.refferal_credit,
                                wallet: 0,
                                social_unique_id: req.body.social_id,
                                wallet_currency_code: "",
                                is_use_wallet: 0,
                                user_type: Number(constant_json.USER_TYPE_NORMAL),
                                user_type_id: null,
                                is_approved: 1,
                                is_document_uploaded: 0,
                                picture: "",
                                referred_by: req.body.referred_by
                            });

                            /////////// FOR IMAGE ///////////
                            var pictureData = req.body.pictureData;
                            if (pictureData != "" && pictureData != undefined) {
                                var image_name = user._id + utils.tokenGenerator(4);
                                var url = utils.getImageFolderPath(req, 1) + image_name + '.jpg';
                                user.picture = url;

                                pictureData = pictureData.split(',')
                                pictureData = pictureData[1]
                                req.body.pictureData = pictureData;
                                utils.saveImageAndGetURL(image_name, req, res, 1);

                            }
                            if (req.body.login_by == 'manual') {
                                var crypto = require('crypto');
                                var password = req.body.password;
                                var hash = crypto.createHash('md5').update(password).digest('hex');
                                user.password = hash;
                            }

                            Country.findOne({ countryname: user.country }, { "countryname": 1, "countryphonecode": 1, "phone_number_length": 1, "flag_url": 1, "currencycode": 1, "is_referral": 1 }).then((country) => {

                                if (country) {
                                    var currencycode = country.currencycode;
                                    user.wallet_currency_code = currencycode;
                                } else {
                                    user.wallet_currency_code = setting_detail.adminCurrencyCode;
                                }

                                if (country) {
                                    var country_id = country._id;
                                    Document.find({ countryid: country_id, type: 0 }).then((document) => {

                                        var is_document_uploaded = 0;

                                        var document_size = document.length;

                                        if (document_size !== 0) {

                                            var count = 0;
                                            for (var i = 0; i < document_size; i++) {

                                                if (document[i].option == 0) {
                                                    count++;
                                                } else {
                                                    break;
                                                }
                                            }

                                            if (count == document_size) {
                                                is_document_uploaded = 1;
                                            }


                                            document.forEach(function (entry) {
                                                var userdocument = new User_Document({
                                                    user_id: user._id,
                                                    document_id: entry._id,
                                                    name: entry.title,
                                                    option: entry.option,
                                                    document_picture: "",
                                                    unique_code: entry.unique_code,
                                                    expired_date: "",
                                                    is_unique_code: entry.is_unique_code,
                                                    is_expired_date: entry.is_expired_date,
                                                    is_uploaded: 0

                                                });
                                                userdocument.save().then(() => {
                                                }, (err) => {
                                                    console.log(err);
                                                });
                                            });

                                        } else {
                                            is_document_uploaded = 1;
                                        }

                                        user.is_document_uploaded = is_document_uploaded;
                                        user.save().then((newuser) => {
                                            var is_referral = req.body.is_referral
                                            if(is_referral == 1){
                                                var referral_code = req.body.referral_code
                                                User.findOne({referral_code: referral_code}).then((userData) => {
                                                    if (!userData) {
                                                        res.json({success: false, error_code: error_message.ERROR_CODE_REFERRAL_CODE_INVALID});
                                                    } else if (userData.country != newuser.country) {
                                                        res.json({
                                                            success: false,
                                                            error_code: error_message.ERROR_CODE_YOUR_FRIEND_COUNTRY_NOT_MATCH_WITH_YOU
                                                        });
                                                    } else {
                                                        Country.findOne({countryname: newuser.country}).then((country) => {
                
                                                            var userRefferalCount = userData.total_referrals;
                
                                                            if (userRefferalCount < country.userreferral) {
                
                                                                var total_wallet_amount = utils.addWalletHistory(constant_json.USER_UNIQUE_NUMBER, userData.unique_id, userData._id, null,
                                                                    userData.wallet_currency_code, userData.wallet_currency_code,
                                                                    1, country.bonus_to_userreferral, userData.wallet, constant_json.ADD_WALLET_AMOUNT, constant_json.ADDED_BY_REFERRAL, "User used your referral code, User id : " + user.unique_id);
                
                                                                userData.total_referrals = +userData.total_referrals + 1;
                                                                userData.wallet = total_wallet_amount;
                                                                userData.save().then(() => {
                                                                });
                
                                                                newuser.is_referral = 1;
                                                                newuser.referred_by = userData._id;
                
                                                                total_wallet_amount = utils.addWalletHistory(constant_json.USER_UNIQUE_NUMBER, newuser.unique_id, newuser._id, null,
                                                                    newuser.wallet_currency_code, newuser.wallet_currency_code,
                                                                    1, country.referral_bonus_to_user, newuser.wallet, constant_json.ADD_WALLET_AMOUNT, constant_json.ADDED_BY_REFERRAL, "Using refferal code : " + referral_code + " of User id : " + userData.unique_id);
                
                                                                newuser.wallet = total_wallet_amount;
                                                                newuser.save().then(() => {
                                                                    var email_notification = setting_detail.email_notification;
                                                                    if (email_notification == true) {
                                                                        allemails.sendProviderRegisterEmail(req, user, user.first_name + " " + user.last_name);
                                                                    }
                                                                    req.session.user = user;
                                                                    res.redirect('/login'); 
                                                                });
                                                            } else {
                                                                res.json({
                                                                    success: false,
                                                                    error_code: error_message.ERROR_CODE_REFERRAL_CODE_EXPIRED
                                                                });
                                                            }
                                                        });
                                                    }
                                                });
                                            }else{
                                                var email_notification = setting_detail.email_notification;
    
                                                if (email_notification == true) {
                                                    allemails.sendProviderRegisterEmail(req, user, user.first_name + " " + user.last_name);
                                                }
                                                req.session.user = user;
                                                res.redirect('/login');
                                            }
                                        }, (err) => {
                                            utils.error_response(err, res)
                                        });
                                    });
                                }else{
                                    user.save().then(() => {
                                    }, (err) => {
                                        console.log(err);
                                    });
                                }
                            });
                        });
                    }
                });
            }

        });
    }
}

exports.user_login = function (req, res) {
    if (typeof req.session.user == 'undefined') {
        res.redirect('/');
    } else {
        res.redirect('/create_trip');

    }

}

exports.landing = function (req, res) {
    Country.find({}).then((country) => {

        page_type = 0;
        var token = utils.generate_token()
        res.render('user_login', { token:token.data,country: country, setting_data: setting_detail, type: req.session.type, phone_number_length: 10, phone_number_min_length: 8 });
        delete message;

    });
}



exports.user_social_login_web = function (req, res) {

    User.findOne({ social_unique_id: req.body.social_unique_id }).then((user) => {

        if (user) {
            var token = utils.tokenGenerator(32);
            user.token = token;

            var device_token = "";
            var device_type = "";
            if (user.device_token != "" && user.device_token != req.body.device_token) {
                device_token = user.device_token;
                device_type = user.device_type;
            }


            user.device_type = req.body.device_type;
            user.login_by = req.body.login_by;
            user.save().then(() => {

                if (device_token != "") {
                    utils.sendPushNotification(constant_json.USER_UNIQUE_NUMBER, device_type, device_token, push_messages.PUSH_CODE_FOR_USER_LOGIN_IN_OTHER_DEVICE, constant_json.PUSH_NOTIFICATION_SOUND_FILE_IN_IOS);
                }
                req.session.user = user;
                message = admin_messages.success_message_login;

                Trip.findOne({ user_id: user._id, is_trip_cancelled: 0, is_trip_completed: 0 }).then((trip) => {

                    if (trip) {
                        res.json({ success: true, url: 'history' });
                    } else {
                        res.json({ success: true, url: 'create_trip' });
                    }
                });

            }, (err) => {
                utils.error_response(err, res)
            });
        } else {
            message = admin_messages.error_message_email_not_registered;
            res.json({ success: false })
        }
    })
}

exports.user_login_post = function (req, res) {
   
    if (typeof req.session.user == 'undefined') {

        req.session.type = "user";
        var email = req.body.email;
        if (email != undefined) {
            email = ((req.body.email).trim()).toLowerCase();
        }
        User.findOne({ phone: req.body.phone }).then((user) => {
            if (!user) {
                message = admin_messages.error_message_phone_not_registered;
                res.render('user-login-form');
            } else {
                var password = req.body.password;
                var hash = crypto.createHash('md5').update(password).digest('hex');
                if (user.password != hash) {
                    message = admin_messages.error_message_password_wrong;
                    res.render('user-login-form');
                } else if (user.is_approved != 1) {
                    message = admin_messages.not_approved_by_admin;
                    res.render('user-login-form');
                } else {
                    req.session.user = user;
                    ////////////  token generate /////
                    message = admin_messages.success_message_login;
                    Trip.findOne({ user_id: user._id, is_trip_cancelled: 0, is_trip_completed: 0 }).then((trip) => {

                        if (trip) {
                            res.redirect('/history');
                        } else {
                            res.redirect('/create_trip');
                        }
                    });
                }
            }
        });
    } else {
        res.redirect('/create_trip');
    }
};

exports.change_password = function (req, res) {
    var id = req.body.id;
    if (req.body.type == 1) {
        User.findById(id).then((user_detail) => {

            var password = req.body.old_password;
            var hash = crypto.createHash('md5').update(password).digest('hex');
            if (user_detail.password == hash) {
                var new_password = req.body.confirm_password;
                var hash = crypto.createHash('md5').update(new_password).digest('hex');
                user_detail.password = hash;
                user_detail.save().then(() => {
                }, (err) => {
                    console.log(err);
                });
                message = admin_messages.success_message_password_update;
                res.redirect('/profiles')
            } else {
                message = admin_messages.error_message_password_wrong;
                res.redirect('/profiles')
            }
        });
    } else if (req.body.type == 2) {
        Provider.findById(id).then((provider_detail) => {

            var password = req.body.old_password;
            var hash = crypto.createHash('md5').update(password).digest('hex');
            if (provider_detail.password == hash) {
                var new_password = req.body.confirm_password;
                var hash = crypto.createHash('md5').update(new_password).digest('hex');
                provider_detail.password = hash;
                provider_detail.save().then(() => {
                }, (err) => {
                    console.log(err);
                });
                message = admin_messages.success_message_password_update;
                res.redirect('/provider_profiles')
            } else {
                message = admin_messages.error_message_password_wrong;
                res.redirect('/provider_profiles')
            }
        });
    }
}

exports.forgot_password = function (req, res) {

    if (typeof req.session.user == 'undefined') {
        res.redirect('/');
    } else {
        res.redirect('/create_trip');
    }
}

exports.forgot_psw_email = async function (req, res) {
     var email = req.body.email;
     var query = {$or: [{'email': email}, {'phone': email}]};
        if (req.body.type == "user") {
            req.session.type = "user";
            var phone = req.body.phone;
            var query = { $or: [{ 'email': email }, { 'phone': phone }] };
            User.findOne(query).then((user) => {
                if (user) {
                    var new_password = utils.generatePassword(6);
                    user.password = utils.encryptPassword(new_password);
                    user.save().then(() => {
                    });
                    var phoneWithCode = user.country_phone_code + user.phone;
                    utils.sendSmsForOTPVerificationAndForgotPassword(phoneWithCode, 3, new_password);
                    allemails.userForgotPassword(req, user, new_password);

                    admin_messages.success_message_password_update;
                    res.redirect("/login");

                } else {
                    message = admin_messages.admin_messages_email_not_registered;
                    res.redirect('/forgot_password_user');
                }
            });
        } else {
            req.session.type = "provider";
            Provider.findOne(query).then((provider) => {
                if (provider) {
                    var new_password = utils.generatePassword(6);
                    provider.password = utils.encryptPassword(new_password);
                    provider.save().then(() => {
                    });
                    var phoneWithCode = provider.country_phone_code + provider.phone;
                    utils.sendSmsForOTPVerificationAndForgotPassword(phoneWithCode, 3, new_password);
                    allemails.providerForgotPassword(req, provider, new_password);

                    admin_messages.success_message_password_update;
                    res.redirect("/login");
                } else {
                    message = admin_messages.admin_messages_email_not_registered;
                    res.redirect('/forgot_password_provider');
                }
            });
        }
}

exports.edit_psw = function (req, res) {

    if (typeof req.session.user == 'undefined') {
        var id = req.query.id;
        var token = req.query.token;
        res.render('user_new_password', { 'id': id, 'token': token });
        delete message;
    } else {
        res.redirect('/create_trip');
    }
};

exports.update_psw = function (req, res) {

    if (typeof req.session.user == 'undefined') {
        var query = {};
        query['_id'] = req.body.id;
        query['token'] = req.body.token;

        var password = req.body.password;
        var hash = crypto.createHash('md5').update(password).digest('hex');

        function TokenGenerator(length) {
            if (typeof length == "undefined")
                length = 32
            var token = "";
            var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
            for (var i = 0; i < length; i++)
                token += possible.charAt(Math.floor(Math.random() * possible.length));
            return token;
        }
        var token = TokenGenerator(32);

        User.findOneAndUpdate(query, { password: hash, token: token }).then((response) => {

            if (!response) {
                message = admin_messages.admin_messages_token_expired;
                res.redirect('/user_forgot_password');
            } else {
                message = admin_messages.success_message_password_update;
                res.redirect('/login');
            }
        });
    } else {
        res.redirect('/create_trip');
    }
};


exports.user_trip_map = function (req, res) {

    if (typeof req.session.user == 'undefined') {

        res.redirect('/login');
    } else {
        var id = req.body.id;
        var user_name = req.body.u_name;
        var provider_name = req.body.pr_name;
        var query = {};
        query['tripID'] = id;

        Trip.findById(id).then((trips) => {

            Trip_Location.findOne(query).then((locations) => {

                var url = "https://maps.googleapis.com/maps/api/js?key=" + setting_detail.web_app_google_key + "&libraries=places&callback=initialize"

                if (!locations) {
                    res.render('user_trip_map', { 'data': trips, 'url': url, 'user_name': user_name, 'provider_name': provider_name, 'moment': moment });

                } else {
                    res.render('user_trip_map', { 'data': trips, 'url': url, 'trip_path_data': locations, 'user_name': user_name, 'provider_name': provider_name, 'moment': moment });
                }
            });

        });

    }
}

exports.user_profile = function (req, res) {
    if (typeof req.session.user != "undefined") {
        User.findById(req.session.user._id).then((response) => {

            Country.findOne({ countryname: response.country }).then((country_detail) => {

                var is_public_demo = setting_detail.is_public_demo;
                var mongoose = require('mongoose');
                var Schema = mongoose.Types.ObjectId;
                var condition = { $match: { user_id: {$eq: Schema(req.session.user._id)} } }
                var referral_condition = {$match: {wallet_comment_id: {$eq: Number(constant_json.ADDED_BY_REFERRAL) }}}
                var group = {
                    $group:{
                        _id: null,
                        total_referral_credit: {$sum: '$added_wallet'}
                    }
                }

                Wallet_history.aggregate([condition, referral_condition, group]).then((wallet_history_count)=>{
                    let i = country_list.findIndex(i => i.code == response.country_phone_code);
                    let alpha3 = '';
                    if (i != -1) {
                        alpha3 = country_list[i].alpha3;
                    }
                    if(wallet_history_count.length>0){
                        res.render("user_profile", { phone_number_min_length: setting_detail.minimum_phone_number_length, phone_number_length: setting_detail.maximum_phone_number_length, is_public_demo: is_public_demo, login1: response, total_referral_credit: wallet_history_count[0].total_referral_credit, alpha3 });
                        delete message
                    } else {
                        res.render("user_profile", { phone_number_min_length: setting_detail.minimum_phone_number_length, phone_number_length: setting_detail.maximum_phone_number_length, is_public_demo: is_public_demo, login1: response, total_referral_credit: 0, alpha3 });
                        delete message
                    }
                })
            });
        });
    } else {
        res.redirect('/login');
    }
};

exports.user_profile_update = function (req, res) {

    if (typeof req.session.user != "undefined") {

        var id = req.body.id
        User.findOne({ phone: req.body.phone, country_phone_code: req.body.country_phone_code, _id: { $ne: id } }).then((user) => {
            if (user) {
                message = admin_messages.admin_messages_mobile_no_already_used;
                res.redirect('/profiles')
            } else {
                User.findById(id).then((user_detail) => {

                    var password = req.body.old_password;
                    var hash = crypto.createHash('md5').update(password).digest('hex');
                    if (user_detail.password == hash) {
                        var picture = req.body.pictureData;

                        if (picture != "") {

                            utils.deleteImageFromFolder(user_detail.picture, 1);
                            var image_name = user_detail._id + utils.tokenGenerator(4);
                            file_data_path = url;
                            picture = picture.split(',')
                            picture = picture[1]
                            var url = utils.getImageFolderPath(req, 1) + image_name + '.jpg';

                            req.body.pictureData = picture;
                            req.body.picture = url;
                            utils.saveImageAndGetURL(image_name, req, res, 1);


                            User.findByIdAndUpdate(id, req.body, { new: true }).then((user) => {
                                message = admin_messages.success_message_profile_update;
                                req.session.user = user;
                                res.redirect('/profiles')
                            });
                        } else {
                            User.findByIdAndUpdate(id, req.body, { new: true }).then((user) => {
                                message = admin_messages.success_message_profile_update;
                                req.session.user = user;
                                res.redirect('/profiles')
                            });
                        }
                    } else {
                        message = admin_messages.error_message_password_wrong;
                        res.redirect('/profiles')
                    }

                })
            }
        })
    } else {

        res.redirect('/login');
    }
}

exports.check_promocode = function (req, res) {
    User.findOne({ _id: req.body.user_id }, function (err, user) {

        if (user) {
            var now = new Date(Date.now());
            Country.findOne({ countryname: req.body.country }).then((country_detail) => {

                if (!country_detail) {
                    res.json({ success: false, error_code: admin_messages.ERROR_CODE_INVALID_PROMO_CODE });
                } else {
                    var country_id = country_detail._id;
                    var promo_code = req.body.promocode;
                    promo_code = promo_code.toUpperCase();
                    Promo_Code.findOne({ promocode: promo_code, state: 1, countryid: country_id, start_date: { $lte: now }, code_expiry: { $gte: now } }).then((promocode) => {

                        if (promocode) {
                            if (promocode.user_used_promo < promocode.code_uses) {
                                User_promo_use.findOne({ user_id: req.body.user_id, promo_id: promocode._id }).then((used_promo_data) => {
                                    if (used_promo_data) {
                                        res.json({ success: false, error_code: error_message.ERROR_CODE_PROMOTIONAL_CODE_ALREADY_USED });
                                    } else {
                                        City.findOne({ cityname: req.body.city }).then((citydetail) => {

                                            if (!citydetail) {
                                                res.json({ success: false, error_code: error_message.ERROR_CODE_INVALID_PROMO_CODE });
                                            } else {

                                                var cityid = citydetail._id;
                                                var countryid = country_detail._id;
                                                var promo_apply_for_cash = citydetail.isPromoApplyForCash;
                                                var promo_apply_for_card = citydetail.isPromoApplyForCard;
                                                var is_promo_apply = 0;
                                                if (req.body.payment_mode == constant_json.PAYMENT_MODE_CASH && promo_apply_for_cash == constant_json.YES) {
                                                    is_promo_apply = 1;
                                                } else if (req.body.payment_mode == constant_json.PAYMENT_MODE_CARD && promo_apply_for_card == constant_json.YES) {
                                                    is_promo_apply = 1;
                                                }
                                                trip_count = user.completed_request;
                                                is_promo_code_valid = false;
                                                if (!promocode.completed_trips_type) {
                                                    promocode.completed_trips_type = 2;
                                                }
                                                if (!promocode.completed_trips_value) {
                                                    promocode.completed_trips_value = 0;
                                                }
                                                if (promocode.completed_trips_type == 1) {
                                                    is_promo_code_valid = (promocode.completed_trips_value == trip_count);
                                                } else if (promocode.completed_trips_type == 2) {
                                                    is_promo_code_valid = (trip_count >= promocode.completed_trips_value);
                                                }
                                                if (is_promo_code_valid) {
                                                    if (is_promo_apply) {

                                                        if (promocode.cityid.indexOf(cityid) !== -1 && promocode.countryid.equals(countryid)) {
                                                            res.json({ success: true, promocode: promocode });
                                                        } else {
                                                            res.json({ success: false, error_code: error_message.ERROR_CODE_PROMO_CODE_NOT_FOR_YOUR_AREA });
                                                        }
                                                    } else {
                                                        res.json({ success: false, error_code: error_message.ERROR_CODE_PROMO_CODE_NOT_APPLY_ON_YOUR_PAYMENT_MODE });
                                                    }
                                                } else {
                                                    res.json({
                                                        success: false,
                                                        error_code: error_message.ERROR_CODE_PROMO_CODE_EXPIRED_OR_INVALID
                                                    });
                                                }
                                            }
                                        });
                                    }
                                });
                            } else {
                                res.json({ success: false, error_code: error_message.ERROR_CODE_PROMO_CODE_EXPIRED_OR_INVALID });
                            }
                        } else {

                            res.json({ success: false, error_code: error_message.ERROR_CODE_INVALID_PROMO_CODE });
                        }

                    });
                }
            });

        } else {
            res.json({ success: false, error_code: error_message.ERROR_CODE_USER_DETAIL_NOT_FOUND });

        }
    });
};

exports.user_document_panel = function (req, res) {
    if (typeof req.session.user != 'undefined') {
        User_Document.find({ user_id: req.session.user._id }).then((userdocument) => {

            res.render('user_document_panel', { 'data': userdocument, 'moment': moment });

        });
    } else {
        res.redirect('/login');
    }
}

exports.change_password = function (req, res) {
    var id = req.body.id;
    if (req.body.type == 1) {
        User.findById(id).then((user_detail) => {

            var password = req.body.old_password;
            var hash = crypto.createHash('md5').update(password).digest('hex');
            if (user_detail.password == hash) {
                var new_password = req.body.confirm_password;
                var hash = crypto.createHash('md5').update(new_password).digest('hex');
                user_detail.password = hash;
                user_detail.save();
                message = admin_messages.success_message_password_update;
                res.redirect('/profiles')
            } else {
                message = admin_messages.error_message_password_wrong;
                res.redirect('/profiles')
            }
        });
    } else if (req.body.type == 2) {
        Provider.findById(id).then((provider_detail) => {

            var password = req.body.old_password;
            var hash = crypto.createHash('md5').update(password).digest('hex');
            if (provider_detail.password == hash) {
                var new_password = req.body.confirm_password;
                var hash = crypto.createHash('md5').update(new_password).digest('hex');
                provider_detail.password = hash;
                provider_detail.save();
                message = admin_messages.success_message_password_update;
                res.redirect('/provider_profiles')
            } else {
                message = admin_messages.error_message_password_wrong;
                res.redirect('/provider_profiles')
            }
        });
    }
}

exports.apply_referral_code = function (req, res) {
    if (req.body.type == 1) {
        User.findOne({ referral_code: req.body.referral_code }).then((userData) => {
            if (!userData) {
                res.json({ success: false, error_code: error_message.ERROR_CODE_REFERRAL_CODE_INVALID });
            } else if (userData.country_phone_code != req.body.countryphonecode) {
                res.json({ success: false, error_code: error_message.ERROR_CODE_YOUR_FRIEND_COUNTRY_NOT_MATCH_WITH_YOU });
            } else {
                var country_phone_code = req.body.countryphonecode;
                var cond = { $or: [{ countryname: req.body.country }, { countryphonecode: country_phone_code }] }

                Country.findOne(cond).then((country) => {
                    var userRefferalCount = userData.total_referrals;
                    if (userRefferalCount < country.userreferral) {
                        res.json({
                            success: true,
                            message: success_messages.MESSAGE_CODE_REFERRAL_PROCESS_SUCCESSFULLY_COMPLETED,
                            is_referral: 1,
                            referred_by: userData._id,
                            refferal_credit: country.referral_bonus_to_user
                        });
                    } else {
                        res.json({ success: false, error_code: error_message.ERROR_CODE_YOU_HAVE_ALREADY_APPLY_REFERRAL_CODE });
                    }
                });
            }
        });
    } else {
        Provider.findOne({ referral_code: req.body.referral_code }).then((userData) => {
            if (!userData) {
                res.json({ success: false, error_code: error_message.ERROR_CODE_REFERRAL_CODE_INVALID });
            } else if (userData.country_phone_code != req.body.countryphonecode) {
                res.json({ success: false, error_code: error_message.ERROR_CODE_YOUR_FRIEND_COUNTRY_NOT_MATCH_WITH_YOU });
            } else {
                var country_phone_code = req.body.countryphonecode;
                var cond = { $or: [{ countryname: req.body.country }, { countryphonecode: country_phone_code }] }

                Country.findOne(cond).then((country) => {
                    var userRefferalCount = userData.total_referrals;
                    if (userRefferalCount < country.providerreferral) {
                        res.json({
                            success: true,
                            message: success_messages.MESSAGE_CODE_REFERRAL_PROCESS_SUCCESSFULLY_COMPLETED,
                            is_referral: 1,
                            referred_by: userData._id,
                            refferal_credit: country.referral_bonus_to_user
                        });
                    } else {
                        res.json({ success: false, error_code: error_message.ERROR_CODE_YOU_HAVE_ALREADY_APPLY_REFERRAL_CODE });
                    }
                });
            }
        });
    }
};


exports.user_sign_out = function (req, res) {

    delete req.session.user;
    delete user;
    req.session.type = "user";
    res.redirect('/login');
};



exports.user_documents_edit = function (req, res) {

    if (typeof req.session.user != 'undefined') {

        User_Document.findById(req.body.id).then((provider_document) => {

            res.render('user_documents_edit', { detail: provider_document, moment: moment });
            delete message;

        });
    } else {
        res.redirect('/login');
    }
};

exports.user_documents_update = function (req, res) {

    if (typeof req.session.user != 'undefined') {
        User_Document.findById(req.body.id).then((provider_document) => {


            provider_document.expired_date = req.body.expired_date;
            provider_document.unique_code = req.body.unique_code;

            message = admin_messages.success_update_document;
            if (req.files.length > 0) {
                var image_name = provider_document.provider_id + utils.tokenGenerator(4);
                var url = utils.getImageFolderPath(req, 3) + image_name + '.jpg';
                utils.saveImageFromBrowser(req.files[0].path, image_name + '.jpg', 3);

                provider_document.document_picture = url;
                provider_document.is_uploaded = 1;
                provider_document.save().then(() => {
                    res.redirect('/user_document_panel');
                    delete message;
                }, (err) => {
                    utils.error_response(err, res)
                });
            } else {
                provider_document.save().then(() => {
                    res.redirect('/user_document_panel');
                    delete message;
                }, (err) => {
                    utils.error_response(err, res)
                });

            }

        });
    } else {
        res.redirect('/login');
    }
};


exports.generate_user_history_export_excel = function (req, res) {
    if (typeof req.session.user != 'undefined') {


        if (req.body.search_item == undefined) {
            var request = req.path.split('/')[1];
            search_item = 'unique_id';
            search_value = '';
            sort_order = -1;
            sort_field = 'unique_id';
            filter_start_date = '';
            filter_end_date = '';

        } else {
            var request = req.body.request;
            var value = req.body.search_value;
            value = value.replace(/^\s+|\s+$/g, '');
            value = value.replace(/ +(?= )/g, '');
            value = new RegExp(value, 'i');


            sort_order = req.body.sort_item[1];
            sort_field = req.body.sort_item[0];
            search_item = req.body.search_item
            search_value = req.body.search_value;
            filter_start_date = req.body.start_date;
            filter_end_date = req.body.end_date;

        }

        if (req.body.start_date == '' || req.body.end_date == '') {
            if (req.body.start_date == '' && req.body.end_date == '') {
                var date = new Date(Date.now());
                date = date.setHours(0, 0, 0, 0);
                start_date = new Date(0);
                end_date = new Date(Date.now());
            } else if (req.body.start_date == '') {
                start_date = new Date(0);
                var end_date = req.body.end_date;
                end_date = new Date(end_date);
                end_date = end_date.setHours(23, 59, 59, 999);
                end_date = new Date(end_date);
            } else {
                var start_date = req.body.start_date;
                start_date = new Date(start_date);
                start_date = start_date.setHours(0, 0, 0, 0);
                start_date = new Date(start_date);
                end_date = new Date(Date.now());
            }
        } else if (req.body.start_date == undefined || req.body.end_date == undefined) {
            start_date = new Date(0);
            end_date = new Date(Date.now());
        } else {
            var start_date = req.body.start_date;
            var end_date = req.body.end_date;
            start_date = new Date(start_date);
            start_date = start_date.setHours(0, 0, 0, 0);
            start_date = new Date(start_date);
            end_date = new Date(end_date);
            end_date = end_date.setHours(23, 59, 59, 999);
            end_date = new Date(end_date);
        }


        var lookup = {
            $lookup:
            {
                from: "users",
                localField: "user_id",
                foreignField: "_id",
                as: "user_detail"
            }
        };
        var unwind = { $unwind: "$user_detail" };

        var lookup1 = {
            $lookup:
            {
                from: "providers",
                localField: "confirmed_provider",
                foreignField: "_id",
                as: "provider_detail"
            }
        };


        value = search_value;
        value = value.replace(/^\s+|\s+$/g, '');
        value = value.replace(/ +(?= )/g, '');

        if (search_item == "unique_id") {

            var query1 = {};
            if (value != "") {
                value = Number(value)
                query1[search_item] = { $eq: value };
                var search = { "$match": query1 };
            } else {
                var search = { $match: {} };
            }

        } else if (search_item == "provider_detail.first_name") {
            var query1 = {};
            var query2 = {};
            var query3 = {};
            var query4 = {};
            var query5 = {};
            var query6 = {};

            var full_name = value.split(' ');
            if (typeof full_name[0] == 'undefined' || typeof full_name[1] == 'undefined') {

                query1[search_item] = { $regex: new RegExp(value, 'i') };
                query2['provider_detail.last_name'] = { $regex: new RegExp(value, 'i') };

                var search = { "$match": { $or: [query1, query2] } };
            } else {

                query1[search_item] = { $regex: new RegExp(value, 'i') };
                query2['provider_detail.last_name'] = { $regex: new RegExp(value, 'i') };
                query3[search_item] = { $regex: new RegExp(full_name[0], 'i') };
                query4['provider_detail.last_name'] = { $regex: new RegExp(full_name[0], 'i') };
                query5[search_item] = { $regex: new RegExp(full_name[1], 'i') };
                query6['provider_detail.last_name'] = { $regex: new RegExp(full_name[1], 'i') };

                var search = { "$match": { $or: [query1, query2, query3, query4, query5, query6] } };
            }
        } else {
            var search = { "$match": { search_item: { $regex: new RegExp(value, 'i') } } };
        }


        query1['created_at'] = { $gte: start_date, $lt: end_date };
        var filter = { "$match": query1 };

        var sort = { "$sort": {} };
        sort["$sort"][sort_field] = parseInt(sort_order);


        var mongoose = require('mongoose');
        var Schema = mongoose.Types.ObjectId;
        var condition = { $match: { 'user_id': { $eq: Schema(req.session.user._id) } } };
        Trip_history.aggregate([condition, lookup, unwind, lookup1, search, filter, sort]).then((array) => {

            var date = new Date()
            var time = date.getTime()
            var wb = new xl.Workbook();
            var ws = wb.addWorksheet('sheet1');
            var col = 1;

            ws.cell(1, col++).string(req.__('title_id'));
            ws.cell(1, col++).string(req.__('title_user_id'));
            ws.cell(1, col++).string(req.__('title_user'));
            ws.cell(1, col++).string(req.__('title_provider_id'));
            ws.cell(1, col++).string(req.__('title_provider'));
            ws.cell(1, col++).string(req.__('title_date'));
            ws.cell(1, col++).string(req.__('title_status'));
            ws.cell(1, col++).string(req.__('title_amount'));
            ws.cell(1, col++).string(req.__('title_payment'));
            ws.cell(1, col++).string(req.__('title_payment_status'));

            array.forEach(function (data, index) {
                col = 1;
                ws.cell(index + 2, col++).number(data.unique_id);
                ws.cell(index + 2, col++).number(data.user_detail.unique_id);
                ws.cell(index + 2, col++).string(data.user_detail.first_name + ' ' + data.user_detail.last_name);

                if (data.provider_detail.length > 0) {
                    ws.cell(index + 2, col++).number(data.provider_detail[0].unique_id);
                    ws.cell(index + 2, col++).string(data.provider_detail[0].first_name + ' ' + data.provider_detail[0].last_name);
                } else {
                    col += 2;
                }
                ws.cell(index + 2, col++).string(moment(data.created_at).format("DD MMM 'YY") + ' ' + moment(data.created_at).format("hh:mm a"));

                if (data.is_trip_cancelled == 1) {
                    if (data.is_trip_cancelled_by_provider == 1) {
                        ws.cell(index + 2, col++).string(req.__('title_total_cancelled_by_provider'));
                    } else if (data.is_trip_cancelled_by_user == 1) {
                        ws.cell(index + 2, col++).string(req.__('title_total_cancelled_by_user'));
                    } else {
                        ws.cell(index + 2, col++).string(req.__('title_total_cancelled'));
                    }
                } else {
                    if (data.is_provider_status == 2) {
                        ws.cell(index + 2, col++).string(req.__('title_trip_status_coming'));
                    } else if (data.is_provider_status == 4) {
                        ws.cell(index + 2, col++).string(req.__('title_trip_status_arrived'));
                    } else if (data.is_provider_status == 6) {
                        ws.cell(index + 2, col++).string(req.__('title_trip_status_trip_started'));
                    } else if (data.is_provider_status == 9) {
                        ws.cell(index + 2, col++).string(req.__('title_trip_status_completed'));
                    } else if (data.is_provider_status == 1 || data.is_provider_status == 0) {
                        if (data.is_provider_accepted == 1) {
                            ws.cell(index + 2, col++).string(req.__('title_trip_status_accepted'));
                        } else {
                            ws.cell(index + 2, col++).string(req.__('title_trip_status_waiting'));
                        }
                    }
                }
                ws.cell(index + 2, col++).number(data.total);

                if (data.payment_mode == 1) {
                    ws.cell(index + 2, col++).string(req.__('title_pay_by_cash'));
                } else {
                    ws.cell(index + 2, col++).string(req.__('title_pay_by_card'));
                }

                if (data.payment_status == 0) {
                    ws.cell(index + 2, col++).string(req.__('title_pending'));
                } else {
                    if (data.payment_status == 1) {
                        ws.cell(index + 2, col++).string(req.__('title_paid'));
                    } else {
                        ws.cell(index + 2, col++).string(req.__('title_not_paid'));
                    }
                }

                if (index == array.length - 1) {
                    wb.write('data/xlsheet/' + time + '_user_history.xlsx', function (err) {
                        if (err) {
                            console.error(err);
                        } else {
                            var url = req.protocol + "://" + req.get('host') + "/xlsheet/" + time + "_user_history.xlsx";
                            res.json(url);
                            setTimeout(function () {
                                fs.unlink('data/xlsheet/' + time + '_user_history.xlsx', function () {
                                });
                            }, 10000)
                        }
                    });
                }
            });
        }, (err) => {
            utils.error_response(err, res)
        });

    } else {
        res.redirect('/login');
    }
};