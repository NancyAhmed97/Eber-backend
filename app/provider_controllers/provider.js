var crypto = require('crypto');
require('../controllers/constant');
var utils = require('../controllers/utils');
var allemails = require('../controllers/emails');
var moment = require('moment');
var Provider = require('mongoose').model('Provider');
var Trip = require('mongoose').model('Trip');
var Trip_Location = require('mongoose').model('trip_location');
var Country = require('mongoose').model('Country');
var City = require('mongoose').model('City');
var Provider_Document = require('mongoose').model('Provider_Document');
var Document = require('mongoose').model('Document');
var Utils = require('../controllers/utils');
var mongoose = require('mongoose');
var Schema = mongoose.Types.ObjectId;
var Provider_Vehicle_Document = require('mongoose').model('Provider_Vehicle_Document');
var Citytype = require('mongoose').model('city_type');
var myProviders = require('./provider');
var console = require('../controllers/console');
var utils = require('../controllers/utils');
var Trip_history = require('mongoose').model('Trip_history');
var Wallet_history = require('mongoose').model('Wallet_history');

exports.provider_register = function (req, res) {

    if (typeof req.session.provider == 'undefined') {
        res.redirect('/');
    } else {
        res.redirect('/provider_profiles');
        delete message;

    }
}

exports.provider_register_post = function (req, res) {
    if (typeof req.session.provider == 'undefined') {
        var email = req.body.email;
        if (email != "" && email != undefined) {
            email = ((email).trim()).toLowerCase();
        } else {
            email = "";
        }
        req.session.type = "provider";
        Provider.findOne({ email: email }).then((provider) => {

            if (provider) {
                message = admin_messages.error_message_email_already_used;

                res.redirect('/');

            } else {
                var code = req.body.country_phone_code;
                var code_name = code.split(' ');
                var country_code = code_name[0];
                var country_name = "";

                for (i = 1; i <= (code_name.length) - 1; i++) {

                    country_name = country_name + " " + code_name[i];
                }

                country_name = country_name.substr(1);
                Provider.findOne({ phone: req.body.phone, country_phone_code: country_code }).then((provider) => {
                    if (provider) {
                        message = admin_messages.error_message_mobile_no_already_used;

                        res.redirect('/');
                    } else {
                        var cityid = req.body.city;
                        City.findById(cityid).then((city) => {
                            var city = city.cityname;
                            var token = utils.tokenGenerator(32);


                            var first_name = req.body.first_name;
                            first_name = first_name.charAt(0).toUpperCase() + first_name.slice(1);

                            var last_name = req.body.last_name;
                            last_name = last_name.charAt(0).toUpperCase() + last_name.slice(1);

                            var referral_code = (utils.tokenGenerator(8)).toUpperCase();

                            var provider = new Provider({
                                first_name: first_name,
                                last_name: last_name,
                                country_phone_code: country_code,
                                email: email,
                                phone: req.body.phone,
                                service_type: null,
                                car_model: req.body.car_model,
                                car_number: req.body.car_number,
                                device_token: req.body.device_token,
                                device_type: req.body.device_type,
                                bio: req.body.bio,
                                address: req.body.address,
                                zipcode: req.body.zipcode,
                                social_unique_id: req.body.social_unique_id,
                                login_by: req.body.login_by,
                                device_timezone: req.body.device_timezone,
                                city: city,
                                cityid: cityid,
                                country: country_name,
                                social_unique_id: req.body.social_id,
                                referral_code: referral_code,
                                token: token,
                                is_available: 1,
                                is_document_uploaded: 0,
                                is_partner_approved_by_admin: 1,
                                is_active: 0,
                                is_approved: 0,
                                rate: 0,
                                rate_count: 0,
                                is_trip: [],
                                admintypeid: null,
                                wallet: 0,
                                bearing: 0,
                                picture: "",
                                provider_type: Number(constant_json.PROVIDER_TYPE_NORMAL),
                                provider_type_id: null,
                                providerLocation: [0, 0],
                                providerPreviousLocation: [0, 0],
                                app_version: req.body.app_version

                            });


                            if (req.body.login_by == 'manual') {
                                var crypto = require('crypto');
                                var password = req.body.password;
                                var hash = crypto.createHash('md5').update(password).digest('hex');
                                provider.password = hash;
                            }
                            /////////// FOR IMAGE /////////

                            var pictureData = req.body.pictureData;
                            if (pictureData != "" && pictureData != undefined) {
                                var image_name = provider._id + utils.tokenGenerator(4);
                                var url = utils.getImageFolderPath(req, 2) + image_name + '.jpg';
                                provider.picture = url;
                                //utils.saveImageFromBrowser(req.files[0].path, image_name + '.jpg', 2);
                                pictureData = pictureData.split(',')
                                pictureData = pictureData[1]
                                req.body.pictureData = pictureData;
                                utils.saveImageAndGetURL(image_name, req, res, 2);
                            }


                            ///////////////////////////

                            Country.findOne({ countryphonecode: country_code }).then((country) => {

                                if (country) {
                                    var country_id = country._id;

                                    Document.find({ countryid: country_id, type: 1 }).then((document) => {
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
                                                var providerdocument = new Provider_Document({
                                                    provider_id: provider._id,
                                                    document_id: entry._id,
                                                    name: entry.title,
                                                    option: entry.option,
                                                    document_picture: "",
                                                    unique_code: entry.unique_code,
                                                    expired_date: "",
                                                    is_unique_code: entry.is_unique_code,
                                                    is_expired_date: entry.is_expired_date,
                                                    is_document_expired: false,
                                                    is_uploaded: 0

                                                });


                                                providerdocument.save().then(() => {
                                                }, (err) => {
                                                    console.log(err);
                                                });
                                            });

                                        } else {
                                            is_document_uploaded = 1;
                                        }



                                        provider.wallet_currency_code = country.currencycode;
                                        provider.is_document_uploaded = is_document_uploaded;
                                        provider.save().then((newprovider) => {
                                            var is_referral = req.body.is_referral
                                            if (is_referral == 1) {
                                                var referral_code = req.body.referral_code
                                                Provider.findOne({ referral_code: referral_code }).then((providerData) => {
                                                    if (!providerData) {
                                                        res.json({ success: false, error_code: error_message.ERROR_CODE_REFERRAL_CODE_INVALID });
                                                    } else if (providerData.country != newprovider.country) {
                                                        res.json({
                                                            success: false,
                                                            error_code: error_message.ERROR_CODE_YOUR_FRIEND_COUNTRY_NOT_MATCH_WITH_YOU
                                                        });
                                                    } else {
                                                        Country.findOne({ countryphonecode: newprovider.country_phone_code }).then((country) => {

                                                            var providerRefferalCount = providerData.total_referrals;

                                                            if (providerRefferalCount < country.providerreferral) {

                                                                var total_wallet_amount = utils.addWalletHistory(constant_json.PROVIDER_UNIQUE_NUMBER, providerData.unique_id, providerData._id, null,
                                                                    providerData.wallet_currency_code, providerData.wallet_currency_code,
                                                                    1, country.bonus_to_providerreferral, providerData.wallet, constant_json.ADD_WALLET_AMOUNT, constant_json.ADDED_BY_REFERRAL, "Provider used your referral code, provider id : " + provider.unique_id);

                                                                providerData.total_referrals = +providerData.total_referrals + 1;
                                                                providerData.wallet = total_wallet_amount;
                                                                providerData.save().then(() => {
                                                                });

                                                                newprovider.is_referral = 1;
                                                                newprovider.referred_by = providerData._id;

                                                                total_wallet_amount = utils.addWalletHistory(constant_json.PROVIDER_UNIQUE_NUMBER, newprovider.unique_id, newprovider._id, null,
                                                                    newprovider.wallet_currency_code, newprovider.wallet_currency_code,
                                                                    1, country.referral_bonus_to_provider, newprovider.wallet, constant_json.ADD_WALLET_AMOUNT, constant_json.ADDED_BY_REFERRAL, "Using refferal code : " + referral_code + " of provider id : " + providerData.unique_id);

                                                                newprovider.wallet = total_wallet_amount;
                                                                newprovider.save().then(() => {
                                                                    var email_notification = setting_detail.email_notification;

                                                                    if (email_notification == true) {
                                                                        allemails.sendProviderRegisterEmail(req, newprovider, newprovider.first_name + " " + newprovider.last_name);
                                                                    }
                                                                    req.session.provider = provider;
                                                                    res.redirect('/provider_profiles');
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
                                            } else {
                                                var email_notification = setting_detail.email_notification;

                                                if (email_notification == true) {
                                                    allemails.sendProviderRegisterEmail(req, provider, provider.first_name + " " + provider.last_name);
                                                }
                                                req.session.provider = provider;
                                                res.redirect('/provider_profiles');
                                            }
                                        }, (err) => {
                                            utils.error_response(err, res)
                                        });

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

exports.provider_login = function (req, res) {

    if (typeof req.session.provider == 'undefined') {
        res.redirect('/');
    } else {
        res.redirect('/provider_profiles');
    }

}

exports.forgot_password = function (req, res) {

    if (typeof req.session.provider == 'undefined') {
        res.redirect('/');
    } else {
        res.redirect('/provider_profiles');
    }
}

exports.forgot_psw_email = function (req, res) {
    if (typeof req.session.provider == 'undefined') {

        req.session.type = "provider";
        Provider.findOne({email: req.body.email}).then((response) => { 
            if (response) {
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
                var id = response.id;
                var link = req.protocol + '://' + req.get('host') + '/provider_newpassword?id=' + id + '&&token=' + token;



                Utils.mail_notification(response.email, req.__('reset_password'), link, '');


                Provider.findOneAndUpdate({_id: id}, {token: token}).then(() => { 
                    
                    message = admin_messages.success_message_send_link;
                    res.redirect("/provider_login");
                    
                });

            } else {
                message = admin_messages.error_message_email_not_registered;
                res.redirect('/provider_forgot_password');
            }
        });
    } else {
        res.redirect('/provider_profiles');
    }
}

exports.edit_psw = function (req, res) {

    if (typeof req.session.provider == 'undefined') {
        var id = req.query.id;
        var token = req.query.token;
        res.render('provider_new_password', {'id': id, 'token': token});
        delete message;
    } else {
        res.redirect('/provider_profiles');
    }
};

exports.update_psw = function (req, res) {

    if (typeof req.session.provider == 'undefined') {


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

        Provider.findOneAndUpdate(query, {password: hash, token: token}).then((response) => { 

            if (!response) {
                message = admin_messages.error_message_token_expired;
                res.redirect('/provider_forgot_password');
            } else {
                message = admin_messages.success_message_password_update;
                res.redirect('/provider_login');
            }
        });
    } else {
        res.redirect('/provider_profiles');
    }
};

exports.provider_document_panel = function (req, res) {
    if (typeof req.session.provider != 'undefined') {

        Provider_Document.find({provider_id: req.session.provider._id}).then((providerdocument) => { 

            res.render('provider_document_panel', {'data': providerdocument, 'moment': moment});

        });

    } else {
        res.redirect('/provider_profiles');
    }
}
exports.provider_login_post = function (req, res) {

    if (typeof req.session.provider == 'undefined') {

        req.session.type = "provider";
        ////// for remove case cencitive ///////
        var email = req.body.email.toLowerCase()
        ////////////////////////////////////////

        Provider.findOne({email: email}).then((provider) => { 
            if (!provider) {
                message = admin_messages.error_message_email_not_registered;
                //res.redirect('/');
                res.render('driver-login-form');
            } else {

                var password = req.body.password;
                var hash = crypto.createHash('md5').update(password).digest('hex');
                if (provider.password != hash) {
                    message = admin_messages.error_message_password_wrong;
                    //res.redirect('/');
                    res.render('driver-login-form');
                } else {
                    if (provider.password != hash) {
                        message = admin_messages.error_message_user_not_approved;
                        //res.redirect('/');
                        res.render('driver-login-form');
                    } else {
                        req.session.provider = provider;
                        //providers=req.session.provider;
                        ////////////  token generate /////

                        message = admin_messages.success_message_login;
                        res.redirect('/provider_profiles');

                    }
                }
            }
        });
    } else {
        res.redirect('/provider_profiles');
    }
};

exports.provider_trip_map = function (req, res) {

    if (typeof req.session.provider == 'undefined') {

        res.redirect('/provider_login');
    } else {
        var id = req.body.id;
        var user_name = req.body.u_name;
        var provider_name = req.body.pr_name;
        var query = {};
        query['tripID'] = id;

        Trip.findById(id).then((trips) => { 
            if(!trips){
                Trip_history.findById(id).then(trips=>{
                    Trip_Location.findOne(query).then((locations) => { 
                        var url = "https://maps.googleapis.com/maps/api/js?key=" + setting_detail.web_app_google_key + "&libraries=places&callback=initialize"
                        if (!locations) {
                            res.render('provider_trip_map', {'data': trips, 'url': url, 'user_name': user_name, 'provider_name': provider_name, 'moment': moment});
        
                        } else {
                            res.render('provider_trip_map', {'data': trips, 'url': url, 'trip_path_data': locations, 'user_name': user_name, 'provider_name': provider_name, 'moment': moment});
                        }
                    });
                })
            }
            else{
                Trip_Location.findOne(query).then((locations) => { 
                    var url = "https://maps.googleapis.com/maps/api/js?key=" + setting_detail.web_app_google_key + "&libraries=places&callback=initialize"
                    if (!locations) {
                        res.render('provider_trip_map', {'data': trips, 'url': url, 'user_name': user_name, 'provider_name': provider_name, 'moment': moment});
    
                    } else {
                        res.render('provider_trip_map', {'data': trips, 'url': url, 'trip_path_data': locations, 'user_name': user_name, 'provider_name': provider_name, 'moment': moment});
                    }
                });
            }
        });

    }
}

exports.provider_profile = function (req, res) {
    if (typeof req.session.provider != "undefined") {
        if (req.session.provider.is_document_uploaded == 1) {
            Provider.findById(req.session.provider._id).then((response) => { 

                Country.findOne({countryname: response.country}).then((country_detail) => { 
                    var is_public_demo = setting_detail.is_public_demo;
                    partners = response;
                    
                    var condition = { $match: { user_id: {$eq: Schema(req.session.provider._id)} } }
                    var referral_condition = {$match: {wallet_comment_id: {$eq: Number(constant_json.ADDED_BY_REFERRAL) }}}
                    var group = {
                        $group:{
                            _id: null,
                            total_referral_credit: {$sum: '$added_wallet'}
                        }
                    }

                    Wallet_history.aggregate([condition, referral_condition, group]).then((wallet_history_count)=>{
                        if(wallet_history_count.length>0){
                            res.render("provider_profile", {phone_number_min_length: setting_detail.minimum_phone_number_length, phone_number_length: setting_detail.maximum_phone_number_length, is_public_demo: is_public_demo, login1: response,total_referral_credit: wallet_history_count[0].total_referral_credit});
                            delete message;
                        } else {
                            res.render("provider_profile", {phone_number_min_length: setting_detail.minimum_phone_number_length, phone_number_length: setting_detail.maximum_phone_number_length, is_public_demo: is_public_demo, login1: response,total_referral_credit: 0});
                        delete message;
                        }
                    })
                });
            });
        } else {
            res.redirect('/provider_document_panel');
        }
    } else {
        res.redirect('/provider_login');
    }
};

exports.provider_profile_update = function (req, res) {

    if (typeof req.session.provider != "undefined") {

        var id = req.body.id
        Provider.findOne({phone: req.body.phone, country_phone_code: req.body.country_phone_code, _id: {$ne: id}}).then((provider) => { 
            if (provider)
            {
                message = admin_messages.error_message_mobile_no_already_used;
                res.redirect('/provider_profiles')
            } else
            {
                Provider.findById(id).then((provider_detail) => { 

                    var password = req.body.old_password;
                    var hash = crypto.createHash('md5').update(password).digest('hex');
                    if (provider_detail.password == hash)
                    {
                        var picture = req.body.pictureData;
                        if (picture != "")
                        {
                            utils.deleteImageFromFolder(provider_detail.picture, 2);
                            var image_name = provider_detail._id + utils.tokenGenerator(4);
                            var url = utils.getImageFolderPath(req, 2) + image_name + '.jpg';
                            req.body.picture = url;
                            file_data_path = url;
                            //utils.saveImageFromBrowser(req.files[0].path, image_name + '.jpg', 1);
                            picture = picture.split(',')
                            picture = picture[1]
                            req.body.pictureData = picture;

                            utils.saveImageAndGetURL(image_name, req, res, 2);

                            Provider.findByIdAndUpdate(id, req.body, {new : true}, function (err, provider) {
                                message = admin_messages.success_message_profile_update;
                                req.session.provider = provider;
                                res.redirect('/provider_profiles')
                            });
                        } else
                        {
                            Provider.findByIdAndUpdate(id, req.body, {new : true}, function (err, provider) {
                                message = admin_messages.success_message_profile_update;
                                req.session.provider = provider;
                                res.redirect('/provider_profiles')
                            });
                        }



                    } else
                    {
                        message = admin_messages.error_message_password_wrong;
                        res.redirect('/provider_profiles')
                    }

                })
            }
        })
    } else {

        res.redirect('/provider_login');
    }
}


exports.provider_sign_out = function (req, res) {
        req.session.type = "provider";
        delete req.session.provider;
        res.redirect('/provider_login');
};



exports.provider_social_login_web = function (req, res) {

    Provider.findOne({social_unique_id: req.body.social_unique_id}).then((provider) => { 

        if (provider)
        {
            var token = utils.tokenGenerator(32);
            provider.token = token;

            provider.device_type = req.body.device_type;
            provider.login_by = req.body.login_by;

            var device_token = "";
            var device_type = "";
            if (provider.device_token != "" && provider.device_token != req.body.device_token) {
                device_token = provider.device_token;
                device_type = provider.device_type;
            }
            provider.save().then(() => { 

                if (device_token != "") {
                    utils.sendPushNotification(constant_json.USER_UNIQUE_NUMBER, device_type, device_token, push_messages.PUSH_CODE_FOR_USER_LOGIN_IN_OTHER_DEVICE, constant_json.PUSH_NOTIFICATION_SOUND_FILE_IN_IOS);
                }
                req.session.provider = provider;
                message = admin_messages.success_message_login;
                res.json({ success: true, url: 'provider_profiles' });
            }, (err) => {
                console.log(err);
            });
        } else
        {
            message = admin_messages.error_message_email_not_registered;
            res.json({success: false})
        }
    })
}

exports.provider_vehicle = function (req, res) {

    if (typeof req.session.provider != 'undefined') {


        var condition = {$match: {"_id": Schema(req.session.provider._id)}};
        var vunwind = {$unwind: "$vehicle_detail"}

        var lookup = {
            $lookup:
            {
                from: "types",
                localField: "vehicle_detail.admin_type_id",
                foreignField: "_id",
                as: "type_detail"
            }
        };
        var unwind = {$unwind: {
            path: "$type_detail",
            preserveNullAndEmptyArrays: true
        }
    };
    var group = {$group: {
        _id: null,
        "vehicle_detail": {$push: {
            is_selected: "$vehicle_detail.is_selected",
            passing_year: "$vehicle_detail.passing_year",
            color: "$vehicle_detail.color",
            model: "$vehicle_detail.model",
            plate_no: "$vehicle_detail.plate_no",
            name: "$vehicle_detail.name",
            _id: "$vehicle_detail._id",
            provider_id: "$_id",
            type_image_url: '$type_detail.type_image_url',
            typename: '$type_detail.typename',
            accessibility: "$vehicle_detail.accessibility"
            
        }}
    }
}
Provider.aggregate([condition, vunwind, lookup, unwind, group]).then((provider) => { 
    if (provider.length == 0) {
        res.render('provider_vehicle', {vehicle_list: []})
    } else {
        res.render('provider_vehicle', {vehicle_list: provider[0].vehicle_detail})
    }
    delete message;
}, (err) => {
    utils.error_response(err, res)
})
} else {
    res.redirect('/provider_login');
}
};


exports.edit_vehicle_detail = function (req, res) {
    var vehicle_accesibility = VEHICLE_ACCESIBILITY;
    if (typeof req.session.provider != 'undefined') {
        Provider.findOne({_id: req.body.provider_id}).then((provider) => { 

            var index = provider.vehicle_detail.findIndex(x => (x._id).toString() == req.body.vehicle_id);

            Provider_Vehicle_Document.find({provider_id: req.body.provider_id, vehicle_id: req.body.vehicle_id}).then((provider_vehicle_document) => { 

                var lookup = {
                    $lookup:
                    {
                        from: "types",
                        localField: "typeid",
                        foreignField: "_id",
                        as: "type_detail"
                    }
                };
                var unwind = {$unwind: "$type_detail"};

                var cityid_condition = {$match: {'cityid': {$eq: Schema(provider.cityid)}}};

                Citytype.aggregate([cityid_condition, lookup, unwind]).then((type_available) => { 

                    res.render('provider_edit_vehicle_detail', {provider_id: req.body.provider_id, vehicle_accesibility: vehicle_accesibility, type_available: type_available, provider_vehicle_document: provider_vehicle_document, vehicle_detail: provider.vehicle_detail[index]})
                    delete message;
                }, (err) => {
                    utils.error_response(err, res)
                });

            })
        })

    } else {
        res.redirect('/provider_login');
    }
};

exports.update_vehicle_detail = function (req, res) {

    if (typeof req.session.provider != 'undefined') {

        Provider.findOne({_id: req.body.provider_id}).then((provider) => { 

            var index = provider.vehicle_detail.findIndex(x => (x._id).toString() == req.body.vehicle_id);


            provider.vehicle_detail[index].name = req.body.name;
            provider.vehicle_detail[index].plate_no = req.body.plate_no;
            provider.vehicle_detail[index].model = req.body.model;
            provider.vehicle_detail[index].color = req.body.color;
            provider.vehicle_detail[index].passing_year = req.body.passing_year;
            provider.vehicle_detail[index].accessibility = req.body.accessibility;


            Provider.findOneAndUpdate({_id: req.body.provider_id}, {vehicle_detail: provider.vehicle_detail}, {new : true}).then(() => { 

                // res.redirect('/approved_providers')
                message = admin_messages.success_update_vehicle_detail;
                res.redirect('/provider_vehicle');

            })
        });
    } else {
        res.redirect('/provider_login');
    }
};

exports.provider_add_vehicle = function (req, res) {
    var vehicle_accesibility = VEHICLE_ACCESIBILITY;

    if (typeof req.session.provider != 'undefined') {
        res.render('provider_edit_vehicle_detail', {provider_id: req.session.provider._id, vehicle_accesibility: vehicle_accesibility})
    } else {
        res.redirect('/provider_login');
    }
};

exports.provider_add_vehicle_details = function (req, res) {

    if (typeof req.session.provider != 'undefined') {

        Provider.findOne({_id: req.body.provider_id}).then((provider) => { 

            var is_selected = false;
            if (provider.vehicle_detail.length == 0) {
                is_selected = true;
            }
            if (provider.vehicle_detail.length == 0) {
                provider.service_type = null;
                provider.admintypeid = null;
            }
            var mongoose = require('mongoose');
            var ObjectId = mongoose.Types.ObjectId;
            var x = new ObjectId();
            var vehicel_json = {
                _id: x,
                name: req.body.name,
                plate_no: req.body.plate_no,
                model: req.body.model,
                color: req.body.color,
                passing_year: req.body.passing_year,
                accessibility: req.body.accessibility,
                service_type: null,
                admin_type_id: null,
                is_selected: is_selected,
                is_document_uploaded: false
            }

            Country.findOne({countryname: provider.country}).then((country) => { 

                Document.find({countryid: country._id, type: 2}).then((document) => { 

                    if (document.length == 0) {
                        provider.is_vehicle_document_uploaded = true;
                        vehicel_json.is_document_uploaded = true;
                        provider.vehicle_detail.unshift(vehicel_json);
                        provider.save();
                        message = admin_messages.success_add_vehicle_detail;
                        res.redirect('/provider_vehicle');
                    } else {

                        var is_document_uploaded = false;
                        var document_size = document.length;

                        var count = 0;
                        for (var i = 0; i < document_size; i++) {

                            if (document[i].option == 0) {
                                count++;
                            } else {
                                break;
                            }
                            if (count == document_size) {
                                is_document_uploaded = true;
                            }
                        }
                        vehicel_json.is_document_uploaded = is_document_uploaded;
                        provider.vehicle_detail.unshift(vehicel_json);
                        provider.save();
                        
                        document.forEach(function (entry, index) {
                            var providervehicledocument = new Provider_Vehicle_Document({

                                vehicle_id: x,
                                provider_id: provider._id,
                                document_id: entry._id,
                                name: entry.title,
                                option: entry.option,
                                document_picture: "",
                                unique_code: entry.unique_code,
                                expired_date: "",
                                is_unique_code: entry.is_unique_code,
                                is_expired_date: entry.is_expired_date,
                                is_document_expired: false,
                                is_uploaded: 0

                            });
                            providervehicledocument.save().then(() => { 
                                if (index == document.length - 1) {
                                    message = admin_messages.success_add_vehicle_detail;
                                    res.redirect('/provider_vehicle');
                                }
                            }, (err) => {
                                utils.error_response(err, res)
                            });
                        });
                    }
                });
            });
        });
    } else {
        res.redirect('/provider_login');
    }
};


exports.vehicle_document_list = function (req, res) {

    if (typeof req.session.provider != 'undefined') {
        Provider_Vehicle_Document.find({provider_id: req.body.provider_id, vehicle_id: req.body.vehicle_id}).then((provider_vehicle_document) => { 

            res.render('provider_vehicle_document_list', {provider_id: req.body.provider_id, vehicle_id: req.body.vehicle_id, moment: moment, detail: provider_vehicle_document})
            delete message;
        });
    } else {
        res.redirect('/provider_login');
    }
};

exports.provider_vehicle_documents_edit = function (req, res) {

    if (typeof req.session.provider != 'undefined') {

        Provider_Vehicle_Document.findById(req.body.id).then((provider_document) => { 
            
            res.render('provider_vehicle_documents_edit', {detail: provider_document, moment: moment});
            delete message;
            
        });
    } else {
        res.redirect('/provider_login');
    }
};

exports.provider_vehicle_documents_update = function (req, res) {

    if (typeof req.session.provider != 'undefined') {
        Provider_Vehicle_Document.findById(req.body.id).then((provider_document) => { 
         

            provider_document.expired_date = req.body.expired_date;
            provider_document.unique_code = req.body.unique_code;

            message = admin_messages.success_update_document;
            if (req.files.length > 0)
            {
                var image_name = provider_document.provider_id + utils.tokenGenerator(4);
                var url = utils.getImageFolderPath(req, 3) + image_name + '.jpg';
                utils.saveImageFromBrowser(req.files[0].path, image_name + '.jpg', 3);

                provider_document.document_picture = url;
                provider_document.is_uploaded = 1;
                provider_document.save().then(() => { 

                    Provider.findOne({_id: provider_document.provider_id}).then((provider) => {
                        Provider_Vehicle_Document.find({
                            vehicle_id: provider_document.vehicle_id,
                            option: 1,
                            provider_id: provider_document.provider_id,
                            is_uploaded: 0
                        }).then((providervehicledocumentuploaded) => {
                            Provider_Vehicle_Document.find({
                                vehicle_id: provider_document.vehicle_id,
                                option: 1,
                                provider_id: provider_document.provider_id,
                                is_document_expired: true
                            }).then((expired_providervehicledocumentuploaded) => {
                                var index = provider.vehicle_detail.findIndex((x) => x._id.toString() == provider_document.vehicle_id.toString());
                                console.log('index')
                                console.log(index)
                                
                                if (expired_providervehicledocumentuploaded.length == 0) {
                                    provider.vehicle_detail[index].is_documents_expired = false;
                                } else {
                                    provider.vehicle_detail[index].is_documents_expired = true;
                                }
                                if (providervehicledocumentuploaded.length == 0) {
                                    provider.vehicle_detail[index].is_document_uploaded = true;
                                } else {
                                    provider.vehicle_detail[index].is_document_uploaded = false;
                                }
                                provider.markModified('vehicle_detail');
                                if(provider.vehicle_detail[index].is_selected){
                                    if (providervehicledocumentuploaded.length == 0) {
                                        provider.is_vehicle_document_uploaded = true;
                                    } else {
                                        provider.is_vehicle_document_uploaded = false;
                                    }
                                }
                                provider.save();
                            });

                        });
                    })


                    req.body = {provider_id: provider_document.provider_id, vehicle_id: provider_document.vehicle_id}
                    myProviders.vehicle_document_list(req, res);
                }, (err) => {
                    utils.error_response(err, res)
                });
            } else {
                provider_document.save().then(() => { 
                    req.body = {provider_id: provider_document.provider_id, vehicle_id: provider_document.vehicle_id}
                    myProviders.vehicle_document_list(req, res);
                }, (err) => {
                    utils.error_response(err, res)

                });

            }
            
        });
    } else {
        res.redirect('/provider_login');
    }
}; 


exports.provider_documents_edit = function (req, res) {

    if (typeof req.session.provider != 'undefined') {

        Provider_Document.findById(req.body.id).then((provider_document) => { 
         
            res.render('provider_documents_edit', {detail: provider_document, moment: moment});
            delete message;
            
        });
    } else {
        res.redirect('/provider_login');
    }
};

exports.provider_documents_update = function (req, res) {
    if (typeof req.session.provider != 'undefined') {
        Provider_Document.findById(req.body.id).then((provider_document) => {


            provider_document.expired_date = req.body.expired_date;
            provider_document.unique_code = req.body.unique_code;
            message = admin_messages.success_update_document;
            if (req.files.length > 0) {
                var image_name = provider_document.provider_id + utils.tokenGenerator(4);
                var url = utils.getImageFolderPath(req, 3) + image_name + '.jpg';
                utils.saveImageFromBrowser(req.files[0].path, image_name + '.jpg', 3);

                provider_document.document_picture = url;
                provider_document.is_uploaded = 1;
                provider_document.save(function () {
                    Provider.findOne({ _id: req.session.provider._id }).then((provider) => {
                        Provider_Document.find({
                            provider_id: provider._id,
                            option: 1,
                            is_uploaded: 0
                        }).then((providerdocument) => {
                            if (providerdocument.length > 0) {
                                provider.is_document_uploaded = 0;
                            } else {
                                provider.is_document_uploaded = 1;
                            }
                            provider.save(function () {
                                res.redirect('/provider_document_panel');
                                delete message;
                            }, (err) => {
                                utils.error_response(err, res)
                            })
                        })
                    })

                }, (err) => {
                    utils.error_response(err, res)
                });
            } else {
                provider_document.save(function () {
                    Provider.findOne({ _id: req.session.provider._id }).then((provider) => {
                        Provider_Document.find({
                            provider_id: provider._id,
                            option: 1,
                            is_uploaded: 0
                        }).then((providerdocument) => {
                            if (providerdocument.length > 0) {
                                provider.is_document_uploaded = 0;
                            } else {
                                provider.is_document_uploaded = 1;
                            }
                            provider.save(function () {
                                res.redirect('/provider_document_panel');
                                delete message;
                            }, (err) => {
                                utils.error_response(err, res)
                            })
                        })
                    })
                }, (err) => {
                    utils.error_response(err, res)
                });

            }

        });
    } else {
        res.redirect('/provider_login');
    }
}; 

exports.terms = function (req, res){
	res.render('provider_terms&condition');
} 

exports.privacy = function (req, res){
	res.render('provider_privacy_policy');
}