var utils = require('../controllers/utils');
var Country = require('mongoose').model('Country');
var City = require('mongoose').model('City');
var array = [];
var console = require('../controllers/console');
var City_type = require('mongoose').model('city_type');
var Trip_Service = require('mongoose').model('trip_service');
var Type = require('mongoose').model('Type');

exports.country_type = function (req, res) {
    let country = require('../../country_list.json');
    var idx;
    Country.find({"currencysign" : "undefined"}).then((countries)=>{
        countries.forEach(element => {
            idx = country.findIndex(i=> i.name == element.countryname);
            if (idx != -1){
                element.currencysign = country[idx].sign;
                element.save();
            }
        });
    })

    if (typeof req.session.userid != 'undefined') {       
        let search = {};
        let search_value = req.body.search_value;
        let value = search_value;
        if (value) {
            value = value.replace(/^\s+|\s+$/g, '');
            value = value.replace(/ +(?= )/g, '');
            if (value != "") {
                search = { countryname: { $regex: new RegExp(value, 'i') } };
            }
        }
        Country.count(search).then((country_count) => {
            if (country_count == 0) {
                res.render('country_type', { country_data: array, search_value });
            } else {
                Country.find(search).then((country) => {
                    res.render('country_type', { country_data: country, search_value });
                    delete message;
                });
            }
        });
    } else {
        res.redirect('/admin');
    }
};


exports.getcountryphonelength = function (req, res) {
    var cond = {$or:[{"countryname" :req.body.countryname},{"countryphonecode" :req.body.countryphonecode}]}
    Country.findOne(cond).then((country_data) => {
        res.json({
            phone_number_length: setting_detail.maximum_phone_number_length,
            phone_number_min_length: setting_detail.minimum_phone_number_length,
            currencycode: country_data.currencycode, country_id: country_data._id
        })
    })
}



exports.add_country_detail = function (req, res) {
    var Country = require('mongoose').model('Country');
    if (typeof req.session.userid != "undefined") {

        req.body.isBusiness = req.body.isBusiness || 0;
        req.body.is_referral = req.body.is_referral || 0;
        req.body.is_provider_referral = req.body.is_provider_referral || 0;
        req.body.referral_bonus_to_user = req.body.referral_bonus_to_user || 0;
        req.body.bonus_to_userreferral = req.body.bonus_to_userreferral || 0;
        req.body.userreferral = req.body.userreferral || 0;
        req.body.referral_bonus_to_provider = req.body.referral_bonus_to_provider || 0;
        req.body.providerreferral = req.body.providerreferral || 0;
        req.body.is_auto_transfer = req.body.is_auto_transfer || 0;

        if(!req.body.payment_gateways){
            req.body.payment_gateways = [];
        } else {
            req.body.payment_gateways.forEach(function(payment_gateway){
                payment_gateway = Number(payment_gateway);
            })
        }

        var countryname = req.body.countryname.replace(/'/g, '');
        countryname = countryname.replace(/-/g, ' ');

        var add_country = new Country({
            countryname: countryname,
            flag_url: '',
            countrycode: req.body.countrycode,
            alpha2: req.body.alpha2,
            currency: req.body.currency,
            currencycode: req.body.currencycode,
            currencysign: req.body.currencysign,
            countrytimezone: req.body.countrytimezone,
            country_all_timezone: req.body.country_all_timezone.split(","),
            countryphonecode: req.body.countryphonecode,
            referral_bonus_to_user: req.body.referral_bonus_to_user,
            bonus_to_userreferral: req.body.bonus_to_userreferral,
            payment_gateways: req.body.payment_gateways,
            userreferral: req.body.userreferral,
            isBusiness: req.body.isBusiness,
            is_referral: req.body.is_referral,
            auto_transfer_day: req.body.auto_transfer_day,
            is_auto_transfer: req.body.is_auto_transfer,

            referral_bonus_to_provider: req.body.referral_bonus_to_provider,
            bonus_to_providerreferral: req.body.bonus_to_providerreferral,
            providerreferral: req.body.providerreferral,
            is_provider_referral: req.body.is_provider_referral


        });

        var file_new_name = (add_country.countryname).split(' ').join('_').toLowerCase() + '.gif';
        var file_upload_path = '/flags/' + file_new_name;
        add_country.flag_url = file_upload_path;

        add_country.save().then(() => {
            message = admin_messages.success_message_country_add;
            res.redirect('/country');
        }, (err) => {
            utils.error_response(err, res)
        });
    } else {
        res.redirect('/admin');
    }
};




exports.add_country_form = function (req, res) {
    let country = require('../../country_list.json');
    res.render('add_country_form', {country, PAYMENT_GATEWAY: PAYMENT_GATEWAY});
};

exports.edit_country_form = function (req, res) {
    if (typeof req.session.userid != 'undefined') {
        var id = req.body.id;
        Country.find({'_id': id}).then((country) => {
            res.render('add_country_form', {country_data: country, PAYMENT_GATEWAY: PAYMENT_GATEWAY});
        });
    } else {
        res.redirect('/admin');
    }
};

exports.update_country_detail = function (req, res) {
    console.log('update_country_detail')
    
    var id = req.body.id;

    if(!req.body.payment_gateways){
        req.body.payment_gateways = [];
    } else {
        req.body.payment_gateways.forEach(function(payment_gateway){
            payment_gateway = Number(payment_gateway);
        })
    }

    req.body.isBusiness = req.body.isBusiness || 0;
    req.body.is_referral = req.body.is_referral || 0;
    req.body.is_provider_referral = req.body.is_provider_referral || 0;
    req.body.referral_bonus_to_user = req.body.referral_bonus_to_user || 0;
    req.body.bonus_to_userreferral = req.body.bonus_to_userreferral || 0;
    req.body.userreferral = req.body.userreferral || 0;
    req.body.referral_bonus_to_provider = req.body.referral_bonus_to_provider || 0;
    req.body.providerreferral = req.body.providerreferral || 0;

    if (typeof req.session.userid != "undefined") {
        Country.findByIdAndUpdate(id, req.body).then(() => {
            message = admin_messages.success_message_country_update;
            res.redirect('/country');
        });
    } else {
        res.redirect('/admin');
    }
};

exports.check_country_available = function (req, res) {
    if (typeof req.session.userid != 'undefined') {
        
        var countryname = req.body.countryname.replace(/'/g, '');
        var query = {};
        query['countryname'] = countryname;
       
        Country.count(query).then((country_list) => {
            if (country_list != 0) {
                res.json(1);
            } else {
                res.json(0);
            }
        });
    } else {
        res.redirect('/admin');
    }
};

exports.fetch_country_detail = function (req, res) {
    let country_list = require('../../country_list.json');
    let countryname = req.body.countryname;
    let i = country_list.findIndex(i => i.name == countryname);
    let country = {}
    if (i != -1) {
        country = country_list[i]
    }
    res.json({ country });
};

exports.get_country_list = function (req, res) {
    let country_list = require('../../country_list.json');
    res.json(country_list);
};

exports.fetch_added_country_detail = function (req, res) {
    Country.findOne({"countryname": req.body.countryname}).then((country_detail) => {
        res.json({country_timezone:country_detail.country_all_timezone})
    });
}

exports.check_country_exists = function (request_data, response_data) {
    Country.find({countryphonecode: request_data.body.country_phone_code}).then(country => {
        console.log(country)
        if(country.length > 0){
            response_data.json({ success: true, country_id: country[0]._id, country_code: country.countrycode, message: 'country already exists' })
        } else {
            console.log(request_data_body)
            var request_data_body = request_data.body;
            request_data.countryname = request_data.body.countryname.replace(/'/g, '');
            request_data_body.countryphonecode = request_data.body.country_phone_code;
            var add_country = new Country(request_data_body);
            var file_new_name = (add_country.countryname).split(' ').join('_').toLowerCase() + '.gif';
            var file_upload_path = '/flags/' + file_new_name;
            add_country.flag_url = file_upload_path;
            add_country.save().then((country) => {
                response_data.json({
                    success: true,
                    country_id: country._id,
                    country_code: country.countrycode
                });
            }, (error) => {
                console.log(error);
                response_data.json({
                    success: false
                });
            });
        }
    })
}

exports.get_country_timezone = function (request_data, response_data) {
    Country.findById(request_data.body.countryid, function (error, country_data) {
        if(country_data){
            response_data.json({country_timezone: country_data.country_all_timezone, country_code: country_data.countrycode});
        }
    });
};

exports.check_city = function (request_data, response_data) {
    var request_data_body = request_data.body;
    var city = (request_data_body.cityname).trim()
    City.findOne({ countryid: request_data_body.countryid, cityname: city}).then((city) => {
        if (!city) {
            var request_data_body = request_data.body;
            var cityname = (request_data_body.cityname).trim();
            cityname = cityname.charAt(0).toUpperCase() + cityname.slice(1);
            request_data_body.cityname = cityname;
            request_data_body.cityRadius = 20
            request_data_body.cityLatLong = [request_data_body.city_lat, request_data_body.city_lng];

            var city = new City(request_data_body);
            city.save().then(() => {
                response_data.json({ success: true, city_id: city._id});
            }, (error) => {
                console.log(error)
                response_data.json({
                    success: false
                });
            });
        } else {
            response_data.json({ success: false, city_id: city._id});
        }
    }, () => {
        response_data.json({
            success: false
        });
    });
}

exports.check_service_type = function (request_data, response_data) {
    var request_data_body = request_data.body;

    City_type.findOne({cityid: request_data_body.cityid, typeid: request_data_body.typeid}).then((citytype_data) => {
        if(!citytype_data){

            Country.findOne({_id: request_data_body.countryid}).then((country_data) => {
                var citytype_data = new City_type({
                    countryid: request_data_body.countryid,
                    countryname: country_data.countryname,
                    cityname: request_data_body.cityname,
                    cityid: request_data_body.cityid,
                    typeid: request_data_body.typeid,
                    min_fare: 30,
                });

                citytype_data.save(() => {
                    Type.findOne({ _id: citytype_data.typeid }).then((type_detail) => {
                        var trip_service = new Trip_Service({
                            service_type_id: citytype_data._id,
                            city_id: citytype_data.cityid,
                            service_type_name: (type_detail.typename).trim(),
                            min_fare: citytype_data.min_fare,
                            typename: (type_detail.typename).trim()
                        });
                        trip_service.save().then(() => {
                            response_data.json({ success: true, service_type: citytype_data._id });
                        });
                    })
                })
            });
        } else {
            response_data.json({
                success: true, service_type: citytype_data._id
            });
        }
    });
}