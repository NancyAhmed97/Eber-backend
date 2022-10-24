var utils = require('../controllers/utils');
var Provider = require('mongoose').model('Provider');
var Country = require('mongoose').model('Country');
var Card = require('mongoose').model('Card');
var console = require('../controllers/console');
var utils = require('../controllers/utils');

exports.provider_payments = function (req, res) {
    if (typeof req.session.provider != "undefined")
    {   
        Country.findOne({countryname: req.session.provider.country}, function(error, country_detail){
            var payment_gateway_type = setting_detail.payment_gateway_type;
            console.log(country_detail)
            if(country_detail && country_detail.payment_gateways && country_detail.payment_gateways.length>0){
                payment_gateway_type = country_detail.payment_gateways[0];
            }
            Card.find({user_id: req.session.provider._id, is_default: 1, payment_gateway_type: payment_gateway_type}).then((card) => { 
                Provider.findOne({_id: req.session.provider._id}).then((provider_detail) => { 
                    Card.find({user_id: req.session.provider._id, is_default: 0, payment_gateway_type: payment_gateway_type}).then((cards) => { 
                        var PAYMENT_TYPES = [{
                            id: payment_gateway_type,
                            name: '',
                            is_add_card: IS_ADD_CARD[payment_gateway_type]
                        }];
                       
                        res.render("provider_payments", {PAYMENT_TYPES: PAYMENT_TYPES,
                                        payment_gateway_type: payment_gateway_type,Selected_card: card, provider_detail: provider_detail, provider_id: req.session.provider._id, token: req.session.provider.token, Other_card: cards, stripe_public_key: setting_detail.stripe_publishable_key});
                        delete message;
                    });
                });
            });
        });
    } else
    {
        res.redirect('/login');
    }

}

exports.add_card = function (req, res) {
    if (typeof req.session.provider != "undefined")
    {
        Provider.findOne({_id: req.session.provider._id}).then((user) => { 

            
        var stripe_secret_key = setting_detail.stripe_secret_key;
        var stripe = require("stripe")(stripe_secret_key);
            if(!user.customer_id){
                stripe.customers.create({
                    payment_method: req.body.payment_method,
                    email: user.email,
                    name: user.name,
                    phone: user.phone
                }, function (err, customer) {
                    user.customer_id = customer.id;
                    user.save();
                });
            } else {
                stripe.paymentMethods.attach(req.body.payment_method,
                    {
                        customer: user.customer_id,
                    }, function () {
                    
                });
            }

            stripe.paymentMethods.retrieve(
                req.body.payment_method,
            (err, paymentMethod)=> {
                Card.find({user_id: req.session.provider._id}).then((card_data) => {

                    var card = new Card({
                        payment_id: req.body.payment_id,
                        user_id: req.session.provider._id,
                        type: req.body.type,
                        token: req.body.token,
                        payment_gateway_type: PAYMENT_GATEWAY.stripe,
                        last_four: paymentMethod.card.last4,
                        payment_method: req.body.payment_method,
                        card_type: paymentMethod.card.brand,
                    });
                    if (card_data.length > 0) {
                        card.is_default = constant_json.NO;
                    } else {
                        card.is_default = constant_json.YES;
                    }
                    card.save().then(() => {
                        message = admin_messages.success_message_add_card;
                        res.redirect('/provider_payments');
                    });

                });
            });
            
        });
    } else
    {
        res.redirect('/login');
    }
};

exports.delete_card = function (req, res) {

    if (typeof req.session.provider != "undefined")
    {
        Card.findOneAndRemove({ _id: req.body.card_id, user_id: req.session.provider._id }).then((deleted_card) => {
            var stripe_secret_key = setting_detail.stripe_secret_key;
            var stripe = require("stripe")(stripe_secret_key);
            stripe.paymentMethods.detach(deleted_card.payment_method, function () {
                if (req.body.is_default == 1) {
                    Card.findOneAndUpdate({ user_id: req.session.provider._id }, { is_default: constant_json.YES }, function () {
                    })
                }
                res.json({ success: true });
            })

        });

    } else
    {
        res.redirect('/login');
    }
};

exports.card_selection = function (req, res) {
    if (typeof req.session.provider != "undefined")
    {
        var payment_gateway_type = req.body.payment_gateway_type;
        if(!payment_gateway_type){
            payment_gateway_type = PAYMENT_GATEWAY.stripe;
        }
        Card.findOneAndUpdate({_id: req.body.card_id, payment_gateway_type: payment_gateway_type, user_id: req.session.provider._id}, {is_default: constant_json.YES}).then(() => { 

            Card.findOneAndUpdate({_id: {$nin: req.body.card_id}, user_id: req.session.provider._id, payment_gateway_type: payment_gateway_type, is_default: constant_json.YES}, {is_default: constant_json.NO}).then(() => { 
                
                res.json({success: true});
            });

        });
    } else
    {
        res.redirect('/login');
    }
};

exports.provider_add_wallet_amount = function (req, res) {
 
    var type = Number(req.body.type);
    
    Provider.findOne({_id: req.session.provider._id}).then((detail) => { 
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

            if(intent && intent.charges && intent.charges.data && intent.charges.data.length>0) {
                var total_wallet_amount = utils.addWalletHistory(type, detail.unique_id, detail._id, detail.country_id, detail.wallet_currency_code, detail.wallet_currency_code,
                        1, (intent.charges.data[0].amount/100), detail.wallet, constant_json.ADD_WALLET_AMOUNT, constant_json.ADDED_BY_CARD, "Card : "+intent.charges.data[0].payment_method_details.card.last4)

                detail.wallet = total_wallet_amount;
                detail.save().then(() => { 
                    message = "Wallet Amount Added Sucessfully.";
                    res.redirect('/provider_payments');
                }, (err) => {
                    utils.error_response(err, res)
                });

            } else {
                message = "Add wallet Failed";
                res.redirect('/provider_payments');
            }                
        });
        //}
    });
};