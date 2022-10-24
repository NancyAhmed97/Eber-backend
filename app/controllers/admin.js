var utils = require('./utils');
var Settings = require('mongoose').model('Settings');
var User = require('mongoose').model('User');
var Provider = require('mongoose').model('Provider');
var Language = require('mongoose').model('language');
var admin = require('mongoose').model('admin');


exports.getlanguages = function (req, res) {
    Language.find({}).then((languages) => { 
        if (languages.length == 0)
        {
            res.json({success: false, error_code: error_message.ERROR_CODE_LANGUAGES_NOT_FOUND});
        } else
        {
            res.json({success: true, message: success_messages.MESSAGE_CODE_LANGUAGES_GET_SUCCESSFULLY, languages: languages});
        }
    });
}

//// getsettingdetail /////
exports.getsettingdetail = function (req, res) {
    Settings.findOne({}).then((setting) => { 
        if (!setting) {
            res.json({success: false, error_code: error_message.ERROR_CODE_SETTING_DETAIL_NOT_FOUND});
        } else {
            res.json({
                success: true,
                userEmailVerification: setting.userEmailVerification,
                providerEmailVerification: setting.providerEmailVerification,
                userSms: setting.userSms,
                providerSms: setting.providerSms,
                admin_phone: setting.admin_phone,
                contactUsEmail: setting.contactUsEmail,
                scheduledRequestPreStartMinute: setting.scheduled_request_pre_start_minute,
                userPath: setting.userPath,
                providerPath: setting.providerPath,
                is_tip: setting.is_tip,
                android_user_app_version_code: setting.android_user_app_version_code,
                android_user_app_force_update: setting.android_user_app_force_update,
                android_provider_app_version_code: setting.android_provider_app_version_code,
                android_provider_app_force_update: setting.android_provider_app_force_update,
                ios_user_app_version_code: setting.ios_user_app_version_code,
                ios_user_app_force_update: setting.ios_user_app_force_update,
                ios_provider_app_version_code: setting.ios_provider_app_version_code,
                ios_provider_app_force_update: setting.ios_provider_app_force_update,
                is_provider_initiate_trip: setting.is_provider_initiate_trip
            });
        }

    });
};

exports.generate_firebase_access_token = async function (req, res) {
    var type = Number(req.body.type);
    var Table = User;
    switch (type) {
        case Number(constant_json.USER_UNIQUE_NUMBER):
            Table = User;
            break;
        case Number(constant_json.PROVIDER_UNIQUE_NUMBER):
            Table = Provider;
            break;
        case Number(constant_json.ADMIN_UNIQUE_NUMBER):
            Table = admin;
            break;
        default:
            Table = User;
            break;
    }
    var detail = await Table.findOne({ _id: req.body.user_id })
    if (detail) {
        if (detail.token != req.body.token && type != Number(constant_json.ADMIN_UNIQUE_NUMBER)) {
            res.json({ success: false, error_code: error_message.ERROR_CODE_INVALID_TOKEN });
        } else {
            utils.create_user_token(detail, type, response_data => {
                res.json(response_data)
            })
        }
    } else {
        res.json({
            success: false,
            error_code: error_message.ERROR_CODE_SOMETHING_WENT_WRONG
        });
    }
}

exports.update_unapprove_status = async function (req, res) {
    utils.check_request_params(req.body, [{ name: 'user_id', type: 'string' }, { name: 'token', type: 'string' }], function (response) {
        if (!response.success) {
            return res.json({ success: false, error_code: response.error_code, error_description: response.error_description });
        }
    })

    try {
        let type = Number(req.body.type);
        let Table = User;
        switch (type) {
            case Number(constant_json.USER_UNIQUE_NUMBER):
                type = Number(constant_json.USER_UNIQUE_NUMBER);
                Table = User;
                break;
            case Number(constant_json.PROVIDER_UNIQUE_NUMBER):
                type = Number(constant_json.PROVIDER_UNIQUE_NUMBER);
                Table = Provider;
                break;
            default:
                type = Number(constant_json.USER_UNIQUE_NUMBER);
                Table = User;
                break;
        }

        let detail = await Table.findOne({ _id: req.body.user_id })
        if (!detail) {
            return res.json({ success: false, error_code: error_message.ERROR_CODE_USER_DETAIL_NOT_FOUND });
        }
        if (detail.token != req.body.token) {
            return res.json({ success: false, error_code: error_message.ERROR_CODE_INVALID_TOKEN });
        }
        detail.is_approved = 0;
        await detail.save();

        return res.json({ success: true, message: success_messages.MESSAGE_CODE_UNAPPROVED_SUCCESSFULLY });

    } catch (e) {
        return res.json({ success: false, error_code: error_message.ERROR_CODE_SOMETHING_WENT_WRONG });
    }
};