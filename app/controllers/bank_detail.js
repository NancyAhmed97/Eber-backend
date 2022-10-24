var bank_detail = require('mongoose').model('bank_detail');
var Provider = require('mongoose').model('Provider');
var Partner = require('mongoose').model('Partner');
var utils = require('./utils');
var fs = require("fs");
var Country = require('mongoose').model('Country');
var console = require('./console');

exports.add_bank_detail = function (req, res) {
    console.log("add_bank_detail")
    utils.check_request_params(req.body, [{name: 'provider_id', type: 'string'},{name: 'account_number', type: 'string'}], function (response) {
        if (response.success) {
            console.log(req.body)
            var social_id = req.body.social_unique_id;
            var encrypted_password = req.body.password;
            encrypted_password = utils.encryptPassword(encrypted_password);

                var type = Number(req.body.type);
                Table = Provider;
                switch (type) {
                    case Number(constant_json.PROVIDER_UNIQUE_NUMBER):
                    type = Number(constant_json.PROVIDER_UNIQUE_NUMBER);
                    Table = Provider;
                    break;
                    case Number(constant_json.PARTNER_UNIQUE_NUMBER):
                    type = Number(constant_json.PARTNER_UNIQUE_NUMBER);
                    Table = Partner;
                    break;
                }

                Table.findOne({_id: req.body.provider_id}).then((provider) => {
                    if (provider) {
                        if (social_id == undefined || social_id == null || social_id == "") {
                            social_id = null;
                        }
                        if (social_id == null && encrypted_password != "" && encrypted_password != provider.password) {
                            res.json({
                                success: false,
                                error_code: error_message.ERROR_CODE_YOUR_PASSWORD_IS_NOT_MATCH_WITH_OLD_PASSWORD
                            });
                        } else if (social_id != null && provider.social_unique_id != social_id) {
                            res.json({success: false, error_code: 100});
                        } else {
                            
                            if(!req.body.payment_gateway_type || req.body.payment_gateway_type == PAYMENT_GATEWAY.stripe){
                                console.log('stripe')
                                Country.findOne({"countryname": provider.country}).then((country_detail) => {

                                    if (!country_detail) {
                                        res.json({
                                            success: false,
                                            error_code: error_message.ERROR_CODE_FOR_PROBLEM_IN_ADD_BANK_DETAIL_PLEASE_RETRY
                                        });
                                    } else {
                                        var pictureData_buffer1 = fs.readFileSync(req.files[0].path);
                                        var pictureData_buffer2 = fs.readFileSync(req.files[1].path);
                                        var pictureData_buffer3 = fs.readFileSync(req.files[2].path);
                                        var stripe = require("stripe")(setting_detail.stripe_secret_key);
                                        console.log(setting_detail.stripe_secret_key)
                                        stripe.tokens.create({
                                            bank_account: {
                                                country: country_detail.alpha2, // country_detail.alpha2
                                                currency: provider.wallet_currency_code,
                                                account_holder_name: req.body.account_holder_name,
                                                account_holder_type: req.body.account_holder_type,
                                                routing_number: req.body.routing_number,
                                                account_number: req.body.account_number
                                            }
                                        }, function (err, token) {
                                            console.log(err)
                                            if (err) {
                                                var err = err;
                                                res.json({
                                                    success: false,
                                                    stripe_error: err.message,
                                                    error_code: error_message.ERROR_CODE_FOR_ACCOUNT_DETAIL_NOT_VALID
                                                });
                                            } else {

                                                stripe.files.create({
                                                    file: {
                                                        data: pictureData_buffer1,
                                                        name: "front.jpg",
                                                        type: "application/octet-stream",
                                                    },
                                                    purpose: "identity_document",
                                                }, (err, fileUpload) => {
                                                    console.log(err)
                                                    stripe.files.create({
                                                        file: {
                                                            data: pictureData_buffer2,
                                                            name: "back.jpg",
                                                            type: "application/octet-stream",
                                                        },
                                                        purpose: "identity_document",
                                                    }, (err, fileUpload1) => {
                                                        console.log(err)
                                                        stripe.files.create({
                                                            file: {
                                                                data: pictureData_buffer3,
                                                                name: "back.jpg",
                                                                type: "application/octet-stream",
                                                            },
                                                            purpose: "identity_document",
                                                        }, (err, fileUpload2) => {
                                                            console.log(err)
                                                            var dob = req.body.dob;
                                                            dob = dob.split('-');
                                                              
                                                            var phone_number = provider.country_phone_code + provider.phone ;
                                                            console.log("phone_number: "+phone_number)
                                                                                                                                            
                                                            stripe.accounts.create({
                                                                type: 'custom',
                                                                country: country_detail.alpha2, // country_detail.alpha2
                                                                email: provider.email,
                                                                requested_capabilities: [
                                                                  'card_payments',
                                                                  'transfers',
                                                                ],
                                                                business_type : 'individual',
                                                                business_profile: {
                                                                    mcc: "4789",
                                                                    name: provider.first_name + ' ' + provider.last_name,
                                                                    product_description: "We sell transportation services to passengers, and we charge once the job is complete",
                                                                    support_email: setting_detail.admin_email
                                                                },
                                                                individual: {
                                                                    first_name: provider.first_name,
                                                                    last_name: provider.last_name,
                                                                    email: provider.email,
                                                                    ssn_last_4: req.body.personal_id_number,
                                                                    phone : phone_number,
                                                                    gender: req.body.gender,
                                                                    dob: {
                                                                        day: dob[0],
                                                                        month: dob[1],
                                                                        year: dob[2]
                                                                    },
                                                                    address: {
                                                                        city: provider.city,
                                                                        country: country_detail.alpha2,
                                                                        line1: req.body.address,
                                                                        line2: req.body.address,
                                                                        postal_code: req.body.postal_code
                                                                    },
                                                                    verification: {
                                                                        document : {
                                                                            front : fileUpload.id,
                                                                            back : fileUpload1.id
                                                                        },
                                                                        additional_document: {
                                                                            front: fileUpload2.id
                                                                        }
                                                                    }
                                                                }
                                                            }, function (err, account) {
                                                                var err = err;
                                                                console.log(err)
                                                                if (err || !account) {
                                                                    res.json({
                                                                        success: false,
                                                                        stripe_error: err.message,
                                                                        error_code: error_message.ERROR_CODE_FOR_ACCOUNT_DETAIL_NOT_VALID
                                                                    });
                                                                } else {
                                                                    stripe.accounts.createExternalAccount(
                                                                        account.id,
                                                                        {
                                                                            external_account: token.id,
                                                                            default_for_currency: true
                                                                        },
                                                                        function (err, bank_account) {
                                                                            console.log(err)
                                                                            var err = err;
                                                                            if (err || !bank_account) {
                                                                                res.json({
                                                                                    success: false,
                                                                                    stripe_error: err.message,
                                                                                    error_code: error_message.ERROR_CODE_FOR_PROBLEM_IN_ADD_BANK_DETAIL_PLEASE_RETRY
                                                                                });

                                                                            } else {
                                                                                provider.account_id = account.id;
                                                                                provider.bank_id = bank_account.id;
                                                                                provider.save();
                                                                                stripe.accounts.update(
                                                                                account.id,
                                                                                {
                                                                                    tos_acceptance: {
                                                                                        date: Math.floor(Date.now() / 1000),
                                                                                        ip: req.connection.remoteAddress // Assumes you're not using a proxy
                                                                                    }
                                                                                }, function (err, update_bank_account) {
                                                                                    console.log(err)
                                                                                    if (err || !update_bank_account) {
                                                                                        var err = err;
                                                                                        res.json({
                                                                                            success: false,
                                                                                            stripe_error: err.message,
                                                                                            error_code: error_message.ERROR_CODE_FOR_PROVIDER_BANK_DETAIL_ARE_NOT_VERIFIED
                                                                                        });
                                                                                    } else {
                                                                                        res.json({
                                                                                            success: true,
                                                                                            message: error_message.MESSAGE_CODE_FOR_PROVIDER_BANK_DETAIL_ADDED_SUCCESSFULLY
                                                                                        });
                                                                                    }
                                                                                });
                                                                            }
                                                                        }
                                                                    );
                                                                }
                                                            });
                                                        });
                                                    });
                                                });
                                            }

                                        });
                                    }
                                });
                            } else if(req.body.payment_gateway_type == PAYMENT_GATEWAY.paystack) {
                                console.log('paystack')
                                const https = require('https')
                                const options = {
                                  hostname: 'api.paystack.co',
                                  port: 443,
                                  path: '/bank/resolve?account_number='+req.body.account_number+'&bank_code='+req.body.bank_code+'&currency=NGN',
                                  method: 'GET',
                                  headers: {
                                    Authorization: 'Bearer '+setting_detail.paystack_secret_key
                                  }
                                }
                                console.log(options)
                                var request = https.request(options, res_data => {
                                  let data = ''     
                                  res_data.on('data', (chunk) => {
                                    data += chunk
                                  });
                                  res_data.on('end', () => {
                                      var bank_account_response = JSON.parse(data);
                                      console.log(bank_account_response)
                                      if(bank_account_response.status){
                                            provider.account_id = bank_account_response.data.bank_id;
                                            provider.bank_id = bank_account_response.data.bank_id;
                                            provider.account_number = bank_account_response.data.account_number;
                                            provider.bank_code = req.body.bank_code;
                                            provider.save();
                                            res.json({
                                                success: true,
                                                message: error_message.MESSAGE_CODE_FOR_PROVIDER_BANK_DETAIL_ADDED_SUCCESSFULLY
                                            });
                                      } else {
                                            res.json({
                                                success: false,
                                                stripe_error: bank_account_response.message,
                                                error_code: error_message.ERROR_CODE_FOR_ACCOUNT_DETAIL_NOT_VALID
                                            });
                                      }
                                  })
                                }).on('error', error => {
                                  console.error(error)
                                });
                                request.end()
                            } else {
                                provider.account_number = req.body.account_number;
                                provider.bank_code = req.body.bank_code;
                                provider.save();
                                res.json({
                                    success: true,
                                    message: error_message.MESSAGE_CODE_FOR_PROVIDER_BANK_DETAIL_ADDED_SUCCESSFULLY
                                });
                            }

                        }

                    } else {
                        console.log("------1010101------");
                        res.json({success: false, error_code: error_message.ERROR_CODE_PROVIDER_DETAIL_NOT_FOUND});

                    }
                });
        } else {
            console.log("------121212------");
            res.json({
                success: false,
                error_code: response.error_code,
                error_description: response.error_description
            });
        }
    });

};

exports.add_bank_detail_web = function (req, res) {

    utils.check_request_params(req.body, [{name: 'provider_id', type: 'string'},{name: 'account_holder_name', type: 'string'},{name: 'account_holder_type', type: 'string'},
        {name: 'password', type: 'string'},{name: 'routing_number', type: 'string'},
        {name: 'dob', type: 'string'},{name: 'personal_id_number', type: 'string'},
        {name: 'account_holder_type', type: 'string'},{name: 'account_number', type: 'string'}], function (response) {
        console.log(response)
        if (response.success) {
            Provider.findOne({_id: req.body.provider_id}).then((provider) => {
                if (provider) {
                    var crypto = require('crypto');
                    var password = req.body.password;
                    var hash = crypto.createHash('md5').update(password).digest('hex');
                    if (provider.password !== hash) {
                        res.json({success: false, error_code: error_message.ERROR_CODE_INVALID_PASSWORD});
                    } else {                        
                        Country.findOne({ "countryname": provider.country }).then((country_detail) => {

                            if (!country_detail) {
                                res.json({
                                    success: false,
                                    error_code: error_message.ERROR_CODE_FOR_PROBLEM_IN_ADD_BANK_DETAIL_PLEASE_RETRY
                                });
                            } else {
                                var pictureData_buffer1 = fs.readFileSync(req.files[0].path);
                                var pictureData_buffer2 = fs.readFileSync(req.files[1].path);
                                var pictureData_buffer3 = fs.readFileSync(req.files[2].path);
                                var stripe = require("stripe")(setting_detail.stripe_secret_key);
                                console.log(setting_detail.stripe_secret_key)
                                stripe.tokens.create({
                                    bank_account: {
                                        country: "US", // country_detail.alpha2
                                        currency: "USD",
                                        account_holder_name: req.body.account_holder_name,
                                        account_holder_type: req.body.account_holder_type,
                                        routing_number: req.body.routing_number,
                                        account_number: req.body.account_number
                                    }
                                }, function (err, token) {
                                    if (err) {
                                        var err = err;
                                        res.json({
                                            success: false,
                                            stripe_error: err.message,
                                            error_code: error_message.ERROR_CODE_FOR_ACCOUNT_DETAIL_NOT_VALID
                                        });
                                    } else {

                                        stripe.files.create({
                                            file: {
                                                data: pictureData_buffer1,
                                                name: "front.jpg",
                                                type: "application/octet-stream",
                                            },
                                            purpose: "identity_document",
                                        }, (err, fileUpload) => {

                                            stripe.files.create({
                                                file: {
                                                    data: pictureData_buffer2,
                                                    name: "back.jpg",
                                                    type: "application/octet-stream",
                                                },
                                                purpose: "identity_document",
                                            }, (err, fileUpload1) => {

                                                stripe.files.create({
                                                    file: {
                                                        data: pictureData_buffer3,
                                                        name: "back.jpg",
                                                        type: "application/octet-stream",
                                                    },
                                                    purpose: "identity_document",
                                                }, (err, fileUpload2) => {

                                                    var dob = req.body.dob;
                                                    dob = dob.split('-');

                                                    var phone_number = provider.country_phone_code + provider.phone;
                                                    console.log("phone_number: " + phone_number)

                                                    stripe.accounts.create({
                                                        type: 'custom',
                                                        country: "US", // country_detail.alpha2
                                                        email: provider.email,
                                                        requested_capabilities: [
                                                            'card_payments',
                                                            'transfers',
                                                        ],
                                                        business_type: 'individual',
                                                        business_profile: {
                                                            mcc: "4789",
                                                            name: provider.first_name + ' ' + provider.last_name,
                                                            product_description: "We sell transportation services to passengers, and we charge once the job is complete",
                                                            support_email: setting_detail.admin_email
                                                        },
                                                        individual: {
                                                            first_name: provider.first_name,
                                                            last_name: provider.last_name,
                                                            email: provider.email,
                                                            id_number: req.body.personal_id_number,
                                                            phone: phone_number,
                                                            gender: req.body.gender,
                                                            dob: {
                                                                day: dob[0],
                                                                month: dob[1],
                                                                year: dob[2]
                                                            },
                                                            address: {
                                                                city: provider.city,
                                                                country: "US",
                                                                state: req.body.state,
                                                                line1: req.body.address,
                                                                line2: req.body.address,
                                                                postal_code: req.body.postal_code
                                                            },
                                                            verification: {
                                                                document: {
                                                                    front: fileUpload.id,
                                                                    back: fileUpload1.id
                                                                },
                                                                additional_document: {
                                                                    front: fileUpload2.id
                                                                }
                                                            }
                                                        }
                                                    }, function (err, account) {
                                                        var err = err;
                                                        console.log(err)
                                                        if (err || !account) {
                                                            res.json({
                                                                success: false,
                                                                stripe_error: err.message,
                                                                error_code: error_message.ERROR_CODE_FOR_ACCOUNT_DETAIL_NOT_VALID
                                                            });
                                                        } else {
                                                            stripe.accounts.createExternalAccount(
                                                                account.id,
                                                                {
                                                                    external_account: token.id,
                                                                    default_for_currency: true
                                                                },
                                                                function (err, bank_account) {
                                                                    var err = err;
                                                                    if (err || !bank_account) {
                                                                        res.json({
                                                                            success: false,
                                                                            stripe_error: err.message,
                                                                            error_code: error_message.ERROR_CODE_FOR_PROBLEM_IN_ADD_BANK_DETAIL_PLEASE_RETRY
                                                                        });

                                                                    } else {
                                                                        provider.account_id = account.id;
                                                                        provider.bank_id = bank_account.id;
                                                                        provider.save();
                                                                        stripe.accounts.update(
                                                                            account.id,
                                                                            {
                                                                                tos_acceptance: {
                                                                                    date: Math.floor(Date.now() / 1000),
                                                                                    ip: req.connection.remoteAddress // Assumes you're not using a proxy
                                                                                }
                                                                            }, function (err, update_bank_account) {

                                                                                if (err || !update_bank_account) {
                                                                                    var err = err;
                                                                                    res.json({
                                                                                        success: false,
                                                                                        stripe_error: err.message,
                                                                                        error_code: error_message.ERROR_CODE_FOR_PROVIDER_BANK_DETAIL_ARE_NOT_VERIFIED
                                                                                    });
                                                                                } else {
                                                                                    message = "Bank Detail Added Successfully";
                                                                                    res.redirect('/provider_payments');
                                                                                }
                                                                            });
                                                                    }
                                                                }
                                                            );
                                                        }
                                                    });
                                                });
                                            });
                                        });
                                    }

                                });
                            }
                        });
                    }
                } else {
                    res.json({success: false, error_code: error_message.ERROR_CODE_PROVIDER_DETAIL_NOT_FOUND});
                
                }
            });
        } else {
            res.json({
                success: false,
                error_code: response.error_code,
                error_description: response.error_description
            });
        }
    });
};

exports.get_bank_detail = function (req, res) {

    utils.check_request_params(req.body, [], function (response) {
        if (response.success) {
            var type = Number(req.body.type);
                Table = Provider;
                switch (type) {
                    case Number(constant_json.PROVIDER_UNIQUE_NUMBER):
                    type = Number(constant_json.PROVIDER_UNIQUE_NUMBER);
                    Table = Provider;
                    break;
                    case Number(constant_json.PARTNER_UNIQUE_NUMBER):
                    type = Number(constant_json.PARTNER_UNIQUE_NUMBER);
                    Table = Partner;
                    break;
                }

                Table.findOne({_id: req.body.provider_id}).then((provider) => {

                if (provider) {
                    if (req.body.token != null && provider.token != req.body.token) {
                        res.json({success: false, error_code: error_message.ERROR_CODE_INVALID_TOKEN});
                    } else {
                        var country_query = {_id: provider.country_id}
                        Country.findOne(country_query, function(error, country_detail){
                            var payment_gateway_type = setting_detail.payment_gateway_type;
                            if(country_detail && country_detail.payment_gateways && country_detail.payment_gateways.length>0){
                                payment_gateway_type = country_detail.payment_gateways[0];
                            }

                            if(payment_gateway_type == PAYMENT_GATEWAY.stripe){
                                var stripe = require("stripe")(setting_detail.stripe_secret_key);
                                stripe.accounts.retrieveExternalAccount(
                                    provider.account_id,
                                    provider.bank_id,
                                    function (err, external_account) {
                                        var err = err;

                                        if (err || !external_account) {
                                            res.json({
                                                success: false,
                                                payment_gateway_type: payment_gateway_type,
                                                error_code: error_message.ERROR_CODE_FOR_PROBLEM_IN_GET_BANK_DETAIL,
                                                stripe_error: err.message
                                            });
                                        } else {

                                            res.json({
                                                success: true,
                                                message: success_messages.MESSAGE_CODE_FOR_PROVIDER_BANK_DETAIL_GET_SUCCESSFULLY,
                                                payment_gateway_type: payment_gateway_type,
                                                bankdetails: {
                                                    account_number: external_account.last4,
                                                    routing_number: external_account.routing_number,
                                                    account_holder_name: external_account.account_holder_name,
                                                    account_holder_type: external_account.account_holder_type,
                                                    account_id: provider.account_id
                                                }
                                            });
                                        }
                                    }
                                );
                            } else if(payment_gateway_type == PAYMENT_GATEWAY.paystack || payment_gateway_type == PAYMENT_GATEWAY.payu) {
                                if (!provider.account_number) {
                                    res.json({
                                        success: false,
                                        payment_gateway_type: payment_gateway_type,
                                        error_code: error_message.ERROR_CODE_FOR_PROBLEM_IN_GET_BANK_DETAIL
                                    });
                                } else {
                                    res.json({
                                        success: true,
                                        message: success_messages.MESSAGE_CODE_FOR_PROVIDER_BANK_DETAIL_GET_SUCCESSFULLY,
                                        payment_gateway_type: payment_gateway_type,
                                        bankdetails: {
                                            account_number: provider.account_number,
                                            routing_number: provider.bank_code,
                                            bank_id: provider.bank_id,
                                            account_id: provider.account_id
                                        }
                                    });
                                }
                            }
                        });
                    }
                } else {
                    res.json({success: false,payment_gateway_type: payment_gateway_type, error_code: error_message.ERROR_CODE_PROVIDER_DETAIL_NOT_FOUND});
                }
            });
        } else {
            res.json({
                success: false,
                payment_gateway_type: payment_gateway_type,
                error_code: response.error_code,
                error_description: response.error_description
            });
        }
    });
};

exports.delete_bank_detail = function (req, res) {

    utils.check_request_params(req.body, [], function (response) {
        if (response.success) {
            var social_id = req.body.social_unique_id;
            var encrypted_password = req.body.password;
            encrypted_password = utils.encryptPassword(encrypted_password);

            var type = Number(req.body.type);
            Table = Provider;
            switch (type) {
                case Number(constant_json.PROVIDER_UNIQUE_NUMBER):
                type = Number(constant_json.PROVIDER_UNIQUE_NUMBER);
                Table = Provider;
                break;
                case Number(constant_json.PARTNER_UNIQUE_NUMBER):
                type = Number(constant_json.PARTNER_UNIQUE_NUMBER);
                Table = Partner;
                break;
            }
                
            Table.findOne({_id: req.body.provider_id}).then((provider) => {

                if (provider) {
                    if (social_id == undefined || social_id == null || social_id == "") {
                        social_id = null;
                    }
                    if(!req.body.payment_gateway_type || req.body.payment_gateway_type == PAYMENT_GATEWAY.stripe){
                        var stripe = require("stripe")(setting_detail.stripe_secret_key);

                        stripe.accounts.del(provider.account_id, function (err, test) {
                            var err = err;
                            if (err || !test) {
                                res.json({
                                    success: false,
                                    stripe_error: err.message,
                                    error_code: error_message.ERROR_CODE_FOR_PROBLEM_IN_DELETED_BANK_DETAIL_PLEASE_RETRY
                                });
                            } else {
                                provider.account_id = "";
                                provider.bank_id = "";
                                provider.save().then(() => {
                                    res.json({
                                        success: true,
                                        message: success_messages.MESSAGE_CODE_FOR_PROVIDER_BANK_DETAIL_DELETED_SUCCESSFULLY
                                    });
                                }, (err) => {
                                    console.log(err);
                                    res.json({
                                        success: false,
                                        error_code: error_message.ERROR_CODE_SOMETHING_WENT_WRONG
                                    });
                                });
                            }

                        })
                    } else {
                        provider.account_number = '';
                        provider.account_id = '';
                        provider.bank_id = '';
                        provider.bank_code = '';
                        provider.save().then(() => {
                            res.json({
                                success: true,
                                message: success_messages.MESSAGE_CODE_FOR_PROVIDER_BANK_DETAIL_DELETED_SUCCESSFULLY
                            });
                        }, (err) => {
                            console.log(err);
                            res.json({
                                success: false,
                                error_code: error_message.ERROR_CODE_SOMETHING_WENT_WRONG
                            });
                        });
                    }
                } else {
                    res.json({success: false, error_code: error_message.ERROR_CODE_PROVIDER_DETAIL_NOT_FOUND});
                }
            });
        } else {
            res.json({
                success: false,
                error_code: response.error_code,
                error_description: response.error_description
            });
        }
    });
};