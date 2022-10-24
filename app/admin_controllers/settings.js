var utils = require('../controllers/utils');
var Settings = require('mongoose').model('Settings');
var Card = require('mongoose').model('Card');
var console = require('../controllers/console');
require('../controllers/constant');

exports.installation_settings = function (req, res) {
    if (typeof req.session.userid != 'undefined') {
        Settings.findOne({}).then((setting) => { 
            if (setting)
            {
                app_name = setting_detail.app_name;
                partner_panel_name = setting_detail.partner_panel_name;
                dispatcher_panel_name = setting_detail.dispatcher_panel_name;
                hotel_panel_name = setting_detail.hotel_panel_name;
                
                res.render('admin_installation_settings', {
                    setting: setting,
                    PAYMENT_GATEWAY: PAYMENT_GATEWAY,
                    'app_name': app_name,
                    'partner_panel_name': partner_panel_name,
                    'dispatcher_panel_name': dispatcher_panel_name,
                    'hotel_panel_name': hotel_panel_name
                });
                delete message;
            }
        });
    } else {
        res.redirect('/admin');
    }
};

exports.terms_and_privacy_setting = function (req, res) {
    if (typeof req.session.userid != 'undefined') {
        Settings.findOne({}).then((setting) => { 
            if (setting)
            {
                res.render('terms_and_privacy_setting', {
                    setting: setting
                });
                delete message;
            }
        });
    } else {
        res.redirect('/admin');
    }
};

exports.update_provider_terms_and_condition = function (req, res) {
    if (typeof req.session.userid != 'undefined') {
        Settings.findOne({}).then((setting) => { 
            if (setting)
            {
                setting.provider_terms_and_condition = req.body.provider_terms_and_condition;
                setting.save();
                setting_detail = setting;
                message = admin_messages.success_message_update;
                res.redirect('terms_and_privacy_setting');
            }
        });
    } else {
        res.redirect('/admin');
    }
};

exports.update_provider_privacy_policy = function (req, res) {
    if (typeof req.session.userid != 'undefined') {
        Settings.findOne({}).then((setting) => { 
            if (setting)
            {
                setting.provider_privacy_policy = req.body.provider_privacy_policy;
                setting.save();
                setting_detail = setting;
                message = admin_messages.success_message_update;
                res.redirect('terms_and_privacy_setting');
            }
        });
    } else {
        res.redirect('/admin');
    }
};

exports.update_user_terms_and_condition = function (req, res) {
    if (typeof req.session.userid != 'undefined') {
        Settings.findOne({}).then((setting) => { 
            if (setting)
            {
                setting.user_terms_and_condition = req.body.user_terms_and_condition;
                setting.save();
                setting_detail = setting;
                message = admin_messages.success_message_update;
                res.redirect('terms_and_privacy_setting');
            }
        });
    } else {
        res.redirect('/admin');
    }
};

exports.update_user_privacy_policy = function (req, res) {
    if (typeof req.session.userid != 'undefined') {
        Settings.findOne({}).then((setting) => { 
            if (setting)
            {
                setting.user_privacy_policy = req.body.user_privacy_policy;
                setting.save();
                setting_detail = setting;
                message = admin_messages.success_message_update;
                res.redirect('terms_and_privacy_setting');
            }
        });
    } else {
        res.redirect('/admin');
    }
};

////// APP key 

exports.update_app_key = function (req, res) {
    Settings.findOne({}).then((setting) => { 

        setting.hotline_app_id = (req.body.hotline_app_id).trim();
        setting.hotline_app_key = (req.body.hotline_app_key).trim();
        setting.save();
        setting_detail = setting;
        message = admin_messages.success_message_update;
        res.redirect('installation_settings');
    });
};


exports.twilio_settings_update = function (req, res) {
    Settings.findOne({}).then((setting) => { 
        setting.twilio_account_sid = (req.body.twilio_account_sid).trim();
        setting.twilio_auth_token = (req.body.twilio_auth_token).trim();
        setting.twilio_number = req.body.twilio_number;
        setting.twiml_url = req.body.twiml_url;
        setting.save();
        setting_detail = setting;
    });
    message = " update successfully";
    res.redirect('installation_settings');
};


////// THEME SETTING IMAGES
exports.upload_logo_images = function (req, res) {

    if (typeof req.session.userid != "undefined") {

        var file_list_size = 0;
        var files_details = req.files;

        if (files_details != null || files_details != 'undefined') {
            file_list_size = files_details.length;

            var file_data;
            var file_id;
            var file_name = "";

            for (i = 0; i < file_list_size; i++) {

                file_data = files_details[i];
                file_id = file_data.fieldname;
                file_name = '';

                if (file_id == 'logo_image') {
                    file_name = constant_json.LOGO_IMAGE_NAME;
                } else if (file_id == 'title_image') {
                    file_name = constant_json.TITLE_IMAGE_NAME;
                } else if (file_id == 'mail_title_image') {
                    file_name = constant_json.MAIL_TITLE_IMAGE_NAME;
                } else if (file_id == 'authorised_image') {
                    file_name = constant_json.AUTHORISED_IMAGE_NAME;
                } else if (file_id == 'user_logo') {
                    file_name = constant_json.USER_LOGO;
                }

                if (file_name != '') {
                    utils.saveImageFromBrowser(req.files[0].path, file_name, 6);

                }

            }


        }
        message = " update successfully";
        res.redirect('/settings');

    } else {
        res.redirect('/admin');
    }
};


/////// IOS CERTIFICATE UPLOAD ////////
exports.upload_ios_push_certificate = function (req, res) {
    Settings.findOne({}).then((setting) => { 
        setting.team_id = (req.body.team_id).trim();
        setting.key_id = (req.body.key_id).trim();
        setting.provider_bundle_id = (req.body.provider_bundle_id).trim();
        setting.user_bundle_id = (req.body.user_bundle_id).trim();
        setting.ios_certificate_mode = (req.body.ios_certificate_mode).trim();
        setting.save();
        setting_detail = setting;
    });

    if (typeof req.session.userid != "undefined") {
        var file_list_size = 0;
        var files_details = req.files;

        if (files_details != null || files_details != 'undefined') {
            file_list_size = files_details.length;

            var file_data;
            var file_id;
            var file_name = "";

            for (i = 0; i < file_list_size; i++) {

                file_data = files_details[i];
                file_id = file_data.fieldname;
                file_name = ''

                if (file_id == 'ios_user_cert_file') {
                    file_name = constant_json.IOS_USER_CERT_FILE_NAME;
                } else if (file_id == 'ios_user_key_file') {
                    file_name = constant_json.IOS_USER_KEY_FILE_NAME;
                } else if (file_id == 'ios_provider_cert_file') {
                    file_name = constant_json.IOS_PROVIDER_CERT_FILE_NAME;
                } else if (file_id == 'ios_provider_key_file') {
                    file_name = constant_json.IOS_PROVIDER_KEY_FILE_NAME;
                } else if (file_id == 'push_p8_file') {
                    file_name = constant_json.IOS_CERT_FILE_NAME;
                }

                if (file_name != '') {
                    utils.saveIosCertiFromBrowser(file_data.path, file_name, 1);
                }
            }
        }

        message = " update successfully";
        res.redirect('/settings');

    } else {
        res.redirect('/admin');
    }
};


////////// GOOGLE KEY////////
exports.google_api_key_settings_update = function (req, res) {
    Settings.findOne({}).then((setting) => { 
        setting.android_user_app_google_key = (req.body.android_user_app_google_key).trim();
        setting.android_provider_app_google_key = (req.body.android_provider_app_google_key).trim();
        setting.ios_user_app_google_key = (req.body.ios_user_app_google_key).trim();
        setting.ios_provider_app_google_key = (req.body.ios_provider_app_google_key).trim();
        setting.web_app_google_key = (req.body.web_app_google_key).trim();
        setting.road_api_google_key = (req.body.road_api_google_key).trim();
        setting.android_places_autocomplete_key = (req.body.android_places_autocomplete_key).trim();
        setting.ios_places_autocomplete_key = (req.body.ios_places_autocomplete_key).trim();
        setting.save();
        setting_detail = setting;
    });
    message = admin_messages.success_message_update;
    res.redirect('installation_settings');

};




////////// GCM KEY////////
exports.gcm_api_key_settings_update = function (req, res) {


    Settings.findOne({}).then((setting) => { 

        setting.android_user_app_gcm_key = (req.body.android_user_app_gcm_key).trim();
        setting.android_provider_app_gcm_key = (req.body.android_provider_app_gcm_key).trim();
        setting.save();
        setting_detail = setting;
    });
    message = admin_messages.success_message_update;
    res.redirect('installation_settings');
};




////////// ANDROID API URL////////
exports.android_app_url_settings_update = function (req, res) {
    Settings.findOne({}).then((setting) => { 
        setting.android_client_app_url = (req.body.android_client_app_url).trim();
        setting.android_driver_app_url = (req.body.android_driver_app_url).trim();
        setting.save();
        setting_detail = setting;
        message = " update successfully";
        res.redirect('installation_settings');
    });
};


//////// IOS API URL ///


exports.ios_app_url_settings_update = function (req, res) {
    Settings.findOne({}).then((setting) => { 
        setting.ios_client_app_url = (req.body.ios_client_app_url).trim();
        setting.ios_driver_app_url = (req.body.ios_driver_app_url).trim();
        setting.save();
        setting_detail = setting;
        message = " update successfully";
        res.redirect('installation_settings');
    });
};






/////////// PAYMENT GATEWAY - STRIPE//////////
exports.payment_gate_way_settings_update = function (req, res) {

    Settings.findOne({}).then((setting) => { 
        if (setting.stripe_secret_key != req.body.stripe_secret_key || setting.stripe_publishable_key != req.body.stripe_publishable_key) {
            
            Card.remove({}, function () {
            });
        }
        setting.stripe_secret_key = (req.body.stripe_secret_key).trim();
        setting.stripe_publishable_key = (req.body.stripe_publishable_key).trim();
        setting.paystack_secret_key = (req.body.paystack_secret_key).trim();
        setting.paystack_publishable_key = (req.body.paystack_publishable_key).trim();
        setting.payment_gateway_type = req.body.payment_gateway_type;
        setting.payu_key = req.body.payu_key;
        setting.payu_salt = req.body.payu_salt;
        setting.save();
        setting_detail = setting;
    });
    message = "update successfully";
    res.redirect('installation_settings');

};
////////////////////////////////////

exports.email_settings_update = function (req, res) {
    console.log(req.body)
    Settings.findOne({}).then((setting) => { 
        setting.email = (req.body.u_email).trim();
        setting.password = (req.body.email_psw).trim();
        setting.domain = req.body.domain;
        setting.smtp_host = (req.body.smtp_host).trim();
        setting.smtp_port = (req.body.smtp_port).trim();
        setting.save();
        setting_detail = setting;
    });
    message = " update successfully";
    res.redirect('installation_settings');

};

exports.settings = function (req, res) {
    if (typeof req.session.userid != 'undefined') {
        let country_list = require('../../country_list.json');
        let timezone_list = [];
        let i;
        country_list.forEach(country => {
            if (country.timezones) {
                country.timezones.forEach(timezone => {
                    i = timezone_list.findIndex(i => i == timezone)
                    if (i == -1) {
                        timezone_list.push(timezone)
                    }
                })
            }
        })
        let array = [];

        Settings.count({}).then((set) => {
            if (set == 0) {
                res.render('admin_settings', { detail: array, country: country_list });
                delete message;
            } else {
                Settings.find({}).then((settings) => {
                    res.render('admin_settings', { detail: settings, timezoneList: timezone_list, country: country_list });
                    delete message;
                })
            }
        });
    } else {
        res.redirect('/admin');
    }
};


exports.admin_settings_update = function (req, res) {

    if (typeof req.session.userid != "undefined") {
        var query = {};
        query['_id'] = req.body.id;
        Settings.findByIdAndUpdate(query, req.body, {new: true}).then((setting) => { 

            var countryname = "";
            if (req.body.countryname != "") {
                countryname = req.body.countryname.replace(/'/g, '');
            }
            setting.countryname = countryname;
            setting.location = [req.body.latitude, req.body.longitude];
            setting.save();
            setting_detail = setting;
            message = " update successfully";
            res.redirect('/settings');

        });
    } else {
        res.redirect('admin');
    }
};


exports.update_notification_setting = async function (req, res) {
    if (typeof req.session.userid == "undefined") {
        return res.redirect('admin');
    }
    var query = {};
    query['_id'] = req.body.id;
    if (typeof req.body.sms_notification == 'undefined') {
        req.body.sms_notification = 'false';
    }
    if (typeof req.body.email_notification == 'undefined') {
        req.body.email_notification = 'false';
    }
    if (typeof req.body.userPath == 'undefined') {
        req.body.userPath = 'false';
    }
    if (typeof req.body.providerPath == 'undefined') {
        req.body.providerPath = 'false';
    }
    if (typeof req.body.get_referral_profit_on_card_payment == 'undefined') {
        req.body.get_referral_profit_on_card_payment = 'false';
    }
    if (typeof req.body.get_referral_profit_on_cash_payment == 'undefined') {
        req.body.get_referral_profit_on_cash_payment = 'false';
    }
    if (typeof req.body.userEmailVerification == 'undefined') {
        req.body.userEmailVerification = 'false';
    }
    if (typeof req.body.providerEmailVerification == 'undefined') {
        req.body.providerEmailVerification = 'false';
    }
    if (typeof req.body.userSms == 'undefined') {
        req.body.userSms = 'false';
    }
    if (typeof req.body.providerSms == 'undefined') {
        req.body.providerSms = 'false';
    }
    if (typeof req.body.is_tip == 'undefined') {
        req.body.is_tip = 'false';
    }
    if (typeof req.body.is_toll == 'undefined') {
        req.body.is_toll = 'false';
    }
    if (typeof req.body.twilio_call_masking == 'undefined') {
        req.body.twilio_call_masking = 'false';
    }

    if (typeof req.body.android_user_app_force_update == 'undefined') {
        req.body.android_user_app_force_update = 'false';
    }
    if (typeof req.body.android_provider_app_force_update == 'undefined') {
        req.body.android_provider_app_force_update = 'false';
    }

    if (typeof req.body.ios_user_app_force_update == 'undefined') {
        req.body.ios_user_app_force_update = 'false';
    }
    if (typeof req.body.ios_provider_app_force_update == 'undefined') {
        req.body.ios_provider_app_force_update = 'false';
    }
    if (typeof req.body.is_provider_initiate_trip == 'undefined') {
        req.body.is_provider_initiate_trip = 'false';
    }

    if (typeof req.body.is_show_estimation_in_provider_app == 'undefined') {
        req.body.is_show_estimation_in_provider_app = 'false';
    }
    if (typeof req.body.is_show_estimation_in_user_app == 'undefined') {
        req.body.is_show_estimation_in_user_app = 'false';
    }
    if (typeof req.body.is_user_social_login == 'undefined') {
        req.body.is_user_social_login = 'false';
    }
    if (typeof req.body.is_provider_social_login == 'undefined') {
        req.body.is_provider_social_login = 'false';
    }
    if (typeof req.body.is_otp_verification_start_trip == 'undefined') {
        req.body.is_otp_verification_start_trip = 'false';
    }

    let setting = await Settings.findByIdAndUpdate(query, req.body, { new: true });
    message = "update successfully";
    setting_detail = setting;
    return res.redirect('/settings');
};


////////// UPDATE APP NAME///

////////// UPDATE APP NAME///

exports.update_app_name = function (req, res) {
    Settings.findOne({}).then((setting) => { 

        setting.app_name = req.body.app_name;
        setting.partner_panel_name = req.body.partner_panel_name;
        setting.dispatcher_panel_name = req.body.dispatcher_panel_name;
        setting.hotel_panel_name = req.body.hotel_panel_name;
        setting.corporate_panel_name = req.body.corporate_panel_name;
        setting.save();
        
        setting_detail = setting;
        message = success_messages.success_message_update;
        res.redirect('installation_settings');
    });
};


//////////  update_app_version////////
exports.update_app_version = function (req, res) {
    Settings.findOne({}).then((setting) => { 
        setting.android_user_app_version_code = (req.body.android_user_app_version_code).trim();
        setting.android_provider_app_version_code = (req.body.android_provider_app_version_code).trim();
        setting.ios_user_app_version_code = (req.body.ios_user_app_version_code).trim();
        setting.ios_provider_app_version_code = (req.body.ios_provider_app_version_code).trim();
        setting.save();
        setting_detail = setting;
        message = success_messages.success_message_update;
        res.redirect('installation_settings');
    });
};





exports.update_firebase_key = function (req, res) {
    if (typeof req.session.userid != 'undefined') {
        Settings.findOne({}, function (err, setting) {
            if (setting)
            {
                setting.firebase_apiKey = (req.body.firebase_apiKey).trim();
                setting.firebase_authDomain = (req.body.firebase_authDomain).trim();
                setting.firebase_databaseURL = (req.body.firebase_databaseURL).trim();
                setting.firebase_projectId = (req.body.firebase_projectId).trim();
                setting.firebase_storageBucket = (req.body.firebase_storageBucket).trim();
                setting.firebase_messagingSenderId = (req.body.firebase_messagingSenderId).trim();
                setting.save();
                res.redirect('installation_settings');
            }
        });
    } else {
        res.redirect('/admin');
    }
};