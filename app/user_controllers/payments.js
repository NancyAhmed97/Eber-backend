var User = require('mongoose').model('User');
var utils = require('../controllers/utils');
var moment = require('moment');
var Setting = require('mongoose').model('Settings');
var Trip = require('mongoose').model('Trip');
var Country = require('mongoose').model('Country');
var Card = require('mongoose').model('Card');
var Wallet_history = require('mongoose').model('Wallet_history');
var console = require('../controllers/console');
require('../controllers/constant');

exports.user_payments = function (req, res) {
    if (typeof req.session.user != "undefined")
    {
        Setting.findOne({}, function (err, setting_detail) {
            Wallet_history.find({user_id: req.session.user._id}).then((wallet_history) => { 
                User.findOne({_id: req.session.user._id}).then((user_detail) => { 
                    Country.findOne({countryphonecode: req.session.user.country_phone_code }, function(error, country_detail){
                        var payment_gateway_type = setting_detail.payment_gateway_type;
                        if(country_detail && country_detail.payment_gateways && country_detail.payment_gateways.length>0){
                            payment_gateway_type = country_detail.payment_gateways[0];
                        }
                        Card.find({user_id: req.session.user._id, is_default: 1, payment_gateway_type: payment_gateway_type}).then((card) => { 
                            Card.find({user_id: req.session.user._id, is_default: 0, payment_gateway_type: payment_gateway_type}).then((cards) => { 
                                var PAYMENT_TYPES = [{
                                    id: payment_gateway_type,
                                    name: '',
                                    is_add_card: IS_ADD_CARD[payment_gateway_type]
                                }];
                                res.render("payments", {
                                    Selected_card: card, Other_card: cards,
                                    user_id: req.session.user._id,
                                    token: req.session.user.token,
                                    payment_gateway_type: payment_gateway_type,
                                    PAYMENT_TYPES: PAYMENT_TYPES,
                                    user_detail: user_detail,wallet_history:wallet_history, stripe_public_key: setting_detail.stripe_publishable_key,
                                    timezone_for_display_date: setting_detail.timezone_for_display_date, 'moment': moment
                                });
                                delete message;
                            });
                        });
                    });
                });
            });
        });
    } else
    {
        res.redirect('/login');
    }

}

exports.check_card = function (req, res) {

    Card.find({user_id: req.body.user_id}).then((card) => { 

        if (card.length == 0) {
            res.json({success: false});
        } else {
            res.json({success: true});
        }
    });
}

exports.card_type = function (req, res) {
    if (typeof req.session.user != "undefined")
    {
        var Card_number = req.body.Card_number;
        Card_number = Card_number.replace(/ /g, '')
        var creditCardType = require('credit-card-type');
        var visaCards = creditCardType(Card_number);
        res.json(visaCards[0]);
    } else
    {
        res.redirect('/login');
    }
}

exports.add_card = function (req, res) {
    if (typeof req.session.user != "undefined")
    {
        console.log(req.body)
        User.findOne({_id: req.session.user._id}).then((detail) => { 

            Setting.findOne({}, function (err, setting_detail) {
                if (setting_detail)
                {
                    var type = req.body.type;
                    var stripe_secret_key = setting_detail.stripe_secret_key;
                    var stripe = require("stripe")(stripe_secret_key);
                    if(!detail.customer_id){
                        stripe.customers.create({
                            payment_method: req.body.payment_method,
                            email: detail.email,
                            name: detail.name,
                            phone: detail.phone
                        }, function (err, customer) {
                            detail.customer_id = customer.id;
                            detail.save();
                        });
                    } else {
                        stripe.paymentMethods.attach(req.body.payment_method,
                            {
                                customer: detail.customer_id,
                            }, function () {
                            
                        });
                    }

                    stripe.paymentMethods.retrieve(
                        req.body.payment_method,
                    (err, paymentMethod)=> {
                        console.log(paymentMethod)
                        Card.find({user_id: req.session.user._id, payment_gateway_type: PAYMENT_GATEWAY.stripe, $or :  [{type: type}, { type: {$exists: false} }]}).then((card_data) => { 

                            var card = new Card({
                                payment_id: req.body.payment_id,
                                user_id: req.session.user._id,
                                token: req.body.token,
                                last_four: paymentMethod.card.last4,
                                payment_gateway_type: PAYMENT_GATEWAY.stripe,
                                payment_method: req.body.payment_method,
                                card_type: paymentMethod.card.brand,
                                type: type,
                                is_default: constant_json.YES
                            });
                            if (card_data.length > 0) {
                                Card.findOneAndUpdate({user_id: req.session.user._id, payment_gateway_type: PAYMENT_GATEWAY.stripe,$or :  [{type: type}, { type: {$exists: false} }], is_default: constant_json.YES}, {is_default: constant_json.NO}).then(() => { 

                                });
                            }
                            card.save().then(() => { 
                                message = admin_messages.success_message_add_card;
                                res.redirect('/payments');
                            }, (err) => {
                                utils.error_response(err, res)
                            });

                        });
                    });
                }
            });
        });
    } else
    {
        res.redirect('/login');
    }
};

exports.delete_card = function (req, res) {

    if (typeof req.session.user != "undefined")
    {
        Trip.find({user_id: req.session.user._id, is_pending_payments: 1}).then((trips) => { 

            if (trips.length > 0) {
                res.redirect('/payments');
            } else {

                Card.findOneAndRemove({_id: req.body.card_id, user_id: req.session.user._id}).then((deleted_card) => { 
                        if (req.body.is_default == 1)
                        {
                            var payment_gateway_type = req.body.payment_gateway_type;
                            if(!payment_gateway_type){
                                payment_gateway_type = PAYMENT_GATEWAY.stripe;
                            }
                            console.log(payment_gateway_type)
                            var stripe_secret_key = setting_detail.stripe_secret_key;
                            var stripe = require("stripe")(stripe_secret_key);
                            stripe.paymentMethods.detach(deleted_card.payment_method, function () {
                                Card.findOneAndUpdate({ user_id: req.session.user._id, payment_gateway_type: payment_gateway_type }, { is_default: constant_json.YES }).then(() => {

                                })
                            })
                        }
                         res.json({success: true});
                    
                });
            }
        });
    } else
    {
        res.redirect('/login');
    }
};

exports.card_selection = function (req, res) {

    if (typeof req.session.user != "undefined")
    {
        var payment_gateway_type = req.body.payment_gateway_type;
        if(!payment_gateway_type){
            payment_gateway_type = PAYMENT_GATEWAY.stripe;
        }
        Card.findOneAndUpdate({_id: req.body.card_id, payment_gateway_type: payment_gateway_type, user_id: req.session.user._id}, {is_default: constant_json.YES}).then(() => { 

            Card.findOneAndUpdate({_id: {$nin: req.body.card_id}, user_id: req.session.user._id, payment_gateway_type: payment_gateway_type, is_default: constant_json.YES}, {is_default: constant_json.NO}).then(() => { 
                
                     res.json({success: true});
            });

        });
    } else
    {
        res.redirect('/login');
    }
};

exports.user_add_wallet_amount = function (req, res) {
   
    var type = Number(req.body.type);
   
    User.findOne({_id: req.session.user._id}).then((detail) => { 
            var payment_id = Number(constant_json.PAYMENT_BY_STRIPE);
            try {
                payment_id = req.body.payment_id;
            } catch (error) {
                console.error(err);
            }

            switch (payment_id) {
                case Number(constant_json.PAYMENT_BY_STRIPE):
                    break;
                case Number(constant_json.PAYMENT_BY_PAYPAL):
                    break;
            }

                var stripe_secret_key = setting_detail.stripe_secret_key;

                var stripe = require("stripe")(stripe_secret_key);
                stripe.paymentIntents.retrieve(req.body.payment_intent_id, function(error, intent){
                    console.log(intent.charges.data[0].payment_method_details.card.last4)
                    if(intent && intent.charges && intent.charges.data && intent.charges.data.length>0) {
                        var total_wallet_amount = utils.addWalletHistory(type, detail.unique_id, detail._id, detail.country_id, detail.wallet_currency_code, detail.wallet_currency_code,
                                1, (intent.charges.data[0].amount/100), detail.wallet, constant_json.ADD_WALLET_AMOUNT, constant_json.ADDED_BY_CARD, "Card : " +intent.charges.data[0].payment_method_details.card.last4)

                        detail.wallet = total_wallet_amount;
                        detail.save().then(() => { 
                            message = "Wallet Amount Added Sucessfully.";
                            res.redirect('/payments');
                        }, (err) => {
                            utils.error_response(err, res)
                        });

                    } else {
                        message = "Add wallet Failed";
                        res.redirect('/payments');
                    }                
                });
    });
};