var utils = require('./utils');
require('./constant');
var myAnalytics = require('./provider_analytics');
var allemails = require('./emails');
var Trip = require('mongoose').model('Trip');
var Trip_history = require('mongoose').model('Trip_history');
var Type = require('mongoose').model('Type');
var Trip_Service = require('mongoose').model('trip_service');
var User = require('mongoose').model('User');
var Provider = require('mongoose').model('Provider');
var TripLocation = require('mongoose').model('trip_location');
var Citytype = require('mongoose').model('city_type');
var Reviews = require('mongoose').model('Reviews');
var Promo_Code = require('mongoose').model('Promo_Code');
var User_promo_use = require('mongoose').model('User_promo_use');
var Card = require('mongoose').model('Card');
var EmergencyContactDetail = require('mongoose').model('emergency_contact_detail');
var pad = require('pad-left');
var Country = require('mongoose').model('Country');
var City = require('mongoose').model('City');
var moment = require('moment');
var geolib = require('geolib');
var Citytype = require('mongoose').model('city_type');
var CityZone = require('mongoose').model('CityZone');
var ZoneValue = require('mongoose').model('ZoneValue');
var Airport = require('mongoose').model('Airport');
var AirportCity = require('mongoose').model('Airport_to_City');
var CitytoCity = require('mongoose').model('City_to_City');
var Partner = require('mongoose').model('Partner');
var console = require('./console');
var utils = require('./utils');
var Corporate = require('mongoose').model('Corporate');
const https = require('https')
let country_list = require('../../country_list.json')
var cards = require('./card');

////  CREATE TRIP SERVICE //// ////////
exports.create_trip = function (user_data, trip_type, service_type_id, req_data, response) {
    if (req_data.car_rental_id == "") {
        delete req_data.car_rental_id;
    }
    var tripData = req_data;
    if (user_data.is_approved == 0) {
        response({success: false, error_code: error_message.ERROR_CODE_USER_NOT_APPROVED});
    } else {
        var user_id = tripData.user_id;
        if (tripData.trip_type !== undefined) {
            trip_type = tripData.trip_type;
        }
        
        if(trip_type == constant_json.TRIP_TYPE_CORPORATE){
            tripData.user_type_id = user_data.user_type_id;
            user_id = user_data.user_type_id;
        }

        // if ((!tripData.user_type_id && user_data.wallet < 0) || (trip_type == constant_json.TRIP_TYPE_CORPORATE && tripData.user_type_id && user_data.corporate_wallet_limit < 0)) {
        if ((user_data.wallet < 0) || (trip_type == constant_json.TRIP_TYPE_CORPORATE && tripData.user_type_id && user_data.corporate_wallet_limit < 0)) {
            response({success: false, trip_id: null, error_code: error_message.ERROR_CODE_YOUR_TRIP_PAYMENT_IS_PENDING});
        } else {
            if (tripData.trip_type !== undefined) {
                trip_type = tripData.trip_type;
            }
            Citytype.findOne({_id: service_type_id}).then((citytype) => {
                if (citytype) {
                    if (citytype.is_business == 1) {
                        var city_id = citytype.cityid;
                        var country_id = citytype.countryid;

                        Country.findOne({ _id: country_id }).then((country_data) => {
                            var payment_gateway_type = setting_detail.payment_gateway_type;
                            if(country_data && country_data.payment_gateways && country_data.payment_gateways.length>0){
                                payment_gateway_type = country_data.payment_gateways[0];
                            }

                            Card.find({user_id: user_id, payment_gateway_type: payment_gateway_type}).then((card) => {
                                if (tripData.payment_mode == Number(constant_json.PAYMENT_MODE_CARD) && Number(payment_gateway_type) !== PAYMENT_GATEWAY.payu) {
                                    if (card.length == 0) {
                                        return response({success: false, error_code: error_message.ERROR_CODE_ADD_CREDIT_CARD_FIRST});
                                    }
                                }
                                City.findOne({ _id: city_id }).then((city_detail) => {
                                    if (city_detail) {

                                        if (city_detail.isBusiness === 1) {

                                            var is_fixed_fare = false;
                                            var fixed_price = 0;
                                            var received_trip_from_gender = [];
                                            var provider_language = [];
                                            var accessibility = [];

                                            // Start 6 March //
                                            if (tripData.is_fixed_fare != undefined) {
                                                is_fixed_fare = tripData.is_fixed_fare;
                                                if (is_fixed_fare) {
                                                    fixed_price = tripData.fixed_price;
                                                }
                                            }

                                            if (tripData.received_trip_from_gender != undefined) {
                                                received_trip_from_gender = tripData.received_trip_from_gender;
                                            }

                                            if (tripData.provider_language != undefined) {
                                                provider_language = tripData.provider_language;
                                            }

                                            if (tripData.accessibility != undefined) {
                                                accessibility = tripData.accessibility;
                                            }
                                            // End 6 March //



                                            var dateNow = new Date();
                                            var schedule_start_time = null;
                                            var server_start_time_for_schedule = null;
                                            var is_schedule_trip = false;

                                            if (tripData.start_time) {
                                                is_schedule_trip = true;
                                                schedule_start_time = Number(tripData.start_time);
                                                var addMiliSec = dateNow.getTime() + +schedule_start_time;
                                                server_start_time_for_schedule = new Date(addMiliSec);
                                            }
                                            var trip = new Trip({
                                                user_last_name: user_data.last_name,
                                                user_first_name: user_data.first_name,
                                                service_type_id: citytype._id,
                                                type_id: citytype.typeid,
                                                user_id: user_data._id,
                                                is_trip_inside_zone_queue: tripData.is_trip_inside_zone_queue,
                                                token: tripData.token,
                                                current_provider: null,
                                                provider_id: null,
                                                confirmed_provider: null,
                                                trip_type: trip_type,
                                                car_rental_id: tripData.car_rental_id,
                                                is_surge_hours: tripData.is_surge_hours,
                                                surge_multiplier: tripData.surge_multiplier,
                                                hotel_name: tripData.hotel_name,
                                                room_number: tripData.room_number,
                                                floor: tripData.floor,
                                                source_address: tripData.source_address,
                                                destination_address: tripData.destination_address,
                                                sourceLocation: [tripData.latitude, tripData.longitude],
                                                payment_gateway_type: payment_gateway_type,
                                                destinationLocation: [],
                                                timezone: city_detail.timezone,
                                                payment_mode: tripData.payment_mode,
                                                user_create_time: tripData.user_create_time,
                                                payment_id: tripData.payment_id,
                                                unit: city_detail.unit,
                                                // Start 6 March //
                                                country_id: country_id,
                                                city_id: city_detail._id,
                                                fixed_price: fixed_price,
                                                is_fixed_fare: is_fixed_fare,
                                                is_provider_earning_set_in_wallet: false,
                                                received_trip_from_gender: received_trip_from_gender,
                                                provider_language: provider_language,
                                                accessibility: accessibility,
                                                // End 6 March //
                                                // start 9 jul //
                                                is_schedule_trip: is_schedule_trip,
                                                schedule_start_time: schedule_start_time,
                                                server_start_time_for_schedule: server_start_time_for_schedule,
                                                user_app_version: user_data.app_version,
                                                user_device_type: user_data.device_type,
                                                zone_queue_id: tripData.zone_queue_id
                                                // end 9 jul //
                                            });
                                            if (tripData.d_longitude && tripData.d_latitude) {
                                                trip.destinationLocation = [tripData.d_latitude, tripData.d_longitude];
                                            }
                                            if (tripData.user_type_id) {
                                                trip.user_type = tripData.user_type;
                                                trip.user_type_id = tripData.user_type_id;
                                            } else {
                                                trip.user_type = constant_json.USER_TYPE_NORMAL;
                                                trip.user_type_id = null;
                                            }

                                            if (tripData.device == undefined && trip_type != constant_json.TRIP_TYPE_PROVIDER) {
                                                trip.is_tip = setting_detail.is_tip;
                                            }
                                            trip.is_toll = setting_detail.is_toll;

                                            if (trip_type != constant_json.TRIP_TYPE_PROVIDER) {
                                                trip.is_otp_verification = setting_detail.is_otp_verification_start_trip;
                                                trip.confirmation_code = setting_detail.is_otp_verification_start_trip ? utils.generateOtp(6) : null;
                                            }
                                            

                                            if (country_data) {
                                                if (country_data.isBusiness === 1) {
                                                    var currency = "";
                                                    var currencycode = "";
                                                    if (country_data) {
                                                        currency = country_data.currencysign;
                                                        currencycode = country_data.currencycode;
                                                    }
                                                    trip.currency = currency;
                                                    trip.currencycode = currencycode;

                                                    user_data.total_request = user_data.total_request + 1;
                                                    user_data.save();

                                                    var service_type_id = tripData.service_type_id;
                                                    if (tripData.car_rental_id) {
                                                        service_type_id = tripData.car_rental_id;
                                                    }
                                                    // trip.save().then(() => {
                                                    Trip_Service.find({
                                                        service_type_id: service_type_id
                                                    }, async function (err, tripservice) {
                                                        if (tripservice && tripservice.length > 0) {
                                                            trip.trip_service_city_type_id = tripservice[0]._id;
                                                            if (is_fixed_fare) {
                                                                trip.provider_service_fees = Number((fixed_price * tripservice[0].provider_profit * 0.01).toFixed(3));
                                                            }
                                                        } else {
                                                            var mongoose = require('mongoose');
                                                            var ObjectId = mongoose.Types.ObjectId;
                                                            var trip_service = new Trip_Service({
                                                                _id: new ObjectId(),
                                                                service_type_id: citytype._id,
                                                                city_id: citytype.cityid,
                                                                service_type_name: citytype.typename,
                                                                min_fare: citytype.min_fare,
                                                                typename: citytype.typename
                                                            });

                                                            await trip_service.save()
                                                            trip.trip_service_city_type_id = trip_service._id;
                                                        }
                                                        trip.save().then(() => {

                                                            var triplocation = new TripLocation({
                                                                tripID: trip._id,
                                                                trip_unique_id: trip.unique_id,
                                                                providerStartTime: dateNow,
                                                                providerStartLocation: [0, 0],
                                                                startTripTime: dateNow,
                                                                startTripLocation: [0, 0],
                                                                endTripTime: dateNow,
                                                                endTripLocation: [0, 0],
                                                                providerStartToStartTripLocations: [],
                                                                startTripToEndTripLocations: [],
                                                                googlePathStartLocationToPickUpLocation: "",
                                                                googlePickUpLocationToDestinationLocation: ""
                                                            });
                                                            triplocation.save(function () {
                                                            }, () => {
                                                            });

                                                            response({
                                                                success: true,
                                                                trip: trip,
                                                                message: success_messages.MESSAGE_CODE_YOUR_FUTURE_TRIP_CREATE_SUCCESSFULLY
                                                            });
                                                        }, () => {
                                                            response({
                                                                success: false,
                                                                error_code: error_message.ERROR_CODE_SOMETHING_WENT_WRONG
                                                            });
                                                        });
                                                    }).sort({ _id: -1 }).limit(1);

                                                } else {
                                                    response({success: false, error_code: error_message.ERROR_CODE_OUR_BUSINESS_NOT_IN_YOUR_COUNTRY})
                                                }
                                            } else {
                                                response({success: false, error_code: error_message.ERROR_CODE_COUNTRY_NOT_FOUND})
                                            }
                                        } else {
                                            response({ success: false, error_code: error_message.ERROR_CODE_OUR_BUSINESS_NOT_IN_YOUR_CITY })
                                        }

                                    } else {
                                        response({ success: false, error_code: error_message.ERROR_CODE_CITY_TYPE_NOT_FOUND });

                                    }
                                }, (err) => {
                                    console.log(err);
                                    response({
                                        success: false,
                                        error_code: error_message.ERROR_CODE_SOMETHING_WENT_WRONG
                                    });
                                });
                            }, (err) => {
                                console.log(err);
                                response({
                                    success: false,
                                    error_code: error_message.ERROR_CODE_SOMETHING_WENT_WRONG
                                });
                            });
                        });
                    } else {
                        response({success: false, error_code: error_message.ERROR_CODE_OUR_BUSINESS_NOT_IN_YOUR_AREA})
                    }
                } else {
                    response({success: false, error_code: error_message.ERROR_CODE_CITY_TYPE_NOT_FOUND});
                }
            }, (err) => {
                console.log(err);
                response({
                    success: false,
                    error_code: error_message.ERROR_CODE_SOMETHING_WENT_WRONG
                });
            });
            
        }
    }

};


exports.nearest_provider_list = function (citytype, req_data, response) {

    var cityid  = null;
    if(citytype){
        cityid = citytype.cityid;
    }
    City.findOne({_id: cityid}).then((city_detail) => {

        var provider_query = {};
        if (city_detail) {
            var is_check_provider_wallet_amount_for_received_cash_request = city_detail.is_check_provider_wallet_amount_for_received_cash_request;
            var provider_min_wallet_amount_set_for_received_cash_request = city_detail.provider_min_wallet_amount_set_for_received_cash_request;
        
            if (is_check_provider_wallet_amount_for_received_cash_request && payment_mode == Number(constant_json.PAYMENT_MODE_CASH)) {
                wallet_query = {$gte: provider_min_wallet_amount_set_for_received_cash_request};
                provider_query["wallet"] = wallet_query;
            }
            // provider_query["service_type"] = citytype._id;
            provider_query["admintypeid"] = citytype.typeid;
        }

            var distance = setting_detail.default_Search_radious / constant_json.DEGREE_TO_KM;
            var received_trip_from_gender = [];
            var provider_language = [];
            var accessibility = [];

            var payment_mode = -1;
            if (req_data.payment_mode != undefined) {
                payment_mode = req_data.payment_mode;
            }

            provider_query["is_trip"] = [];
            provider_query["is_active"] = 1;
            provider_query["is_available"] = 1;
            provider_query["is_vehicle_document_uploaded"] = true;

            

            provider_query["providerLocation"] = {
                $near: [req_data.latitude, req_data.longitude],
                $maxDistance: distance
            };

            provider_admin_type_query = {
                $and: [{
                    "provider_type": Number(constant_json.PROVIDER_TYPE_NORMAL)
                }, {
                    "is_approved": 1
                }
                ]
            };
            provider_partner_type_query = {
                $and: [{
                    "provider_type": Number(constant_json.PROVIDER_TYPE_PARTNER)
                }, {
                    "is_approved": 1
                }, {
                    "is_partner_approved_by_admin": 1
                }
                ]
            };


            provider_type_query = {$or: [provider_admin_type_query, provider_partner_type_query]};

            accessibility = req_data.accessibility;
            received_trip_from_gender = req_data.received_trip_from_gender;
            provider_language = req_data.provider_language;

            var provider_query_and = [];
            provider_query_and.push(provider_type_query);

            if (accessibility != undefined && accessibility.length > 0) {
                accessibility_query = {
                    $and: [{
                        "vehicle_detail.accessibility": {
                            $exists: true,
                            $ne: [],
                            $all: accessibility
                        }
                    }]
                };
                provider_query_and.push(accessibility_query);
            }

            if (provider_language != undefined && provider_language.length > 0) {
                languages_exists_query = {$and: [{"languages": {$in: provider_language}}]};
                provider_query_and.push(languages_exists_query);
            }

            if (received_trip_from_gender != undefined && received_trip_from_gender.length > 0 && received_trip_from_gender.length != 2) {
                received_trip_from_gender_exists_query = {
                    $and: [{
                        "gender": {
                            $exists: true,
                            $all: received_trip_from_gender
                        }
                    }]
                }
                provider_query_and.push(received_trip_from_gender_exists_query);
            }


            provider_query["$and"] = provider_query_and;
            var query = Provider.find(provider_query);
            query.exec(function (err, providers) {
                if (!providers || providers.length == 0) {
                    response({
                        success: false,
                        error_code: error_message.ERROR_CODE_NO_PROVIDER_FOUND_SELECTED_SERVICE_TYPE_AROUND_YOU
                    });
                } else {
                    response({
                        success: true,
                        message: success_messages.MESSAGE_CODE_YOU_GET_NEARBY_DRIVER_LIST, providers: providers
                    });

                }

            });
        
    }, (err) => {
        console.log(err);
        res.json({
            success: false,
            error_code: error_message.ERROR_CODE_SOMETHING_WENT_WRONG
        });
    });

};


// FIND NEAREST PROVIDER
exports.nearest_provider = function (trip, provider_id, user_favourite_providers, response) {

    City.findOne({_id: trip.city_id}).then((city_detail) => {

        if (city_detail) {

            var city_timezone = city_detail.timezone;
            var is_check_provider_wallet_amount_for_received_cash_request = city_detail.is_check_provider_wallet_amount_for_received_cash_request;
            var provider_min_wallet_amount_set_for_received_cash_request = city_detail.provider_min_wallet_amount_set_for_received_cash_request;

            
            var distance = setting_detail.default_Search_radious / constant_json.DEGREE_TO_KM;

            var provider_query = {};
            var providers_id_that_rejected_trip = trip.providers_id_that_rejected_trip;

            provider_query["_id"] = {$nin: providers_id_that_rejected_trip};
            
            // provider_query["service_type"] = trip.service_type_id;
            provider_query["admintypeid"] = trip.type_id;

            provider_query["is_trip"] = [];
            provider_query["is_active"] = 1;
            provider_query["is_available"] = 1;

            if (is_check_provider_wallet_amount_for_received_cash_request && trip.payment_mode == Number(constant_json.PAYMENT_MODE_CASH)) {
                wallet_query = {$gte: provider_min_wallet_amount_set_for_received_cash_request};
                provider_query["wallet"] = wallet_query;
            }
            provider_query["is_vehicle_document_uploaded"] = true;

            provider_query["providerLocation"] = {$near: trip.sourceLocation, $maxDistance: distance};

            provider_admin_type_query = {
                $and: [{
                    "provider_type": Number(constant_json.PROVIDER_TYPE_NORMAL)
                }, {
                    "is_approved": 1
                }
                ]
            };
            provider_partner_type_query = {
                $and: [{
                    "provider_type": Number(constant_json.PROVIDER_TYPE_PARTNER)
                }, {
                    "is_approved": 1
                }, {
                    "is_partner_approved_by_admin": 1
                }
                ]
            };
            provider_type_query = {$or: [provider_admin_type_query, provider_partner_type_query]};
            languages_exists_query = {$and: [{"languages": {$in: trip.provider_language}}]};

            received_trip_from_gender_exists_query = {
                $and: [{
                    "gender": {
                        $exists: true,
                        $all: trip.received_trip_from_gender
                    }
                }]
            }

            var provider_query_and = [];
            provider_query_and.push(provider_type_query);
            if (provider_id != null) {
                provider_query_and.push({$and: [{"_id": {$eq: provider_id}}]});
            }

            var accessibility = trip.accessibility;
            if (accessibility != undefined && accessibility.length > 0) {
                accessibility_query = {
                    vehicle_detail: { $elemMatch: { is_selected: true, accessibility: { $exists: true, $ne: [], $all: accessibility } } } 
                }
                provider_query_and.push(accessibility_query);
            }

            if (trip.provider_language.length > 0) {
                provider_query_and.push(languages_exists_query);
            }
            if (trip.received_trip_from_gender.length > 0 && trip.received_trip_from_gender.length != 2) {
                provider_query_and.push(received_trip_from_gender_exists_query);
            }

            var limit = 1;
            if(setting_detail.find_nearest_driver_type == Number(constant_json.NEAREST_PROVIDER_TYPE_MULTIPLE)){
                limit = setting_detail.request_send_to_no_of_providers;
            }
            provider_query["$and"] = provider_query_and;

            var favourite_providers = [];
            if(user_favourite_providers){
                favourite_providers = user_favourite_providers;
            }
            
            var query;
            query = Provider.find(provider_query)

            query.exec(async function (err, providers) {

                delete trip.provider_to_user_estimated_distance;
                delete trip.provider_to_user_estimated_time;

                if (providers.length == 0) {

                    trip.current_provider = null;
                    trip.provider_first_name = "";
                    trip.provider_last_name = "";
                    trip.providers_id_that_rejected_trip = [];

                    if (trip.trip_type.toString() !== constant_json.TRIP_TYPE_DISPATCHER.toString()) {
                        trip.provider_trip_end_time = new Date();
                        var complete_date_in_city_timezone = utils.get_date_now_at_city(new Date(), trip.timezone);
                        var complete_date_tag = moment(moment(complete_date_in_city_timezone).startOf('day')).format(constant_json.DATE_FORMAT_MMM_D_YYYY);
                        trip.complete_date_in_city_timezone = complete_date_in_city_timezone;
                        trip.complete_date_tag = complete_date_tag;
                        trip.is_trip_cancelled = 1;
                        trip.is_provider_accepted = 0;
                    } else {
                        trip.is_provider_accepted = 3;
                    }
                    if(trip.is_trip_cancelled == 0){
                        trip.save().then(()=>{
                            utils.update_request_status_socket(trip._id);
                            User.findOne({_id: trip.user_id}).then((user) => {
                                if (user) {
                                    user.current_trip_id = null;
                                    user.save();
                                    if (setting_detail.sms_notification) {
                                        // utils.sendOtherSMS(phoneWithCode, 5, "");
                                    }
                                    utils.sendPushNotification(constant_json.USER_UNIQUE_NUMBER, user.device_type, user.device_token, push_messages.PUSH_CODE_FOR_NO_PROVIDER_FOUND, constant_json.PUSH_NOTIFICATION_SOUND_FILE_IN_IOS);
                                }
                            }, (err) => {
                                console.log(err);
                            });
        
                            response({
                                success: false,
                                error_code: error_message.ERROR_CODE_NO_PROVIDER_FOUND_AROUND_YOU
                            });
                        });
                    } else {
                        trip.save().then(() => {
                            Trip.findOneAndRemove({ _id: trip._id }).then((deleted_trip) => {
                                if (deleted_trip) {
                                    var trip_history_data = new Trip_history(JSON.parse(JSON.stringify(deleted_trip)));
                                    trip_history_data.save(function () {
                                        utils.update_request_status_socket(trip._id);
                                        User.findOne({ _id: trip.user_id }).then((user) => {
                                            if (user) {
                                                user.current_trip_id = null;
                                                user.save();
                                                if (setting_detail.sms_notification) {
                                                    // utils.sendOtherSMS(phoneWithCode, 5, "");
                                                }
                                                utils.sendPushNotification(constant_json.USER_UNIQUE_NUMBER, user.device_type, user.device_token, push_messages.PUSH_CODE_FOR_NO_PROVIDER_FOUND, constant_json.PUSH_NOTIFICATION_SOUND_FILE_IN_IOS);
                                            }
                                        }, (err) => {
                                            console.log(err);
                                        });

                                        response({
                                            success: false,
                                            error_code: error_message.ERROR_CODE_NO_PROVIDER_FOUND_AROUND_YOU
                                        });
                                    });
                                } else {
                                    utils.update_request_status_socket(trip._id);
                                    User.findOne({ _id: trip.user_id }).then((user) => {
                                        if (user) {
                                            user.current_trip_id = null;
                                            user.save();
                                            if (setting_detail.sms_notification) {
                                                // utils.sendOtherSMS(phoneWithCode, 5, "");
                                            }
                                            utils.sendPushNotification(constant_json.USER_UNIQUE_NUMBER, user.device_type, user.device_token, push_messages.PUSH_CODE_FOR_NO_PROVIDER_FOUND, constant_json.PUSH_NOTIFICATION_SOUND_FILE_IN_IOS);
                                        }
                                    }, (err) => {
                                        console.log(err);
                                    });

                                    response({
                                        success: false,
                                        error_code: error_message.ERROR_CODE_NO_PROVIDER_FOUND_AROUND_YOU
                                    });
                                }
                            });
                        })
                    }
                } else {
                    function onlyUnique(value, index, self) { 
                        return self.indexOf(value) === index;
                    }
                    favourite_providers = favourite_providers.filter( onlyUnique )

                    var final_providers = [];

                    if (trip.is_trip_inside_zone_queue && trip.zone_queue_id) {
                        let zone = await CityZone.findById(trip.zone_queue_id);
                        let zone_providers = zone.total_provider_in_zone_queue;

                        zone_providers.forEach(function (zone_provider) {
                            var zone_provider_index = providers.findIndex((x) => (x._id).toString() == zone_provider.toString())
                            if (zone_provider_index !== -1) {
                                if (Number(final_providers.length) < Number(limit)) {
                                    final_providers.push(providers[zone_provider_index]);
                                }
                            }
                        })

                        favourite_providers.forEach(function (fav_provider) {
                            var dup_index = final_providers.findIndex((x) => (x._id).toString() == fav_provider.toString());
                            if (dup_index == -1) {
                                var fav_index = providers.findIndex((x) => (x._id).toString() == fav_provider.toString())
                                if (fav_index !== -1) {
                                    if (Number(final_providers.length) < Number(limit)) {
                                        final_providers.push(providers[fav_index]);
                                    }
                                }
                            }
                        });

                        providers.forEach(function (provider_detail) {
                            var fav_index = final_providers.findIndex((x) => (x._id).toString() == provider_detail._id.toString())
                            if (fav_index == -1) {
                                if (Number(final_providers.length) < Number(limit)) {
                                    final_providers.push(provider_detail)
                                }
                            }
                        })
                    } else {
                        favourite_providers.forEach(function (fav_provider) {
                            var fav_index = providers.findIndex((x) => (x._id).toString() == fav_provider.toString())
                            if (fav_index !== -1) {
                                if (Number(final_providers.length) < Number(limit)) {
                                    final_providers.push(providers[fav_index]);
                                }
                            }
                        });

                        providers.forEach(function (provider_detail) {
                            var fav_index = final_providers.findIndex((x) => (x._id).toString() == provider_detail._id.toString())
                            if (fav_index == -1) {
                                if (Number(final_providers.length) < Number(limit)) {
                                    final_providers.push(provider_detail)
                                }
                            }
                        })
                    }

                    if(setting_detail.find_nearest_driver_type == Number(constant_json.NEAREST_PROVIDER_TYPE_SINGLE)){
                        trip.current_provider = final_providers[0]._id;
                        trip.provider_type = final_providers[0].provider_type;
                        trip.provider_type_id = final_providers[0].provider_type_id;
                    }
                    trip.no_of_time_send_request++;
                    trip.unit = city_detail.unit;
                    trip.is_provider_accepted = 0;

                    var current_providers = [];

                    if(setting_detail.find_nearest_driver_type == Number(constant_json.NEAREST_PROVIDER_TYPE_SINGLE)){
                        current_providers.push(final_providers[0]._id);
                    } else {
                        final_providers.forEach(function(provider){
                            current_providers.push(provider._id);
                        });
                    }
                    
                    trip.find_nearest_provider_time = new Date();
                    trip.current_providers = current_providers;
                    trip.save().then(() => {
                        
                        var trips = [];
                        trips.push(trip._id);
                        Provider.updateMany({ _id: { $in: current_providers }, is_trip: [] }, { is_available: 0, is_trip: trips, $inc: { total_request: 1 } }, { multi: true }, async function (error, providers_list) {
                            if (providers_list.modifiedCount != 0) {
                                var final_providers = await Provider.find({ is_trip: trip._id });
                                if (final_providers && final_providers.length != 0) {
                                    if (setting_detail.find_nearest_driver_type == Number(constant_json.NEAREST_PROVIDER_TYPE_SINGLE)) {
                                        utils.send_socket_request(trip._id, final_providers[0]._id);
                                        myAnalytics.insert_daily_provider_analytics(city_timezone, final_providers[0]._id, TRIP_STATUS.WAITING_FOR_PROVIDER, null);
                                        utils.sendPushNotification(constant_json.PROVIDER_UNIQUE_NUMBER, final_providers[0].device_type, final_providers[0].device_token, push_messages.PUSH_CODE_FOR_NEW_TRIP, constant_json.PUSH_NOTIFICATION_SOUND_FILE_IN_IOS);

                                    } else {
                                        final_providers.forEach(function (provider) {
                                            utils.send_socket_request(trip._id, provider._id);
                                            myAnalytics.insert_daily_provider_analytics(city_timezone, provider._id, TRIP_STATUS.WAITING_FOR_PROVIDER, null);
                                            utils.sendPushNotification(constant_json.PROVIDER_UNIQUE_NUMBER, provider.device_type, provider.device_token, push_messages.PUSH_CODE_FOR_NEW_TRIP, constant_json.PUSH_NOTIFICATION_SOUND_FILE_IN_IOS);
                                        })
                                    }
                                }
                            }
                        });
                        
                        response({
                            success: true,
                            message: success_messages.MESSAGE_CODE_YOUR_TRIP_CREATED_SUCCESSFULLY,
                            trip_id: trip._id
                        });
                    }, (err) => {
                        console.log(err)
                        trip.current_providers = [];
                        trip.provider_first_name = "";
                        trip.provider_last_name = "";

                        if (trip.trip_type.toString() !== constant_json.TRIP_TYPE_DISPATCHER.toString() && !trip.is_schedule_trip) {
                            trip.provider_trip_end_time = new Date();
                            trip.is_trip_cancelled = 1;
                            trip.is_provider_accepted = 0;
                            var complete_date_in_city_timezone = utils.get_date_now_at_city(new Date(), trip.timezone);
                            var complete_date_tag = moment(moment(complete_date_in_city_timezone).startOf('day')).format(constant_json.DATE_FORMAT_MMM_D_YYYY);
                            trip.complete_date_in_city_timezone = complete_date_in_city_timezone;
                            trip.complete_date_tag = complete_date_tag;
                        } else {
                            trip.is_provider_accepted = 3;
                        }
                        if (trip.is_trip_cancelled == 0) {
                            trip.save();
                            response({ success: false, error_code: error_message.ERROR_CODE_CREATE_TRIP_FAILED });
                        } else {
                            trip.save().then(() => {
                                Trip.findOneAndRemove({ _id: trip._id }).then((deleted_trip) => {
                                    if (deleted_trip) {
                                        var trip_history_data = new Trip_history(JSON.parse(JSON.stringify(deleted_trip)));
                                        trip_history_data.save(function () {
                                            response({ success: false, error_code: error_message.ERROR_CODE_CREATE_TRIP_FAILED });
                                        });
                                    } else {
                                        response({ success: false, error_code: error_message.ERROR_CODE_CREATE_TRIP_FAILED });
                                    }
                                });
                            });
                        }

                    });
                }
            });
        } else {
            response({success: false, error_code: error_message.ERROR_CODE_CITY_TYPE_NOT_FOUND});
        }
    }, (err) => {
        console.log(err);
        response({
            success: false,
            error_code: error_message.ERROR_CODE_SOMETHING_WENT_WRONG
        });
    });

};

////  START USER CREATE TRIP SERVICE //// ////////
exports.create = function (req, res) {
    utils.check_request_params(req.body, [{name: 'user_id', type: 'string'}, {name: 'service_type_id', type: 'string'},
        {name: 'timezone', type: 'string'},], function (response) {
        if (response.success) {
            User.findOne({_id: req.body.user_id}).then((user_data) => {
                if (!user_data) {
                    res.json({success: false, error_code: error_message.ERROR_CODE_USER_DETAIL_NOT_FOUND});
                } else {

                    if(user_data.current_trip_id){
                        res.json({success: false, error_code: error_message.ERROR_CODE_TRIP_ALREADY_RUNNING});
                    } else {
                        var provider_id = null
                        if (req.body.provider_id) {
                            provider_id = req.body.provider_id;
                        }
                        Citytype.findOne({_id: req.body.service_type_id}).then((citytype) => {
                            exports.check_trip_inside_zone_queue(citytype.cityid, req.body.latitude, req.body.longitude, function(data){
                                req.body.is_trip_inside_zone_queue = data.is_trip_inside_zone_queue;
                                req.body.zone_queue_id = data.zone_queue_id;
                                var trip_type = constant_json.TRIP_TYPE_NORMAL;
                                exports.create_trip(user_data, trip_type, req.body.service_type_id, req.body, function (response) {

                                    if (response.success) {
                                        var trip = response.trip;

                                        if(req.body.promo_id){
                                            Promo_Code.findOne({_id: req.body.promo_id}, function(error, promocode){
                                                if(promocode){
                                                    trip.promo_id = promocode._id;
                                                    trip.save();
                                                    promocode.user_used_promo = promocode.user_used_promo + 1;
                                                    promocode.save();
                                                    var userpromouse = new User_promo_use({
                                                        promo_id: promocode._id,
                                                        promocode: promocode.promocode,
                                                        user_id: req.body.user_id,
                                                        promo_type: promocode.code_type,
                                                        promo_value: promocode.code_value,
                                                        trip_id: trip._id,
                                                        user_used_amount: 0
                                                    });
                                                    userpromouse.save();
                                                }
                                            })
                                            
                                        }
                                        if (trip.trip_type == constant_json.TRIP_TYPE_HOTEL) { 
                                            message = admin_messages.success_create_trip;
                                            req.flash('response_code', admin_messages.success_create_trip);
                                        }
                                        if (trip.is_schedule_trip) {
                                            res.json({
                                                success: true,
                                                trip: trip,
                                                message: success_messages.MESSAGE_CODE_YOUR_FUTURE_TRIP_CREATE_SUCCESSFULLY
                                            });
                                        } else {
                                            exports.nearest_provider(trip, provider_id, user_data.favourite_providers, function (nearest_provider_response) {
                                                if (nearest_provider_response.success) {
                                                    user_data.current_trip_id = trip._id;
                                                    user_data.save();
                                                    res.json(nearest_provider_response);
                                                } else {
                                                    console.log('no provider')
                                                    res.json({
                                                        success: false,
                                                        error_code: error_message.ERROR_CODE_CREATE_TRIP_FAILED
                                                    });
                                                }
                                            });
                                        }
                                    } else {
                                        res.json(response);
                                    }
                                });
                            });
                        });
                    }
                }
            }, (err) => {
                console.log(err);
                res.json({
                    success: false,
                    error_code: error_message.ERROR_CODE_SOMETHING_WENT_WRONG
                });
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

exports.provider_create = function (req, res) {

    utils.check_request_params(req.body, [{name: 'provider_id', type: 'string'}, {
        name: 'phone',
        type: 'string'
    }, {name: 'service_type_id', type: 'string'}], function (response) {
        if (response.success) {
            Provider.findOne({ _id: req.body.provider_id }).then((provider_detail) => {
                if (provider_detail) {

                    Trip.aggregate([{
                        $match: {
                            provider_id: { $eq: req.body.provider_id },
                            $and: [
                                { is_trip_cancelled: { $eq: 0 } },
                                { is_trip_completed: { $eq: 0 } },
                                { is_trip_end: { $eq: 0 } }
                            ]
                        }
                    }]).then(trips => {

                        if (trips.length === 0) {

                            User.findOne({ phone: req.body.phone }).then((user_data) => {

                                if (user_data) {
                                    if (user_data.current_trip_id === null) {
                                        exports.create_trip(user_data, constant_json.TRIP_TYPE_PROVIDER, req.body.service_type_id, req.body, function (response) {
                                            if (response.success) {
                                                var trip = response.trip;
                                                if (trip.is_schedule_trip) {
                                                    res.json({
                                                        success: true,
                                                        trip: trip,
                                                        message: success_messages.MESSAGE_CODE_YOUR_FUTURE_TRIP_CREATE_SUCCESSFULLY
                                                    });
                                                } else {
                                                    var now_date = new Date()
                                                    trip.is_toll = setting_detail.is_toll;
                                                    trip.provider_first_name = provider_detail.first_name;
                                                    trip.provider_last_name = provider_detail.last_name;
                                                    trip.provider_type = provider_detail.provider_type;
                                                    trip.provider_type_id = provider_detail.provider_type_id;
                                                    trip.current_provider = provider_detail._id;
                                                    trip.current_providers = [provider_detail._id];
                                                    trip.confirmed_provider = provider_detail._id;
                                                    trip.provider_id = provider_detail._id;
                                                    trip.is_provider_accepted = 1;
                                                    trip.is_provider_status = 4;
                                                    trip.accepted_time = now_date;
                                                    trip.provider_arrived_time = now_date;
                                                    trip.provider_trip_start_time = now_date;

                                                    var unique_id = pad(trip.unique_id, 7, '0');
                                                    var invoice_number = constant_json.INVOICE_APP_NAME_CODE + " " + constant_json.INVOICE_PROVIDER_TRIP_EARNING_CODE + " " + (moment(new Date())).format(constant_json.DATE_FORMAT_MMDDYYYY) + " " + unique_id;
                                                    trip.invoice_number = invoice_number;

                                                    var is_favourite_provider = false;
                                                    if (user_data) {
                                                        var index = user_data.favourite_providers.findIndex((x) => (x).toString() == (provider_detail._id).toString());
                                                        if (index !== -1) {
                                                            is_favourite_provider = true;
                                                        }
                                                    }
                                                    trip.is_favourite_provider = is_favourite_provider;

                                                    trip.save().then(() => {
                                                        var trips = [];
                                                        trips.push(trip._id);
                                                        provider_detail.is_trip = trips;

                                                        provider_detail.total_request = provider_detail.total_request + 1;
                                                        myAnalytics.insert_daily_provider_analytics(trip.timezone, provider_detail._id, TRIP_STATUS.INITIATE_TRIP, null);


                                                        provider_detail.accepted_request = provider_detail.accepted_request + 1;
                                                        // myAnalytics.insert_daily_provider_analytics(trip.timezone, provider_detail._id, TRIP_STATUS.PROVIDER_ACCEPTED, null);


                                                        provider_detail.save(function (err) {
                                                            console.log(err);

                                                        });

                                                        utils.sendPushNotification(constant_json.USER_UNIQUE_NUMBER, user_data.device_type, user_data.device_token, push_messages.PUSH_CODE_FOR_PROVIDER_INITATE_TRIP, constant_json.PUSH_NOTIFICATION_SOUND_FILE_IN_IOS);
                                                        
                                                        user_data.current_trip_id = trip._id;
                                                        user_data.save();
                                                        res.json({
                                                            success: true,
                                                            message: success_messages.MESSAGE_CODE_YOUR_TRIP_CREATED_SUCCESSFULLY,
                                                            trip_id: trip._id,
                                                            user: user_data
                                                        });

                                                    });
                                                }
                                            } else {
                                                res.json(response);
                                            }
                                        });
                                    } else {
                                        res.json({
                                            success: false,
                                            error_code: error_message.ERROR_CODE_TRIP_ALREADY_RUNNING
                                        });

                                    }

                                } else {
                                    var country_phone_code = req.body.country_phone_code;
                                    Country.findOne({ countryphonecode: country_phone_code }).then((country) => {

                                        var first_name = req.body.first_name;
                                        var last_name = req.body.last_name;
                                        var encrypt_password = require('crypto').createHash('md5').update(req.body.phone).digest('hex');
                                        var referral_code = (utils.tokenGenerator(8)).toUpperCase();
                                        var wallet_currency_code = "";
                                        var countryname = "";
                                        if (country) {
                                            wallet_currency_code = country.currencycode;
                                            countryname = country.countryname;
                                        } else {
                                            let i = country_list.findIndex(i => i.code == country_phone_code);
                                            if (i != -1) {
                                                wallet_currency_code = country_list[0].currency_code;
                                            } else {
                                                wallet_currency_code = "";
                                            }
                                        }
                                        var user = new User({
                                            first_name: first_name,
                                            last_name: last_name,
                                            email: ((req.body.email).trim()).toLowerCase(),
                                            password: encrypt_password,
                                            user_type: Number(constant_json.USER_TYPE_PROVIDER),
                                            user_type_id: provider_detail._id,
                                            country_phone_code: req.body.country_phone_code,
                                            phone: req.body.phone,
                                            token: utils.tokenGenerator(32),
                                            country: countryname,
                                            referral_code: referral_code,
                                            wallet_currency_code: wallet_currency_code,
                                        });

                                        user.save().then(() => {

                                            if (setting_detail.email_notification) {
                                                allemails.sendUserRegisterEmail(req, user);
                                            }
                                            exports.create_trip(user, constant_json.TRIP_TYPE_PROVIDER, req.body.service_type_id, req.body, function (response) {
                                                if (response.success) {
                                                    var trip = response.trip;
                                                    user.current_trip_id = trip._id;
                                                    user.save();
                                                    if (trip.is_schedule_trip) {
                                                        res.json({
                                                            success: true,
                                                            trip: trip,
                                                            message: success_messages.MESSAGE_CODE_YOUR_FUTURE_TRIP_CREATE_SUCCESSFULLY
                                                        });
                                                    } else {
                                                        trip.is_toll = setting_detail.is_toll;
                                                        trip.provider_first_name = provider_detail.first_name;
                                                        trip.provider_last_name = provider_detail.last_name;
                                                        trip.provider_type = provider_detail.provider_type;
                                                        trip.provider_type_id = provider_detail.provider_type_id;
                                                        trip.current_provider = provider_detail._id;
                                                        trip.current_providers = [provider_detail._id];
                                                        trip.confirmed_provider = provider_detail._id;
                                                        trip.provider_id = provider_detail._id;
                                                        trip.is_provider_accepted = 1;
                                                        trip.is_provider_status = 4;
                                                        var now_date = new Date();
                                                        trip.accepted_time = now_date;
                                                        trip.provider_arrived_time = now_date;
                                                        trip.provider_trip_start_time = now_date;

                                                        var unique_id = pad(trip.unique_id, 7, '0');
                                                        var invoice_number = constant_json.INVOICE_APP_NAME_CODE + " " + constant_json.INVOICE_PROVIDER_TRIP_EARNING_CODE + " " + (moment(new Date())).format(constant_json.DATE_FORMAT_MMDDYYYY) + " " + unique_id;
                                                        trip.invoice_number = invoice_number;

                                                        trip.save().then(() => {
                                                            var trips = [];
                                                            trips.push(trip._id);
                                                            provider_detail.is_trip = trips;

                                                            provider_detail.save(function () {

                                                            });

                                                            user.current_trip_id = trip._id;
                                                            user.save();
                                                            res.json({
                                                                success: true,
                                                                message: success_messages.MESSAGE_CODE_YOUR_TRIP_CREATED_SUCCESSFULLY,
                                                                trip_id: trip._id,
                                                                user: user
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
                                                    res.json(response);
                                                }
                                            });
                                        }, (err) => {
                                            console.log(err);
                                            res.json({
                                                success: false,
                                                error_code: error_message.ERROR_CODE_SOMETHING_WENT_WRONG
                                            });
                                        });
                                    });
                                }
                            }, (err) => {
                                console.log(err);
                                res.json({
                                    success: false,
                                    error_code: error_message.ERROR_CODE_SOMETHING_WENT_WRONG
                                });
                            });
                        } else {
                            res.json({ success: false, error_code: error_message.ERROR_CODE_PROVIDER_DETAIL_NOT_FOUND });
                        }
                    }, (err) => {
                        console.log(err);
                        res.json({
                            success: false,
                            error_code: error_message.ERROR_CODE_SOMETHING_WENT_WRONG
                        });
                    });
                } else {
                    res.json({ success: false, error_code: error_message.ERROR_CODE_PROVIDER_DETAIL_NOT_FOUND });
                }
            }, (err) => {
                console.log(err);
                res.json({
                    success: false,
                    error_code: error_message.ERROR_CODE_SOMETHING_WENT_WRONG
                });
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

exports.send_request_from_dispatcher = function (req, res) {

    utils.check_request_params(req.body, [{name: 'trip_id', type: 'string'}], function (response) {
        if (response.success) {
            var provider_id = null
            if (req.body.provider_id) {
                provider_id = req.body.provider_id;
            }
            Trip.findOne({_id: req.body.trip_id}).then((tripData) => {
                exports.nearest_provider(tripData, provider_id, [], function (nearest_provider_response) {
                    res.json(nearest_provider_response);
                });
            }, (err) => {
                console.log(err);
                res.json({
                    success: false,
                    error_code: error_message.ERROR_CODE_SOMETHING_WENT_WRONG
                });
            });
        } else {
            res.json({
                success: false,
                error_code: response.error_code,
                error_description: response.error_description
            });
        }
    });
}

exports.get_near_by_provider = function (req, res) {

    utils.check_request_params(req.body, [{name: 'user_id', type: 'string'}], function (response) {
        if (response.success) {
            User.findOne({_id: req.body.user_id}).then((user) => {
                if (user) {
                    if (req.body.token != null && user.token != req.body.token) {
                        res.json({success: false, error_code: error_message.ERROR_CODE_INVALID_TOKEN});
                    } else {
                        Citytype.findOne({_id: req.body.service_type_id}).then((citytype) => {
                            if (citytype) {
                                exports.nearest_provider_list(citytype, req.body, function (nearest_provider_response) {
                                    res.json(nearest_provider_response);
                                });
                            } else {
                                exports.nearest_provider_list(null, req.body, function (nearest_provider_response) {
                                    res.json(nearest_provider_response);
                                });
                            }
                        }, (err) => {
                            console.log(err);
                            res.json({
                                success: false,
                                error_code: error_message.ERROR_CODE_SOMETHING_WENT_WRONG
                            });
                        });
                    }
                }
            }, (err) => {
                console.log(err);
                res.json({
                    success: false,
                    error_code: error_message.ERROR_CODE_SOMETHING_WENT_WRONG
                });
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

exports.provider_get_trips = function (req, res) {
    utils.check_request_params(req.body, [{name: 'provider_id', type: 'string'}], function (response) {
        if (response.success) {
            Provider.findOne({_id: req.body.provider_id}).then((provider) => {
                if (provider) {
                    if (req.body.token != null && provider.token != req.body.token) {
                        res.json({success: false, error_code: error_message.ERROR_CODE_INVALID_TOKEN});
                    } else {

                        if (provider && provider.is_trip.length > 0) {
                            Trip.findOne({_id: provider.is_trip[0]}).then((trip) => {
                                Trip_history.findOne({_id: provider.is_trip[0]}).then((trip_history) => {
                                    if(!trip){
                                        trip = trip_history;
                                    }

                                    if (trip && trip.is_trip_cancelled == 0 && trip.is_provider_invoice_show == 0 && trip.is_trip_completed == 0) {


                                        var start_time = trip.updated_at;
                                        var end_time = new Date();
                                        var res_sec = utils.getTimeDifferenceInSecond(end_time, start_time);

                                        var provider_timeout = setting_detail.provider_timeout;
                                        var time_left_to_responds_trip = provider_timeout - res_sec;
                                        var trip_id = trip._id;
                                        var source_address = trip.source_address;
                                        var destination_address = trip.destination_address;
                                        var sourceLocation = trip.sourceLocation;
                                        var destinationLocation = trip.destinationLocation;
                                        var is_trip_end = trip.is_trip_end;
                                        User.findOne({_id: trip.user_id}).then((user) => {
                                            res.json({
                                                success: true,
                                                message: success_messages.MESSAGE_CODE_YOU_GET_TRIP,
                                                trip_id: trip_id,
                                                source_address: source_address,
                                                destination_address: destination_address,
                                                sourceLocation: sourceLocation,
                                                destinationLocation: destinationLocation,
                                                is_trip_end: is_trip_end,
                                                time_left_to_responds_trip: time_left_to_responds_trip,
                                                user: user
                                            });

                                        });
                                    } else {

                                        provider.is_trip = [];
                                        provider.is_available = 1;
                                        provider.save();
                                        res.json({success: false, error_code: error_message.ERROR_CODE_NO_TRIP_FOUND});
                                    }
                                });
                            }, (err) => {
                                console.log(err);
                                res.json({
                                    success: false,
                                    error_code: error_message.ERROR_CODE_SOMETHING_WENT_WRONG
                                });
                            });
                        } else {
                            res.json({success: false, error_code: error_message.ERROR_CODE_NO_TRIP_FOUND});
                        }
                    }
                } else {
                    res.json({success: false, error_code: error_message.ERROR_CODE_PROVIDER_DETAIL_NOT_FOUND});

                }
            }, (err) => {
                console.log(err);
                res.json({
                    success: false,
                    error_code: error_message.ERROR_CODE_SOMETHING_WENT_WRONG
                });
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


////////////USER  GET TRIPSTATUS//////////// ///
exports.user_get_trip_status = function (req, res) {

    utils.check_request_params(req.body, [{name: 'user_id', type: 'string'}], function (response) {
        if (response.success) {
            User.findOne({_id: req.body.user_id}).then((user) => {
                if (user) {

                    if (user.is_approved == 0) {
                        res.json({success: false, error_code: error_message.ERROR_CODE_USER_NOT_APPROVED})
                    } else {
                        if (user.token != req.body.token) {
                            res.json({success: false, error_code: error_message.ERROR_CODE_INVALID_TOKEN});
                        } else {
                            var json;


                            if (req.body.type == "web") {
                                json = {user_id: req.body.user_id, _id: user.current_trip_id}
                            } else {

                                json = {user_id: req.body.user_id, _id: user.current_trip_id};
                            }
                            Trip.findOne(json).then((trip) => {
                                Trip_history.findOne(json).then((trip_history) => {
                                    if(!trip){
                                        trip = trip_history;
                                    }

                                    if (trip) {
                                        if (trip.is_trip_cancelled_by_provider == 1) {
                                            res.json({success: false, error_code: error_message.ERROR_CODE_TRIP_CANCELLED_BY_PROVIDER});
                                        } else {
                                            Trip_Service.findOne({_id: trip.trip_service_city_type_id}).then((tripservice) => {
                                                if (tripservice) {

                                                    Citytype.findById(trip.service_type_id).then((citytype_detail) => {
                                                        Type.findById(citytype_detail.typeid).then(async (type_detail) => {
                                                            var cancellation_fee = tripservice.cancellation_fee;
                                                            
                                                            if (trip.car_rental_id) {
                                                                var rental_main_citytype = await Citytype.findOne({ car_rental_ids: trip.car_rental_id });
                                                                if (rental_main_citytype) {
                                                                    cancellation_fee = rental_main_citytype.cancellation_fee
                                                                }
                                                            }

                                                            var waiting_time_start_after_minute = tripservice.waiting_time_start_after_minute;
                                                            var price_for_waiting_time = tripservice.price_for_waiting_time;
                                                            var total_wait_time = 0;
                                                            var provider_arrived_time = trip.provider_arrived_time;
                                                            if (provider_arrived_time != null) {
                                                                var end_time = new Date();
                                                                total_wait_time = utils.getTimeDifferenceInSecond(end_time, provider_arrived_time);
                                                                total_wait_time = total_wait_time - waiting_time_start_after_minute * 60;
                                                            }

                                                            City.findOne({_id: citytype_detail.cityid}).then((cityDetail) => {
                                                                if (!cityDetail) {
                                                                    res.json({
                                                                        success: false,
                                                                        error_code: error_message.ERROR_CODE_NO_CITY_LIST_FOUND
                                                                    });

                                                                } else {
                                                                    User_promo_use.findOne({trip_id: trip._id}).then((user_promo_use) => {
                                                                        var isPromoUsed = 0;
                                                                        var PAYMENT_TYPES = utils.PAYMENT_TYPES();
                                                                        if (user_promo_use) {
                                                                            isPromoUsed = 1;
                                                                        }
                                                                        if(trip.is_provider_status == 6){
                                                                            var now = new Date();
                                                                            var minutes = utils.getTimeDifferenceInMinute(now, trip.provider_trip_start_time);
                                                                            trip.total_time = minutes;
                                                                            trip.save();
                                                                        }

                                                                        var now = new Date();
                                                                        var provider_trip_end_time = trip.provider_trip_end_time;
                                                                        var diff = utils.getTimeDifferenceInSecond(now, provider_trip_end_time);
                                                                        // console.log("diff: "+diff)
                                                                        var tip_timeout = 30;
                                                                        if(diff < 0){
                                                                            diff = 0;
                                                                        }
                                                                        var time_left_for_tip = tip_timeout - diff;
                                                                        res.json({
                                                                            success: true,
                                                                            map_pin_image_url: type_detail.map_pin_image_url,
                                                                            message: success_messages.MESSAGE_CODE_YOU_GET_TRIP_STATUS,
                                                                            city_detail: cityDetail,
                                                                            trip: trip,
                                                                            time_left_for_tip: time_left_for_tip,
                                                                            waiting_time_start_after_minute: waiting_time_start_after_minute,
                                                                            price_for_waiting_time: price_for_waiting_time,
                                                                            total_wait_time: total_wait_time,
                                                                            isPromoUsed: isPromoUsed,
                                                                            cancellation_fee: cancellation_fee,
                                                                            payment_gateway: PAYMENT_TYPES
                                                                        });
                                                                    });
                                                                }
                                                            });
                                                        })
                                                    })
                                                } else {
                                                    res.json({success: false, error_code: error_message.ERROR_CODE_NO_TRIP});

                                                }
                                            });
                                        }
                                    } else {

                                        res.json({success: false, error_code: error_message.ERROR_CODE_NO_TRIP});
                                    }
                                });
                            }, (err) => {
                                console.log(err);
                                res.json({
                                    success: false,
                                    error_code: error_message.ERROR_CODE_SOMETHING_WENT_WRONG
                                });
                            });
                        }
                    }
                } else {
                    res.json({success: false, error_code: error_message.ERROR_CODE_USER_DETAIL_NOT_FOUND});

                }
            }, (err) => {
                console.log(err);
                res.json({
                    success: false,
                    error_code: error_message.ERROR_CODE_SOMETHING_WENT_WRONG
                });
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

/////////////RESPOND TRIP///////////////////



exports.responds_trip = function (req, res) {
    utils.check_request_params(req.body, [{name: 'provider_id', type: 'string'}], function (response) {
        if (response.success) {
            Provider.findOne({_id: req.body.provider_id}).then((provider) => {
                if (provider) {
                    if (req.body.token != null && provider.token != req.body.token) {
                        res.json({success: false, error_code: error_message.ERROR_CODE_INVALID_TOKEN});
                    } else {
                        Trip.findOne({_id: req.body.trip_id, current_providers: provider._id}).then((trip) => {

                            if (trip) {
                                var is_provider_accepted = req.body.is_provider_accepted;

                                if (trip.is_trip_cancelled == 1) {
                                    if (is_provider_accepted == 1) {
                                        res.json({
                                            success: false,
                                            error_code: error_message.ERROR_CODE_TRIP_IS_ALREADY_CANCELLED
                                        });
                                    } else {
                                        res.json({
                                            success: true,
                                            message: success_messages.MESSAGE_CODE_FOR_PROVIDER_YOU_REJECTED_TRIP
                                        });
                                    }

                                } else if (trip.is_provider_accepted == 1) {
                                    if (is_provider_accepted == 1) {
                                        res.json({success: false, error_code: error_message.ERROR_CODE_TRIP_IS_ALREADY_ACCEPTED});
                                    } else {
                                        res.json({
                                            success: true,
                                            message: success_messages.MESSAGE_CODE_FOR_PROVIDER_YOU_REJECTED_TRIP
                                        });
                                    }

                                } else {
                                    if (is_provider_accepted == 1) {
                                        exports.accept_trip(provider, trip, function (accepte_trip_response) {
                                            res.json(accepte_trip_response);
                                        });
                                    } else {
                                        exports.reject_trip(trip, req.body.provider_id, req.body.is_request_timeout, function (reject_trip_response) {
                                            res.json(reject_trip_response);
                                        });
                                    }
                                }
                            } else {
                                res.json({success: false, error_code: error_message.ERROR_CODE_TRIP_IS_ALREADY_ACCEPTED});
                            }
                        }, () => {
                            res.json({
                                success: false,
                                error_code: error_message.ERROR_CODE_SOMETHING_WENT_WRONG
                            });
                        });
                    }
                } else {
                    res.json({success: false, error_code: error_message.ERROR_CODE_PROVIDER_DETAIL_NOT_FOUND});
                }
            }, (err) => {
                console.log(err);
                res.json({
                    success: false,
                    error_code: error_message.ERROR_CODE_SOMETHING_WENT_WRONG
                });
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

exports.accept_trip = function (provider, trip, response) {

    var now = new Date();
    trip.current_provider = provider._id;
    trip.provider_type = provider.provider_type;
    trip.provider_type_id = provider.provider_type_id;
    trip.confirmed_provider = provider._id;
    trip.provider_app_version = provider.app_version;
    trip.provider_device_type = provider.device_type;
    trip.is_provider_accepted = 1;
    trip.is_provider_status = 1;
    trip.accepted_time = now;
    trip.is_schedule_trip = false;
    trip.provider_first_name = provider.first_name;
    trip.provider_last_name = provider.last_name;

    var unique_id = pad(trip.unique_id, 7, '0');
    var invoice_number = constant_json.INVOICE_APP_NAME_CODE + " " + constant_json.INVOICE_PROVIDER_TRIP_EARNING_CODE + " " + (moment(now)).format(constant_json.DATE_FORMAT_MMDDYYYY) + " " + unique_id;
    trip.invoice_number = invoice_number;
    trip.provider_id = provider._id;
    trip.providerLocation = provider.providerLocation;
    trip.bearing = provider.bearing;

    var current_providers = trip.current_providers;
    trip.current_providers = [];

    User.findOne({_id: trip.user_id}, function(error, user_detail){

        var is_favourite_provider = false;
        if(user_detail){
            var index = user_detail.favourite_providers.findIndex((x)=> (x).toString() == (provider._id).toString());
            if(index !== -1){
                is_favourite_provider = true;
            }
        }
        trip.is_favourite_provider = is_favourite_provider

        trip.save().then(() => {

            

            Provider.find({ $and: [{_id: {$in: current_providers}}, {_id: {$ne: trip.confirmed_provider}}]}).then((providers_list)=>{
               providers_list.forEach(function(provider){
                    utils.sendPushNotification(constant_json.PROVIDER_UNIQUE_NUMBER, provider.device_type, provider.device_token, push_messages.PUSH_CODE_FOR_TRIP_ACCEPTED_BY_ANOTHER_PROVIDER, constant_json.PUSH_NOTIFICATION_SOUND_FILE_IN_IOS);
                });
            });

            Provider.updateMany({ $and: [{_id: {$in: current_providers}}, {_id: {$ne: trip.confirmed_provider}}]}, {is_available: 1, is_trip: []}, {multi: true}).then(()=>{
               
            });
            User.findOne({_id: trip.user_id}).then((user) => {
                if (user) {
                    if (setting_detail.sms_notification) {
                        utils.sendOtherSMS(user.country_phone_code + user.phone, 5, "");
                    }
                    utils.sendPushNotification(constant_json.USER_UNIQUE_NUMBER, user.device_type, user.device_token, push_messages.PUSH_CODE_FOR_ACCEPT_TRIP, constant_json.PUSH_NOTIFICATION_SOUND_FILE_IN_IOS);
                }
            });

            myAnalytics.insert_daily_provider_analytics(trip.timezone, provider._id, TRIP_STATUS.PROVIDER_ACCEPTED, null);

            provider.accepted_request = provider.accepted_request + 1;
            provider.is_available = 0;
            // provider.is_trip.push(trip._id);
            provider.save();
            utils.update_request_status_socket(trip._id);
            response({
                success: true,
                message: success_messages.MESSAGE_CODE_FOR_PROVIDER_YOU_ACCEPTED_TRIP_SUCCESSFULLY,
                is_provider_accepted: trip.is_provider_accepted
            });

        }, () => {
            response({
                success: false,
                error_code: error_message.ERROR_CODE_SOMETHING_WENT_WRONG
            });
        });
    });

};

exports.reject_trip = function (trip, provider_id, is_request_timeout, response) {

    var now = new Date();
    var unique_id = pad(trip.unique_id, 7, '0');
    var invoice_number = constant_json.INVOICE_APP_NAME_CODE + " " + constant_json.INVOICE_PROVIDER_TRIP_EARNING_CODE + " " + (moment(now)).format(constant_json.DATE_FORMAT_MMDDYYYY) + " " + unique_id;
    trip.invoice_number = invoice_number;
    if(!is_request_timeout || setting_detail.find_nearest_driver_type == Number(constant_json.NEAREST_PROVIDER_TYPE_SINGLE)){
        var providers_id_that_rejected_trip = trip.providers_id_that_rejected_trip;
        providers_id_that_rejected_trip.push(provider_id);
        trip.providers_id_that_rejected_trip = providers_id_that_rejected_trip;
    }

    Provider.findOne({_id: provider_id}).then((current_provider) => {
        if (current_provider) {
            var zone_queue_id = current_provider.zone_queue_id;
            if(current_provider.zone_queue_id){
                Citytype.findOne({ _id: trip.service_type_id }, async function () {
                    current_provider = await utils.remove_from_zone_queue_new(current_provider);
                    current_provider = await utils.add_in_zone_queue_new(zone_queue_id,current_provider);
                    if (is_request_timeout) {
                        myAnalytics.insert_daily_provider_analytics(trip.timezone, current_provider._id, TRIP_STATUS.NOT_ANSWERED, null);
                    } else {
                        myAnalytics.insert_daily_provider_analytics(trip.timezone, current_provider._id, TRIP_STATUS.PROVIDER_REJECTED, null);
                    }
                    current_provider.rejected_request = current_provider.rejected_request + 1;
                    current_provider.is_available = 1;
                    current_provider.is_trip = [];
                    current_provider.save();

                    Provider.updateMany({zone_queue_id: current_provider.zone_queue_id, _id:{$ne: current_provider._id}} ,{'$inc': {zone_queue_no: -1}}, {multi: true}, function(error){
                        console.log(error)
                    });

                });
            } else {
                if (is_request_timeout) {
                    myAnalytics.insert_daily_provider_analytics(trip.timezone, current_provider._id, TRIP_STATUS.NOT_ANSWERED, null);
                } else {
                    myAnalytics.insert_daily_provider_analytics(trip.timezone, current_provider._id, TRIP_STATUS.PROVIDER_REJECTED, null);
                }
                current_provider.rejected_request = current_provider.rejected_request + 1;
                current_provider.is_available = 1;
                current_provider.is_trip = [];
                current_provider.save();
            }
            
        }
    });

    if(setting_detail.find_nearest_driver_type == Number(constant_json.NEAREST_PROVIDER_TYPE_MULTIPLE)){
        var index = trip.current_providers.findIndex((x)=>(x).toString()==(provider_id).toString());
        if(index !== -1){
            trip.current_providers.splice(index, 1);
            trip.markModified('current_providers');
        }
    }

    trip.save().then(() => {
        utils.update_request_status_socket(trip._id);
        response({
            success: true,
            message: success_messages.MESSAGE_CODE_FOR_PROVIDER_YOU_REJECTED_TRIP,
            is_provider_accepted: trip.is_provider_accepted
        });
        if(setting_detail.find_nearest_driver_type == Number(constant_json.NEAREST_PROVIDER_TYPE_SINGLE)){
            exports.nearest_provider(trip, null, [], function () {
                
            });
        }
    }, (err) => {
        console.log(err);
        response({
            success: false,
            error_code: error_message.ERROR_CODE_SOMETHING_WENT_WRONG
        });
    });

};

exports.trip_cancel_by_user = function (req, res) {
    console.log('trip_cancel_by_user')
    utils.check_request_params(req.body, [{name: 'user_id', type: 'string'}, {
        name: 'trip_id',
        type: 'string'
    }], function (response) {
        if (response.success) {
            User.findOne({_id: req.body.user_id}).then((user) => {
                if (user) {
                    if (req.body.type != constant_json.TRIP_TYPE_DISPATCHER && req.body.type != constant_json.TRIP_TYPE_CORPORATE && user.token != req.body.token) {

                        if (req.body.type !== "Admin") {
                            res.json({success: false, error_code: error_message.ERROR_CODE_INVALID_TOKEN});
                        }
                    } else {

                        Trip.findOne({_id: req.body.trip_id}).then(async (trip) => {
                            if(!trip){
                                trip = await Trip_history.findOne({ _id: req.body.trip_id });
                            }

                            var cancel_reason = req.body.cancel_reason;
                            if (trip) {
                                if (trip.is_trip_completed == 0 && trip.is_trip_end == 0) {

                                    if (trip.is_trip_cancelled == 0 && trip.is_trip_cancelled_by_user == 0 && trip.is_trip_cancelled_by_provider == 0) {

                                        var trip_type = trip.trip_type;
                                        var providerID = trip.confirmed_provider;
                                        

                                        var status = trip.is_provider_status;

                                        var complete_date_in_city_timezone = utils.get_date_now_at_city(new Date(), trip.timezone);
                                        var complete_date_tag = moment(moment(complete_date_in_city_timezone).startOf('day')).format(constant_json.DATE_FORMAT_MMM_D_YYYY);
                                        trip.complete_date_in_city_timezone = complete_date_in_city_timezone;
                                        trip.complete_date_tag = complete_date_tag;
                                        trip.payment_status = PAYMENT_STATUS.COMPLETED;
                                        trip.provider_trip_end_time = new Date();
                                        Provider.updateMany({_id: {$in: trip.current_providers}}, {is_available: 1, is_trip: []}, {multi: true}, function(){

                                        });
                                        if (status == 0) {
                                            trip.cancel_reason = cancel_reason;
                                            trip.is_trip_cancelled = 1;
                                            trip.is_trip_cancelled_by_user = 1;

                                            trip.save().then(() => {
                                                user.current_trip_id = null;
                                                user.cancelled_request = user.cancelled_request + 1;
                                                user.save();
                                                utils.update_request_status_socket(trip._id);
                                                Trip.findOneAndRemove({_id: req.body.trip_id}).then((deleted_trip) => {
                                                    if (deleted_trip) {
                                                        var trip_history_data = new Trip_history(JSON.parse(JSON.stringify(deleted_trip)));
                                                        trip_history_data.save(function () {
                                                            res.json({
                                                                success: true,
                                                                message: success_messages.MESSAGE_CODE_YOUR_TRIP_CANCELLED_SUCCESSFULLY
                                                            });
                                                        });
                                                    } else {
                                                        res.json({
                                                            success: true,
                                                            message: success_messages.MESSAGE_CODE_YOUR_TRIP_CANCELLED_SUCCESSFULLY
                                                        });
                                                    }
                                                });
                                                
                                            }, () => {
                                                res.json({
                                                    success: false,
                                                    error_code: error_message.ERROR_CODE_SOMETHING_WENT_WRONG
                                                });
                                            });

                                        } else {

                                            trip.cancel_reason = cancel_reason;
                                            trip.is_trip_cancelled = 1;
                                            if (trip.is_provider_accepted == constant_json.YES) {
                                                trip.is_trip_cancelled_by_user = 1;
                                            }

                                            trip.save().then(() => {
                                                Provider.findOne({_id: providerID}).then((provider) => {
                                                    if (provider) {
                                                        utils.sendPushNotification(constant_json.PROVIDER_UNIQUE_NUMBER, provider.device_type, provider.device_token, push_messages.PUSH_CODE_FOR_TRIP_CANCELLED_BY_USER, constant_json.PUSH_NOTIFICATION_SOUND_FILE_IN_IOS);
                                                        provider.is_available = 1;
                                                        provider.is_trip = [];
                                                        provider.save();
                                                    }
                                                });

                                                User_promo_use.findOne({trip_id: trip._id}).then((userpromouse) => {
                                                    if (userpromouse) {
                                                        userpromouse.remove();
                                                    }

                                                });
                                                Promo_Code.findOne({_id: trip.promo_id}).then((promo_code) => {
                                                    if (promo_code) {
                                                        promo_code.user_used_promo = promo_code.user_used_promo - 1;
                                                        promo_code.save();
                                                    }
                                                });

                                                if (status == 4) {
                                                    Trip_Service.findOne({_id: trip.trip_service_city_type_id}).then(async (tripservice_data) => {

                                                        var cancellationCharges = tripservice_data.cancellation_fee;
                                                        if (trip.car_rental_id) {
                                                            var rental_main_citytype = await Citytype.findOne({ car_rental_ids: trip.car_rental_id });
                                                            if (rental_main_citytype) {
                                                                cancellationCharges = rental_main_citytype.cancellation_fee
                                                            }
                                                        }
                                                        var provider_profit = tripservice_data.provider_profit;
                                                        trip.is_cancellation_fee = 1;
                                                        var current_rate = 1;

                                                        if (cancellationCharges > 0) {

                                                            var admin_currencycode = setting_detail.adminCurrencyCode;
                                                            var admin_currency = setting_detail.adminCurrency;

                                                            var countryCurrencyCode = trip.currencycode;

                                                            City.findOne({_id: trip.city_id}).then((city) => {

                                                                var is_provider_earning_set_in_wallet_on_other_payment = false;
                                                                var is_provider_earning_set_in_wallet_on_cash_payment = false;
                                                                if (city) {
                                                                    is_provider_earning_set_in_wallet_on_other_payment = city.is_provider_earning_set_in_wallet_on_other_payment;
                                                                    is_provider_earning_set_in_wallet_on_cash_payment = city.is_provider_earning_set_in_wallet_on_cash_payment;
                                                                }

                                                                utils.getCurrencyConvertRate(1, countryCurrencyCode, admin_currencycode, function (response) {

                                                                    if (response.success) {
                                                                        current_rate = response.current_rate;
                                                                    } else {
                                                                        current_rate = 1;
                                                                    }

                                                                    var provider_service_fees = 0;
                                                                    var total_in_admin_currency = 0;
                                                                    var service_total_in_admin_currency = 0;
                                                                    var provider_service_fees_in_admin_currency = 0;

                                                                    provider_service_fees = cancellationCharges * provider_profit * 0.01;
                                                                    provider_service_fees_in_admin_currency = provider_service_fees * current_rate;

                                                                    total_in_admin_currency = cancellationCharges * current_rate;
                                                                    service_total_in_admin_currency = cancellationCharges * current_rate;

                                                                    trip.total_service_fees = cancellationCharges;
                                                                    trip.total = cancellationCharges;
                                                                    trip.provider_service_fees = (provider_service_fees).toFixed(2);
                                                                    trip.pay_to_provider = trip.provider_service_fees
                                                                    trip.total_in_admin_currency = total_in_admin_currency;
                                                                    trip.service_total_in_admin_currency = service_total_in_admin_currency;
                                                                    trip.provider_service_fees_in_admin_currency = provider_service_fees_in_admin_currency;
                                                                    trip.current_rate = current_rate;
                                                                    trip.payment_status = PAYMENT_STATUS.WAITING;

                                                                    trip.admin_currency = admin_currency;
                                                                    trip.admin_currencycode = admin_currencycode;
                                                                    

                                                                    var user_id = req.body.user_id;
                                                                    if(trip_type == constant_json.TRIP_TYPE_CORPORATE){
                                                                        user_id = trip.user_type_id;
                                                                    }

                                                                    if (trip.payment_mode == Number(constant_json.PAYMENT_MODE_CASH) && is_provider_earning_set_in_wallet_on_cash_payment) {
                                                                        Provider.findOne({_id: providerID}).then((provider) => {
                                                                            if (provider) {
                                                                                if (provider.provider_type == Number(constant_json.PROVIDER_TYPE_NORMAL)) {

                                                                                    var total_wallet_amount = utils.addWalletHistory(constant_json.PROVIDER_UNIQUE_NUMBER, provider.unique_id, provider._id, provider.country_id,
                                                                                        provider.wallet_currency_code, trip.currencycode,
                                                                                        1, trip.pay_to_provider, provider.wallet, constant_json.ADD_WALLET_AMOUNT, constant_json.SET_TRIP_PROFIT, "Profit Of This Trip : " + trip.unique_id);

                                                                                    provider.wallet = total_wallet_amount;
                                                                                    provider.save();
                                                                                } else {
                                                                                    Partner.findOne({_id: trip.provider_type_id}).then((partner) => {

                                                                                        var total_wallet_amount = utils.addWalletHistory(constant_json.PARTNER_UNIQUE_NUMBER, partner.unique_id, partner._id, partner.country_id,
                                                                                            partner.wallet_currency_code, trip.currencycode,
                                                                                            1, trip.pay_to_provider, partner.wallet, constant_json.ADD_WALLET_AMOUNT, constant_json.SET_TRIP_PROFIT, "Profit Of This Trip : " + trip.unique_id);

                                                                                        partner.wallet = total_wallet_amount;
                                                                                        partner.save();
                                                                                    });
                                                                                }

                                                                                trip.is_provider_earning_set_in_wallet = true;
                                                                                trip.provider_income_set_in_wallet = Math.abs(trip.pay_to_provider);
                                                                            }
                                                                        });
                                                                    }

                                                                    trip.remaining_payment = cancellationCharges
                                                                    if(trip.payment_mode == constant_json.PAYMENT_MODE_APPLE_PAY){
                                                                        trip.payment_status = PAYMENT_STATUS.FAILED;
                                                                        trip.save().then(() => {
                                                                                    utils.update_request_status_socket(trip._id);
                                                                                    res.json({
                                                                                        success: true,
                                                                                        message: success_messages.MESSAGE_CODE_FOR_PROVIDER_YOUR_TRIP_COMPLETED_SUCCESSFULLY,
                                                                                        payment_status: trip.payment_status,
                                                                                    });
                                                                                });
                                                                    } else {
                                                                        trip.payment_mode = constant_json.PAYMENT_MODE_CARD;
                                                                        Card.findOne({user_id: user._id, payment_gateway_type: trip.payment_gateway_type, is_default: true}, function(error, card_detail){
                                                                            if(card_detail){
                                                                                    trip.payment_status = PAYMENT_STATUS.FAILED;
                                                                                    trip.save().then(() => {
                                                                                        utils.update_request_status_socket(trip._id);
                                                                                        Trip.findOneAndRemove({ _id: trip._id }).then((deleted_trip) => {
                                                                                            if (deleted_trip) {
                                                                                                var trip_history_data = new Trip_history(JSON.parse(JSON.stringify(deleted_trip)));
                                                                                                trip_history_data.save(function () {
                                                                                                    res.json({
                                                                                                        success: true,
                                                                                                        error: '',
                                                                                                        message: success_messages.MESSAGE_CODE_FOR_PROVIDER_YOUR_TRIP_COMPLETED_SUCCESSFULLY,
                                                                                                        payment_status: trip.payment_status,
                                                                                                    });
                                                                                                });
                                                                                            } else {
                                                                                                res.json({
                                                                                                    success: true,
                                                                                                    error: '',
                                                                                                    message: success_messages.MESSAGE_CODE_FOR_PROVIDER_YOUR_TRIP_COMPLETED_SUCCESSFULLY,
                                                                                                    payment_status: trip.payment_status,
                                                                                                });
                                                                                            }
                                                                                        });
                                                                                    });
                                                                            } else {
                                                                                trip.payment_status = PAYMENT_STATUS.FAILED;
                                                                                trip.save().then(() => {
                                                                                    utils.update_request_status_socket(trip._id);
                                                                                    Trip.findOneAndRemove({ _id: trip._id }).then((deleted_trip) => {
                                                                                        if (deleted_trip) {
                                                                                            var trip_history_data = new Trip_history(JSON.parse(JSON.stringify(deleted_trip)));
                                                                                            trip_history_data.save(function () {
                                                                                                res.json({
                                                                                                    success: true,
                                                                                                    message: success_messages.MESSAGE_CODE_FOR_PROVIDER_YOUR_TRIP_COMPLETED_SUCCESSFULLY,
                                                                                                    payment_status: trip.payment_status,
                                                                                                });
                                                                                            });
                                                                                        } else {
                                                                                            res.json({
                                                                                                success: true,
                                                                                                message: success_messages.MESSAGE_CODE_FOR_PROVIDER_YOUR_TRIP_COMPLETED_SUCCESSFULLY,
                                                                                                payment_status: trip.payment_status,
                                                                                            });
                                                                                        }
                                                                                    });
                                                                                });
                                                                            }
                                                                        });
                                                                    }
                                                                });
                                                            });
                                                        } else {
                                                            trip.provider_service_fees = 0;
                                                            trip.save(()=>{
                                                                user.cancelled_request = user.cancelled_request + 1;
                                                                user.current_trip_id = null;
                                                                user.save();
                                                                utils.update_request_status_socket(trip._id);
                                                                if (req.body.type !== "Admin") {
                                                                    Trip.findOneAndRemove({_id: req.body.trip_id}).then((deleted_trip) => {
                                                                        if (deleted_trip) {
                                                                            var trip_history_data = new Trip_history(JSON.parse(JSON.stringify(deleted_trip)));
                                                                            trip_history_data.save(function () {
                                                                                res.json({
                                                                                    success: true,
                                                                                    payment_status: trip.payment_status,
                                                                                    message: success_messages.MESSAGE_CODE_YOUR_TRIP_CANCELLED_SUCCESSFULLY
                                                                                });
                                                                            });
                                                                        } else {
                                                                            res.json({
                                                                                success: true,
                                                                                payment_status: trip.payment_status,
                                                                                message: success_messages.MESSAGE_CODE_YOUR_TRIP_CANCELLED_SUCCESSFULLY
                                                                            });
                                                                        }
                                                                    });
                                                                }
                                                            })
                                                        }

                                                    });
                                                } else {
                                                    trip.provider_service_fees = 0;
                                                    trip.save(() => {
                                                        user.cancelled_request = user.cancelled_request + 1;
                                                        user.current_trip_id = null;
                                                        user.save();
                                                        utils.update_request_status_socket(trip._id);
                                                        if (req.body.type !== "Admin") {
                                                            Trip.findOneAndRemove({ _id: req.body.trip_id }).then((deleted_trip) => {
                                                                if (deleted_trip) {
                                                                    var trip_history_data = new Trip_history(JSON.parse(JSON.stringify(deleted_trip)));
                                                                    trip_history_data.save(function () {
                                                                        res.json({
                                                                            success: true,
                                                                            payment_status: trip.payment_status,
                                                                            message: success_messages.MESSAGE_CODE_YOUR_TRIP_CANCELLED_SUCCESSFULLY
                                                                        });
                                                                    });
                                                                } else {
                                                                    res.json({
                                                                        success: true,
                                                                        payment_status: trip.payment_status,
                                                                        message: success_messages.MESSAGE_CODE_YOUR_TRIP_CANCELLED_SUCCESSFULLY
                                                                    });
                                                                }
                                                            });
                                                        }
                                                    })
                                                }
                                            }, (err) => {
                                                console.log(err);
                                                res.json({
                                                    success: false,
                                                    error_code: error_message.ERROR_CODE_SOMETHING_WENT_WRONG
                                                });
                                            });
                                        }
                                    } else {
                                        if (user.current_trip_id) {
                                            user.current_trip_id = null;
                                            user.cancelled_request = user.cancelled_request + 1;
                                            user.save();
                                        }
                                            utils.update_request_status_socket(trip._id);
                                        if (req.body.type !== "Admin") {
                                            res.json({
                                                success: true,
                                                payment_status: trip.payment_status,
                                                message: success_messages.ERROR_CODE_TRIP_IS_ALREADY_CANCELLED
                                            });
                                        }
                                    }

                                } else {
                                    utils.update_request_status_socket(trip._id);
                                    res.json({
                                        success: true,
                                        payment_status: trip.payment_status,
                                        message: success_messages.ERROR_CODE_TRIP_ALREADY_COMPLETED
                                    });

                                }


                            } else {
                                res.json({
                                    success: false,
                                    error_code: error_message.ERROR_CODE_NO_TRIP
                                });
                            }
                        }, (err) => {
                            console.log(err);
                            res.json({
                                success: false,
                                error_code: error_message.ERROR_CODE_SOMETHING_WENT_WRONG
                            });
                        });
                    }
                } else {
                    if (req.body.type !== "Admin") {
                        res.json({success: false, error_code: error_message.ERROR_CODE_USER_DETAIL_NOT_FOUND});
                    }
                }
            }, (err) => {
                console.log(err);
                res.json({
                    success: false,
                    error_code: error_message.ERROR_CODE_SOMETHING_WENT_WRONG
                });
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

exports.trip_cancel_by_provider = function (req, res) {

    utils.check_request_params(req.body, [{name: 'provider_id', type: 'string'}, {
        name: 'trip_id',
        type: 'string'
    }], function (response) {
        if (response.success) {
            Provider.findOne({_id: req.body.provider_id}).then((provider) => {
                if (provider) {
                    if (req.body.token != null && provider.token != req.body.token) {
                        res.json({success: false, error_code: error_message.ERROR_CODE_INVALID_TOKEN});
                    } else {

                        Trip.findOne({
                            _id: req.body.trip_id,
                            is_trip_cancelled: 0,
                            is_trip_cancelled_by_provider: 0,
                            is_trip_cancelled_by_user: 0
                        }).then((trip) => {
                            if (trip) {

                                var city_timezone = trip.timezone;
                                var cancel_reason = req.body.cancel_reason;

                                User.findOne({_id: trip.user_id}).then((user) => {

                                    trip.cancel_reason = cancel_reason;
                                    trip.is_trip_cancelled = 1;
                                    trip.is_trip_cancelled_by_provider = 1;
                                    trip.provider_trip_end_time = new Date();
                                    var complete_date_in_city_timezone = utils.get_date_now_at_city(new Date(), trip.timezone);
                                    var complete_date_tag = moment(moment(complete_date_in_city_timezone).startOf('day')).format(constant_json.DATE_FORMAT_MMM_D_YYYY);
                                    trip.complete_date_in_city_timezone = complete_date_in_city_timezone;
                                    trip.complete_date_tag = complete_date_tag;
                                    trip.provider_service_fees = 0;
                                    trip.save().then(() => {
                                        provider.is_available = 1;
                                        provider.cancelled_request = provider.cancelled_request + 1;
                                        provider.is_trip = [];
                                        provider.save();

                                        myAnalytics.insert_daily_provider_analytics(city_timezone, provider._id, TRIP_STATUS.PROVIDER_CANCELLED, null);
                                        utils.sendPushNotification(constant_json.USER_UNIQUE_NUMBER, user.device_type, user.device_token, push_messages.PUSH_CODE_FOR_TRIP_CANCELLED_BY_PROVIDER, constant_json.PUSH_NOTIFICATION_SOUND_FILE_IN_IOS);

                                        User_promo_use.findOne({trip_id: trip._id}).then((userpromouse) => {
                                            if (userpromouse) {
                                                userpromouse.remove();
                                            }

                                        });
                                        Promo_Code.findOne({_id: trip.promo_id}).then((promo_code) => {
                                            if (promo_code) {
                                                promo_code.user_used_promo = promo_code.user_used_promo - 1;
                                                promo_code.save();
                                            }
                                        });

                                        user.current_trip_id = null;
                                        user.save();
                                        utils.update_request_status_socket(trip._id);

                                        Trip.findOneAndRemove({_id: req.body.trip_id}).then((deleted_trip) => {
                                            if (deleted_trip) {
                                                var trip_history_data = new Trip_history(JSON.parse(JSON.stringify(deleted_trip)));
                                                trip_history_data.save(function () {
                                                    res.json({
                                                        success: true,
                                                        message: success_messages.MESSAGE_CODE_FOR_PROVIDER_YOUR_TRIP_CANCELLED_SUCCESSFULLY,
                                                        is_trip_cancelled_by_provider: trip.is_trip_cancelled_by_provider
                                                    });
                                                });
                                            } else {
                                                res.json({
                                                    success: true,
                                                    message: success_messages.MESSAGE_CODE_FOR_PROVIDER_YOUR_TRIP_CANCELLED_SUCCESSFULLY,
                                                    is_trip_cancelled_by_provider: trip.is_trip_cancelled_by_provider

                                                });
                                            }
                                        });
                                        
                                    }, (err) => {
                                        console.log(err);
                                        res.json({
                                            success: false,
                                            error_code: error_message.ERROR_CODE_SOMETHING_WENT_WRONG
                                        });
                                    });
                                });
                            } else {
                                res.json({
                                    success: false,
                                    error_code: error_message.ERROR_CODE_TRIP_IS_ALREADY_CANCELLED
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

exports.trip_cancel_by_admin = function (req, res) {

    utils.check_request_params(req.body, [{
        name: 'trip_id',
        type: 'string'
    }], function (response) {
        if (response.success) {
                  
            Trip.findOne({
                _id: req.body.trip_id,
                is_trip_cancelled: 0,
                is_trip_cancelled_by_provider: 0,
                is_trip_cancelled_by_user: 0
            }).then((trip) => {
                if (trip) {
                    Provider.findOne({_id: trip.confirmed_provider}).then((provider) => {
                        

                        User.findOne({_id: trip.user_id}).then((user) => {

                            if (provider) {
                                provider.is_available = 1;
                                provider.is_trip = [];
                                provider.save();
                                utils.sendPushNotification(constant_json.PROVIDER_UNIQUE_NUMBER, provider.device_type, provider.device_token, push_messages.PUSH_CODE_FOR_TRIP_CANCELLED_BY_ADMIN, constant_json.PUSH_NOTIFICATION_SOUND_FILE_IN_IOS);
                            }

                            Provider.updateMany({_id: {$in: trip.current_providers}}, {is_available: 1, is_trip: []}, {multi: true}, function(){
                                                    
                            });
                            
                            trip.cancel_reason = '';
                            trip.is_trip_cancelled = 1;
                            trip.provider_trip_end_time = new Date();
                            var complete_date_in_city_timezone = utils.get_date_now_at_city(new Date(), trip.timezone);
                            var complete_date_tag = moment(moment(complete_date_in_city_timezone).startOf('day')).format(constant_json.DATE_FORMAT_MMM_D_YYYY);
                            trip.complete_date_in_city_timezone = complete_date_in_city_timezone;
                            trip.complete_date_tag = complete_date_tag;

                            trip.save().then(() => {

                                utils.sendPushNotification(constant_json.USER_UNIQUE_NUMBER, user.device_type, user.device_token, push_messages.PUSH_CODE_FOR_TRIP_CANCELLED_BY_ADMIN, constant_json.PUSH_NOTIFICATION_SOUND_FILE_IN_IOS);
                                User_promo_use.findOne({trip_id: trip._id}).then((userpromouse) => {
                                    if (userpromouse) {
                                        userpromouse.remove();
                                    }
                                });
                                Promo_Code.findOne({_id: trip.promo_id}).then((promo_code) => {
                                    if (promo_code) {
                                        promo_code.user_used_promo = promo_code.user_used_promo - 1;
                                        promo_code.save();
                                    }
                                });

                                
                                if (String(trip._id) == String(user.current_trip_id)) {
                                    user.current_trip_id = null;
                                    user.save();
                                }

                                message = admin_messages.success_message_trip_cancelled;
                                utils.update_request_status_socket(trip._id);
                                
                                Trip.findOneAndRemove({ _id: req.body.trip_id }).then((deleted_trip) => {
                                    if (deleted_trip) {
                                        var trip_history_data = new Trip_history(JSON.parse(JSON.stringify(deleted_trip)));
                                        trip_history_data.save(function () {
                                            res.json({ success: true });
                                        });
                                    } else {
                                        res.json({ success: true });
                                    }
                                });
                            }, (err) => {
                                console.log(err);
                                res.json({success: true});
                            });
                        });
                        
                    });
                } else {
                    res.json({success: true});
                }
            });
                   
        } else {
        }
    });
};

exports.scheduled_trip_cancel_by_admin = function (req, res) {
    utils.check_request_params(req.body, [{
        name: 'trip_id',
        type: 'string'
    }], function (response) {
        if (response.success) {
            Trip.findOne({
                _id: req.body.trip_id,
                is_trip_cancelled: 0,
                is_trip_cancelled_by_provider: 0,
                is_trip_cancelled_by_user: 0
            }).then((trip) => {
                if (trip) {
                    User.findOne({ _id: trip.user_id }).then((user) => {
                        trip.cancel_reason = '';
                        trip.is_trip_cancelled = 1;
                        trip.is_trip_cancelled_by_admin = 1;
                        trip.provider_trip_end_time = new Date();
                        var complete_date_in_city_timezone = utils.get_date_now_at_city(new Date(), trip.timezone);
                        var complete_date_tag = moment(moment(complete_date_in_city_timezone).startOf('day')).format(constant_json.DATE_FORMAT_MMM_D_YYYY);
                        trip.complete_date_in_city_timezone = complete_date_in_city_timezone;
                        trip.complete_date_tag = complete_date_tag;
                        trip.save().then(() => {
                            user.cancelled_request = user.cancelled_request + 1;
                            user.save();
                            message = admin_messages.success_message_trip_cancelled;
                            utils.update_request_status_socket(trip._id);
                            Trip.findOneAndRemove({ _id: req.body.trip_id }).then((deleted_trip) => {
                                if (deleted_trip) {
                                    var trip_history_data = new Trip_history(JSON.parse(JSON.stringify(deleted_trip)));
                                    trip_history_data.save(function () {
                                        res.json({ success: true });
                                    });
                                } else {
                                    res.json({ success: true });
                                }
                            });
                        }, (err) => {
                            console.log(err);
                            res.json({ success: true });
                        });
                    });
                } else {
                    res.json({ success: true });
                }
            });
        } else {
            res.json({ success: true });
        }
    });
};

exports.provider_set_trip_status = function (req, res) {

    utils.check_request_params(req.body, [{name: 'provider_id', type: 'string'}, {
        name: 'trip_id',
        type: 'string'
    }, {name: 'is_provider_status', type: 'number'},
        {name: 'latitude', type: 'number'}, {name: 'longitude', type: 'number'}], function (response) {
        if (response.success) {
            Provider.findOne({_id: req.body.provider_id}).then((provider) => {
                if (provider) {
                    if (req.body.token != null && provider.token != req.body.token) {
                        res.json({success: false, error_code: error_message.ERROR_CODE_INVALID_TOKEN});
                    } else {
                        Trip.findOne({_id: req.body.trip_id, confirmed_provider: req.body.provider_id}).then((trip) => {
                            if (trip) {
                                if (trip.is_trip_cancelled == 0 && trip.is_trip_cancelled_by_provider == 0) {
                                    var is_provider_status = Number(req.body.is_provider_status);

                                    var now = new Date();
                                    if (is_provider_status == 6) {
                                        trip.provider_trip_start_time = now;

                                        if (trip.is_otp_verification) {
                                            var confirmation_code = req.body.trip_start_otp;
                                            if (trip.confirmation_code != confirmation_code) {
                                                return res.json({ success: false, error_code: error_message.ERROR_CODE_INVALID_TRIP_START_OTP });
                                            }
                                        }
                                    }

                                    if (is_provider_status == 4) {
                                        trip.provider_arrived_time = now;
                                    }

                                    trip.is_provider_status = is_provider_status;
                                    trip.save().then(() => {
                                        TripLocation.findOne({tripID: req.body.trip_id}).then((tripLocation) => {
                                            var latlong = [0, 0];
                                            latlong = [Number(req.body.latitude), Number(req.body.longitude)];
                                            switch (is_provider_status) {

                                                case 2:
                                                    tripLocation.providerStartTime = now;
                                                    tripLocation.providerStartLocation = latlong;
                                                    tripLocation.providerStartToStartTripLocations.push(latlong);
                                                    break;
                                                case 6:
                                                    tripLocation.startTripTime = now;
                                                    tripLocation.startTripLocation = latlong;
                                                    tripLocation.startTripToEndTripLocations.push(latlong);
                                                    break;
                                            }
                                            tripLocation.save();
                                        }, (err) => {
                                            console.log(err)
                                        });


                                        User.findOne({_id: trip.user_id}).then((user) => {

                                            var device_token = user.device_token;
                                            var device_type = user.device_type;
                                            if (is_provider_status == 6) {
                                                EmergencyContactDetail.find({
                                                    user_id: trip.user_id,
                                                    is_always_share_ride_detail: 1
                                                }).then((emergencyContactDetails) => {
                                                    emergencyContactDetails.forEach(function (emergencyContactDetail) {
                                                        var phoneWithCode = emergencyContactDetail.phone;
                                                        if (setting_detail.sms_notification) {
                                                            utils.sendSmsForOTPVerificationAndForgotPassword(phoneWithCode, 7, [user.first_name + " " + user.last_name, provider.first_name + " " + provider.last_name, trip.source_address, trip.destination_address]);
                                                        }
                                                    });
                                                });
                                            }

                                            var value;
                                            var providerStatusCase = trip.is_provider_status;
                                            switch (providerStatusCase) {

                                                case 2:
                                                    value = push_messages.PUSH_CODE_FOR_PROVIDER_COMMING_YOUR_LOCATION;
                                                    break;
                                                case 4:
                                                    value = push_messages.PUSH_CODE_FOR_PROVIDER_ARRIVED;
                                                    break;
                                                case 6:
                                                    value = push_messages.PUSH_CODE_FOR_YOUR_TRIP_STARTED;
                                                    break;
                                            }
                                            utils.sendPushNotification(constant_json.USER_UNIQUE_NUMBER, device_type, device_token, value, constant_json.PUSH_NOTIFICATION_SOUND_FILE_IN_IOS);
                                        });
                                        utils.update_request_status_socket(trip._id);
                                        res.json({
                                            success: true,
                                            message: success_messages.MESSAGE_CODE_FOR_PROVIDER_YOU_SET_TRIP_STATUS_SUCCESSFULLY,
                                            trip: trip
                                        });
                                    }, (err) => {
                                        console.log(err);
                                        res.json({
                                            success: false,
                                            error_code: error_message.ERROR_CODE_SOMETHING_WENT_WRONG
                                        });
                                    });

                                } else {
                                    res.json({
                                        success: false,
                                        error_code: error_message.ERROR_CODE_MISMATCH_PROVIDER_ID_OR_TRIP_ID
                                    });
                                }
                            } else {
                                res.json({success: false, error_code: error_message.ERROR_CODE_NO_TRIP_FOUND});

                            }
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
            }, (err) => {
                console.log(err);
                res.json({
                    success: false,
                    error_code: error_message.ERROR_CODE_SOMETHING_WENT_WRONG
                });
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


exports.check_destination = function (req, res) {

    utils.check_request_params(req.body, [{name: 'provider_id', type: 'string'}, {
        name: 'trip_id',
        type: 'string'
    }], function (response) {
        if (response.success) {
            var geo = false;
            var geo2 = false
            var zone1, zone2, k = 0;
            Provider.findOne({_id: req.body.provider_id}).then((provider) => {
                if (provider) {
                    if (req.body.token != null && provider.token != req.body.token) {
                        res.json({success: false, error_code: error_message.ERROR_CODE_INVALID_TOKEN});
                    } else {
                        Trip.findOne({_id: req.body.trip_id}).then((trip) => {
                            if (trip) {
                                Citytype.findOne({_id: trip.service_type_id}).then((citytype) => {
                                    if (citytype) {
                                        City.findOne({_id: citytype.cityid, zone_business: true}).then((city) => {

                                            if (city) {
                                                CityZone.find({cityid: citytype.cityid}).then((cityzone) => {

                                                    if (citytype.is_zone == 1 && cityzone !== null && cityzone.length > 0) {

                                                        var zone_count = cityzone.length;
                                                        cityzone.forEach(function (cityzoneDetail) {

                                                            geo = geolib.isPointInside(
                                                                {
                                                                    latitude: trip.sourceLocation[0],
                                                                    longitude: trip.sourceLocation[1]
                                                                },
                                                                cityzoneDetail.kmlzone
                                                            );
                                                            geo2 = geolib.isPointInside(
                                                                {
                                                                    latitude: req.body.latitude,
                                                                    longitude: req.body.longitude
                                                                },
                                                                cityzoneDetail.kmlzone
                                                            );
                                                            if (geo) {
                                                                zone1 = cityzoneDetail.id;
                                                            }
                                                            if (geo2) {
                                                                zone2 = cityzoneDetail.id;
                                                            }
                                                            k++;
                                                            if (k == zone_count) {

                                                                ZoneValue.findOne({service_type_id: trip.service_type_id, 
                                                                    $or: [{from: zone1, to: zone2}, {
                                                                        from: zone2,
                                                                        to: zone1
                                                                    }]
                                                                }).then((zonevalue) => {

                                                                    if (zonevalue) {
                                                                        trip.trip_type = constant_json.TRIP_TYPE_ZONE;
                                                                        trip.trip_type_amount = (zonevalue.amount).toFixed(2);
                                                                        trip.save(function () {
                                                                            res.json({success: true, zone: ''});
                                                                        });
                                                                    } else {
                                                                        airport(citytype.cityid, citytype, trip, req.body, res);
                                                                    }
                                                                })
                                                            }
                                                        });
                                                    } else {
                                                        airport(citytype.cityid, citytype, trip, req.body, res);
                                                    }
                                                });
                                            } else {
                                                airport(citytype.cityid, citytype, trip, req.body, res);
                                            }
                                        }, (err) => {
                                            console.log(err);
                                            res.json({
                                                success: false,
                                                error_code: error_message.ERROR_CODE_SOMETHING_WENT_WRONG
                                            });
                                        });
                                    } else {
                                        res.json({
                                            success: false,
                                            error_code: error_message.ERROR_CODE_NO_CITY_LIST_FOUND
                                        });
                                    }
                                }, (err) => {
                                    console.log(err);
                                    res.json({
                                        success: false,
                                        error_code: error_message.ERROR_CODE_SOMETHING_WENT_WRONG
                                    });
                                });
                            } else {
                                res.json({success: false, error_code: error_message.ERROR_CODE_TRIP_NOT_FOUND});
                            }
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
            }, (err) => {
                console.log(err);
                res.json({
                    success: false,
                    error_code: error_message.ERROR_CODE_SOMETHING_WENT_WRONG
                });
            });
        } else {
            res.json({
                success: false,
                error_code: response.error_code,
                error_description: response.error_description
            });
        }
    });
}

function airport(cityid, citytype, trip, body, res) {
    var airport;
    Airport.find({city_id: cityid}).then((airport_data) => {

        if (airport_data != null && airport_data.length > 0) {
            var k = 0;
            City.findOne({'_id': cityid, airport_business: true}).then((city) => {
                if (city) {
                    airport_data.forEach(function (airportDetail) {

                        if (airport == undefined) {

                            var pickup_airport = geolib.isPointInside(
                                {
                                    latitude: trip.sourceLocation[0],
                                    longitude: trip.sourceLocation[1]
                                },
                                airportDetail.kmlzone
                            );

                            var dest_airport = geolib.isPointInside(
                                {
                                    latitude:  body.latitude,
                                    longitude:  body.longitude
                                },
                                airportDetail.kmlzone
                            );

                            if (pickup_airport) {
                                city_distance = utils.getDistanceFromTwoLocation([body.latitude, body.longitude], city.cityLatLong);
                                if (city_distance < city.cityRadius) {

                                    AirportCity.findOne({
                                        airport_id: airportDetail._id,
                                        service_type_id: citytype._id
                                    }).then((airportcity) => {

                                        if (airportcity !== null && airportcity.price > 0) {
                                            airport = airportDetail._id;
                                            trip.trip_type = constant_json.TRIP_TYPE_AIRPORT;
                                            trip.trip_type_amount = (airportcity.price).toFixed(2);
                                            trip.save().then(() => {
                                                res.json({success: true, airport: ''});
                                            });
                                        } else if (airport_data.length - 1 == k) {
                                            cityCheck(cityid, citytype, trip, body, res)
                                        } else {
                                            k++;
                                        }
                                    })
                                } else if (airport_data.length - 1 == k) {
                                    cityCheck(cityid, citytype, trip, body, res)
                                } else {
                                    k++;
                                }
                            } else if (dest_airport) {
                                city_distance = utils.getDistanceFromTwoLocation(trip.sourceLocation, city.cityLatLong);
                                if (city_distance < city.cityRadius) {


                                    AirportCity.findOne({
                                        airport_id: airportDetail._id,
                                        service_type_id: citytype._id
                                    }).then((airportcity) => {

                                        if (airportcity !== null && airportcity.price > 0) {
                                            airport = airportDetail._id;
                                            trip.trip_type = constant_json.TRIP_TYPE_AIRPORT;
                                            trip.trip_type_amount = (airportcity.price).toFixed(2);
                                            trip.save().then(() => {
                                                res.json({success: true, airport: ''});
                                            });
                                        } else if (airport_data.length - 1 == k) {
                                            cityCheck(cityid, citytype, trip, body, res)
                                        } else {
                                            k++;
                                        }
                                    })
                                } else if (airport_data.length - 1 == k) {
                                    cityCheck(cityid, citytype, trip, body, res)
                                } else {
                                    k++;
                                }
                            } else if (airport_data.length - 1 == k && airport == undefined) {
                                cityCheck(cityid, citytype, trip, body, res)
                            } else {
                                k++;
                            }
                        }
                    });
                } else {
                    cityCheck(cityid, citytype, trip, body, res)
                }
            }, () => {
                cityCheck(cityid, citytype, trip, body, res)
            })
        } else {
            cityCheck(cityid, citytype, trip, body, res)
        }
    }, () => {
        cityCheck(cityid, citytype, trip, body, res)
    });

}

function cityCheck(cityid, citytype, trip, body, res) {

    var flag = 0;
    var k = 0;
    City.findOne({'_id': cityid, city_business: true}).then((city) => {
        if (city) {
            CitytoCity.find({city_id: cityid, service_type_id: citytype._id, destination_city_id: {$in: city.destination_city}}).then((citytocity) => {


                if (citytocity !== null && citytocity.length > 0) {

                    citytocity.forEach(function (citytocity_detail) {

                        City.findById(citytocity_detail.destination_city_id).then((city_detail) => {
                            if (flag == 0) {
                                var city_radius = city_detail.cityRadius;
                                var destination_city_radius = utils.getDistanceFromTwoLocation([body.latitude, body.longitude], city_detail.cityLatLong);

                                var inside_city;
                                if(city_detail.city_locations && city_detail.city_locations.length>2){
                                    inside_city = geolib.isPointInside(
                                        {
                                            latitude:  body.latitude,
                                            longitude:  body.longitude
                                        },
                                        city_detail.city_locations
                                    );
                                }
                                
                                if (citytocity_detail.price > 0 && ((!city_detail.is_use_city_boundary && city_radius > destination_city_radius) || (city_detail.is_use_city_boundary && inside_city))) {
                    
                                    trip.trip_type = constant_json.TRIP_TYPE_CITY;
                                    trip.trip_type_amount = (citytocity_detail.price).toFixed(2);
                                    flag = 1;
                                    trip.save().then(() => {
                                        res.json({success: true, city: ''})
                                    });
                                } else if (citytocity.length - 1 == k) {
                                    res.json({success: true})
                                } else {
                                    k++;
                                }
                            }
                        });
                    });
                } else {
                    res.json({success: true})
                }
            });
        } else {
            res.json({success: true})
        }
    }, (err) => {
        console.log(err);
        res.json({
            success: false,
            error_code: error_message.ERROR_CODE_SOMETHING_WENT_WRONG
        });
    });
}

exports.provider_complete_trip = function (req, res) {

    utils.check_request_params(req.body, [{name: 'trip_id', type: 'string'}, {name: 'provider_id', type: 'string'}], function (response) {
        if (response.success) {
            Provider.findOne({_id: req.body.provider_id}).then((provider) => {
                if (provider) {
                    if (req.body.token != null && provider.token != req.body.token) {
                        res.json({success: false, error_code: error_message.ERROR_CODE_INVALID_TOKEN});
                    } else {
                        Trip.findOne({
                            _id: req.body.trip_id,
                            confirmed_provider: req.body.provider_id,
                            is_trip_completed: 0,
                            is_trip_end: 0
                        }).then((trip) => {
                            if (trip) {
                                if (trip.is_trip_cancelled == 0 && trip.is_trip_cancelled_by_user == 0 && trip.is_trip_cancelled_by_provider == 0) {

                                    var city_timezone = trip.timezone;
                                    User.findOne({_id: trip.user_id}).then((user) => {


                                        var total_distance = Number((trip.total_distance).toFixed(2));
                                        var total_time = Number((trip.total_time).toFixed(2));
                                        var total_waiting_time = 0;
                                        var distance_cost = 0;
                                        var time_cost = 0;
                                        var waiting_time_cost = 0;
                                        var total_service_fees = 0;
                                        var tax_fee = 0;
                                        var provider_tax_fee = 0;
                                        var total_after_tax_fees = 0;
                                        var surge_fee = 0;
                                        var total_after_surge_fees = 0;
                                        var promo_payment = 0;
                                        var total_after_promo_payment = 0;

                                        var promo_value = 0;

                                        var total = 0;
                                        var is_min_fare_used = 0;
                                        var user_tax_fee = 0;
                                        var is_surge_hours = trip.is_surge_hours;
                                        var total_time_end = 0;
                                        var now = new Date();
                                        var dateNow = new Date();
                                        total_time_end = utils.getTimeDifferenceInMinute(dateNow, trip.provider_trip_start_time);
                                        if (total_time_end > total_time) {
                                            total_time = total_time_end;
                                        }

                                        if (total_time < 0) {
                                            total_time = 0;
                                        }
                                        trip.total_time = total_time;

                                        total_waiting_time = utils.getTimeDifferenceInMinute(trip.provider_trip_start_time, trip.provider_arrived_time);
                                        if (total_waiting_time < 0) {
                                            total_waiting_time = 0;
                                        }

                                        TripLocation.findOne({tripID: req.body.trip_id}).then((tripLocation) => {
                                            tripLocation.endTripTime = now;

                                            var total_distance_diff = 0;
                                            let start_end_Location = tripLocation.startTripToEndTripLocations;
                                            if (req.body.location && req.body.location.length > 0) {
                                                var prev_location = [Number(start_end_Location[0][0]), Number(start_end_Location[0][1])]
                                                var time = provider.location_updated_time;
                                                for (var i = 0; i < req.body.location.length; i++) {
                                                    var location = [Number(req.body.location[i][0]), Number(req.body.location[i][1])];
                                                    start_end_Location.push(location);
                                                    var distance_diff = Math.abs(utils.getDistanceFromTwoLocation(prev_location, location))
                                                    var time_diff = Math.abs(utils.getTimeDifferenceInSecond(new Date(time), new Date(Number(req.body.location[i][2]))));
                                                    var max_distance = 0.05;
                                                    // if ((distance_diff < max_distance * time_diff && distance_diff > 0.005) || time_diff == 0) {
                                                        if ((distance_diff < max_distance * time_diff && distance_diff > 0.005) ||  (  distance_diff < max_distance && time_diff == 0)  ) {
                                                        total_distance_diff = total_distance_diff + distance_diff;
                                                        time = Number(req.body.location[i][2]);
                                                        prev_location = location;
                                                    }
                                                }
                                                if (trip.unit == 0) { /// 0 = mile
                                                    total_distance_diff = total_distance_diff * 0.621371;
                                                }
                                                trip.total_distance = (+trip.total_distance + +total_distance_diff).toFixed(2);
                                                total_distance = trip.total_distance;
                                            }

                                            if (!req.body.latitude || !req.body.longitude) {
                                                req.body.latitude = tripLocation.startTripToEndTripLocations[tripLocation.startTripToEndTripLocations.length - 1][0]
                                                req.body.longitude = tripLocation.startTripToEndTripLocations[tripLocation.startTripToEndTripLocations.length - 1][1]
                                            }

                                            start_end_Location.push([req.body.latitude, req.body.longitude]);

                                            tripLocation.startTripToEndTripLocations = start_end_Location;
                                            tripLocation.endTripLocation = [req.body.latitude, req.body.longitude];

                                            var url = "https://maps.googleapis.com/maps/api/geocode/json?latlng="+req.body.latitude+","+req.body.longitude+"&key="+setting_detail.web_app_google_key;
                                            var request_data = require('request');
                                            if(!req.body.destination_address){
                                                request_data(url, function (error, response, body) {
                                                    if(body.status == 'OK'){
                                                        req.body.destination_address = body.results[0].formatted_address;
                                                    }
                                                });
                                            }
                                            tripLocation.googlePathStartLocationToPickUpLocation = "";
                                            tripLocation.googlePickUpLocationToDestinationLocation = "";
                                            tripLocation.actual_startTripToEndTripLocations = tripLocation.startTripToEndTripLocations;
                                            tripLocation.save().then(() => {

                                                var index = tripLocation.index_for_that_covered_path_in_google;
                                                var startTripToEndTripLocations = tripLocation.startTripToEndTripLocations;
                                                var size = startTripToEndTripLocations.length;
                                                var gap = 95;
                                                var start_index = index * gap;
                                                var end_index = size;
                                                start_index--;
                                                if (start_index < 0) {
                                                    start_index = 0;
                                                }
                                                var locations = [];

                                                for (; start_index < end_index; start_index++) {
                                                    locations.push(startTripToEndTripLocations[start_index]);
                                                }

                                                utils.getSmoothPath(locations, function (getSmoothPathresponse) {

                                                    utils.bendAndSnap(getSmoothPathresponse, locations.length, function (response) {

                                                        if (response) {
                                                            var index = tripLocation.index_for_that_covered_path_in_google;
                                                            var google_start_trip_to_end_trip_locations = tripLocation.google_start_trip_to_end_trip_locations;
                                                            google_start_trip_to_end_trip_locations = google_start_trip_to_end_trip_locations.concat(response.temp_array);
                                                            tripLocation.google_start_trip_to_end_trip_locations = google_start_trip_to_end_trip_locations;
                                                            var google_total_distance = +tripLocation.google_total_distance + +response.distance;
                                                            tripLocation.google_total_distance = google_total_distance;
                                                            index++;
                                                            tripLocation.index_for_that_covered_path_in_google = index;
                                                            tripLocation.startTripToEndTripLocations = tripLocation.google_start_trip_to_end_trip_locations;
                                                            tripLocation.save();

                                                            var distance_diff = total_distance - google_total_distance;
                                                            if (distance_diff > 0.5 || distance_diff < -0.5) {
                                                                total_distance = (google_total_distance).toFixed(2);

                                                                if (trip.unit == 0) { /// 0 = mile
                                                                    total_distance = total_distance * 0.621371;
                                                                }

                                                                trip.total_distance = total_distance;
                                                            }
                                                        }

                                                        Provider.findOne({_id: req.body.provider_id}).then((provider) => {
                                                            City.findOne({_id: trip.city_id}).then(() => {
                                                                provider.providerLocation = [Number(req.body.latitude), Number(req.body.longitude)];
                                                                provider.bearing = req.body.bearing;
                                                                provider.save();

                                                                Trip_Service.findOne({_id: trip.trip_service_city_type_id}).then((tripservice) => {

                                                                    var surge_multiplier = 0;
                                                                    var min_fare = 0;
                                                                    var base_price = 0;
                                                                    var base_price_distance = 0;
                                                                    var tax = 0;
                                                                    var user_miscellaneous_fee = 0;
                                                                    var provider_miscellaneous_fee = 0;
                                                                    var user_tax = 0;
                                                                    var provider_tax = 0;
                                                                    var min_fare = 0;
                                                                    var provider_profit = 0;
                                                                    var price_per_unit_distance = 0;
                                                                    var price_for_total_time = 0;
                                                                    var price_for_waiting_time = 0;
                                                                    var waiting_time_start_after_minute = 0;
                                                                    var base_price_time = 0;
                                                                    var total_after_user_tax_fees = 0;
                                                                    ///////////////// Distance cost and Time cost calculation /////
                                                                    trip.is_provider_status = 9;
                                                                    // DISTANCE CALCULATIONS
                                                                    trip.destination_address = req.body.destination_address;
                                                                    trip.destinationLocation = [req.body.latitude, req.body.longitude];
                                                                    trip.provider_trip_end_time = now;

                                                                    var toll_amount = req.body.toll_amount;

                                                                    if (toll_amount == undefined) {
                                                                        toll_amount = 0;
                                                                    }


                                                                    var trip_type_amount = trip.trip_type_amount;
                                                                    provider_miscellaneous_fee = tripservice.provider_miscellaneous_fee;

                                                                    provider_tax = tripservice.provider_tax;

                                                                    provider_profit = tripservice.provider_profit;

                                                                    if (trip.is_fixed_fare && trip.fixed_price > 0) {
                                                                        tax = tripservice.tax;
                                                                        user_miscellaneous_fee = tripservice.user_miscellaneous_fee;
                                                                        user_tax = tripservice.user_tax;

                                                                        total_after_surge_fees = trip.fixed_price;
                                                                        trip.total_service_fees = total_after_surge_fees;

                                                                        total_after_surge_fees = utils.get_reverse_service_fee(total_after_surge_fees, tax);
                                                                        trip.fixed_price = total_after_surge_fees;
                                                                        tax_fee = Number((tax * 0.01 * total_after_surge_fees).toFixed(2));
                                                                        trip.tax_fee = tax_fee;
                                                                        total_after_tax_fees = +total_after_surge_fees + +tax_fee;
                                                                        user_tax_fee = Number((user_tax * 0.01 * total_after_surge_fees).toFixed(2));
                                                                        trip.user_tax_fee = user_tax_fee;
                                                                        trip.user_miscellaneous_fee = user_miscellaneous_fee; 
                                                                    } else if (trip.trip_type == constant_json.TRIP_TYPE_AIRPORT) {
                                                                        tax = tripservice.tax;
                                                                        user_miscellaneous_fee = tripservice.user_miscellaneous_fee;
                                                                        user_tax = tripservice.user_tax;

                                                                        total_after_surge_fees = trip_type_amount;
                                                                        trip.total_service_fees = total_after_surge_fees;

                                                                        total_after_surge_fees = utils.get_reverse_service_fee(total_after_surge_fees, tax)
                                                                        trip.fixed_price = total_after_surge_fees;
                                                                        tax_fee = Number((tax * 0.01 * total_after_surge_fees).toFixed(2));
                                                                        trip.tax_fee = tax_fee;
                                                                        total_after_tax_fees = +total_after_surge_fees + +tax_fee;
                                                                        user_tax_fee = Number((user_tax * 0.01 * total_after_surge_fees).toFixed(2));
                                                                        trip.user_tax_fee = user_tax_fee;
                                                                        trip.user_miscellaneous_fee = user_miscellaneous_fee; 
                                                                    } else if (trip.trip_type == constant_json.TRIP_TYPE_ZONE) {
                                                                        tax = tripservice.tax;
                                                                        user_miscellaneous_fee = tripservice.user_miscellaneous_fee;
                                                                        user_tax = tripservice.user_tax;

                                                                        total_after_surge_fees = trip_type_amount;
                                                                        trip.total_service_fees = total_after_surge_fees;

                                                                        total_after_surge_fees = utils.get_reverse_service_fee(total_after_surge_fees, tax)
                                                                        trip.fixed_price = total_after_surge_fees;
                                                                        tax_fee = Number((tax * 0.01 * total_after_surge_fees).toFixed(2));
                                                                        trip.tax_fee = tax_fee;
                                                                        total_after_tax_fees = +total_after_surge_fees + +tax_fee;
                                                                        user_tax_fee = Number((user_tax * 0.01 * total_after_surge_fees).toFixed(2));
                                                                        trip.user_tax_fee = user_tax_fee;
                                                                        trip.user_miscellaneous_fee = user_miscellaneous_fee; 
                                                                    } else if (trip.trip_type == constant_json.TRIP_TYPE_CITY) {
                                                                        tax = tripservice.tax;
                                                                        user_miscellaneous_fee = tripservice.user_miscellaneous_fee;
                                                                        user_tax = tripservice.user_tax;

                                                                        total_after_surge_fees = trip_type_amount;
                                                                        trip.total_service_fees = total_after_surge_fees;

                                                                        total_after_surge_fees = utils.get_reverse_service_fee(total_after_surge_fees, tax)
                                                                        trip.fixed_price = total_after_surge_fees;
                                                                        tax_fee = Number((tax * 0.01 * total_after_surge_fees).toFixed(2));
                                                                        trip.tax_fee = tax_fee;
                                                                        total_after_tax_fees = +total_after_surge_fees + +tax_fee;
                                                                        user_tax_fee = Number((user_tax * 0.01 * total_after_surge_fees).toFixed(2));
                                                                        trip.user_tax_fee = user_tax_fee;
                                                                        trip.user_miscellaneous_fee = user_miscellaneous_fee; 
                                                                    } else if (trip.car_rental_id) {
                                                                        if (trip.surge_multiplier) {
                                                                            surge_multiplier = trip.surge_multiplier;
                                                                        }
                                                                        min_fare = tripservice.min_fare;
                                                                        base_price = tripservice.base_price;
                                                                        base_price_distance = tripservice.base_price_distance;
                                                                        tax = tripservice.tax;
                                                                        user_miscellaneous_fee = tripservice.user_miscellaneous_fee;
                                                                        user_tax = tripservice.user_tax;

                                                                        price_per_unit_distance = tripservice.price_per_unit_distance;
                                                                        price_for_total_time = tripservice.price_for_total_time;
                                                                        price_for_waiting_time = tripservice.price_for_waiting_time;
                                                                        waiting_time_start_after_minute = tripservice.waiting_time_start_after_minute;
                                                                        if (total_distance <= base_price_distance) {
                                                                            distance_cost = 0;
                                                                        } else {
                                                                            distance_cost = Number(((total_distance - base_price_distance) * price_per_unit_distance).toFixed(2));
                                                                        }

                                                                        trip.distance_cost = distance_cost;
                                                                        // TIME CALCULATIONS
                                                                        if (total_time > base_price_time) {
                                                                            time_cost = (total_time - base_price_time) * price_for_total_time;
                                                                        }
                                                                        time_cost = Number((time_cost).toFixed(2));
                                                                        trip.time_cost = time_cost;

                                                                        total_waiting_time = total_waiting_time - waiting_time_start_after_minute;
                                                                        trip.waiting_time_cost = 0;

                                                                        trip.total_waiting_time = total_waiting_time;


                                                                        total_service_fees = +base_price + +distance_cost + +time_cost + +waiting_time_cost;
                                                                        trip.total_service_fees = total_service_fees;
                                                                        if (is_surge_hours == constant_json.YES) {
                                                                            surge_fee = Number((total_service_fees * (surge_multiplier - 1)).toFixed(2));
                                                                            trip.surge_fee = surge_fee;
                                                                            total_after_surge_fees = total_service_fees + surge_fee;
                                                                            total_after_surge_fees = Number((total_after_surge_fees).toFixed(2));
                                                                        } else {
                                                                            surge_fee = 0;
                                                                            trip.surge_fee = surge_fee;
                                                                            total_after_surge_fees = total_service_fees;
                                                                            total_after_surge_fees = Number((total_after_surge_fees).toFixed(2));
                                                                        }

                                                                        tax_fee = Number((tax * 0.01 * total_after_surge_fees).toFixed(2));
                                                                        trip.tax_fee = tax_fee;
                                                                        total_after_tax_fees = +total_after_surge_fees + +tax_fee;
                                                                        if (total_after_tax_fees < min_fare) {
                                                                            total_after_tax_fees = min_fare;
                                                                            is_min_fare_used = 1;

                                                                            total_after_surge_fees = utils.get_reverse_service_fee(min_fare, tax)

                                                                            tax_fee = Number((tax * 0.01 * total_after_surge_fees).toFixed(2));
                                                                            trip.tax_fee = tax_fee;
                                                                            total_after_tax_fees = +total_after_surge_fees + +tax_fee;
                                                                        }
                                                                        trip.is_min_fare_used = is_min_fare_used;

                                                                        user_tax_fee = Number((user_tax * 0.01 * total_after_surge_fees).toFixed(2));
                                                                        trip.user_tax_fee = user_tax_fee;
                                                                        trip.user_miscellaneous_fee = user_miscellaneous_fee; 
                                                                    } else {

                                                                        // surge_multiplier = tripservice.surge_multiplier;
                                                                        if(trip.surge_multiplier){
                                                                            surge_multiplier = trip.surge_multiplier;
                                                                        }
                                                                        min_fare = tripservice.min_fare;
                                                                        base_price = tripservice.base_price;
                                                                        base_price_distance = tripservice.base_price_distance;
                                                                        tax = tripservice.tax;
                                                                        user_miscellaneous_fee = tripservice.user_miscellaneous_fee;
                                                                        user_tax = tripservice.user_tax;

                                                                        price_per_unit_distance = tripservice.price_per_unit_distance;
                                                                        price_for_total_time = tripservice.price_for_total_time;
                                                                        price_for_waiting_time = tripservice.price_for_waiting_time;
                                                                        waiting_time_start_after_minute = tripservice.waiting_time_start_after_minute;

                                                                        if (total_distance <= base_price_distance) {
                                                                            distance_cost = 0;
                                                                        } else {
                                                                            distance_cost = Number(((total_distance - base_price_distance) * price_per_unit_distance).toFixed(2));
                                                                        }
                                                                        trip.distance_cost = distance_cost;
                                                                        // TIME CALCULATIONS
                                                                        if (time_cost < 0) {
                                                                            time_cost = 0;
                                                                        }
                                                                        time_cost = total_time * price_for_total_time;
                                                                        time_cost = Number((time_cost).toFixed(2));
                                                                        trip.time_cost = time_cost;
                                                                        //  WAITING TIME CALCULATIONS
                                                                        total_waiting_time = total_waiting_time - waiting_time_start_after_minute;
                                                                        if (total_waiting_time < 0) {
                                                                            total_waiting_time = 0;
                                                                        }

                                                                        if (total_waiting_time > 0) {

                                                                            waiting_time_cost = Number((total_waiting_time * price_for_waiting_time).toFixed(2));
                                                                        }


                                                                        trip.waiting_time_cost = waiting_time_cost;
                                                                        trip.total_waiting_time = total_waiting_time;


                                                                        total_service_fees = +base_price + +distance_cost + +time_cost + +waiting_time_cost;
                                                                        trip.total_service_fees = total_service_fees;
                                                                        
                                                                        if (is_surge_hours == constant_json.YES) {
                                                                            surge_fee = Number((total_service_fees * (surge_multiplier - 1)).toFixed(2));
                                                                            trip.surge_fee = surge_fee;
                                                                            total_after_surge_fees = total_service_fees + surge_fee;
                                                                            total_after_surge_fees = Number((total_after_surge_fees).toFixed(2));
                                                                        } else {
                                                                            surge_fee = 0;
                                                                            trip.surge_fee = surge_fee;
                                                                            total_after_surge_fees = total_service_fees;
                                                                            total_after_surge_fees = Number((total_after_surge_fees).toFixed(2));
                                                                        }

                                                                        tax_fee = Number((tax * 0.01 * total_after_surge_fees).toFixed(2));
                                                                        trip.tax_fee = tax_fee;
                                                                        total_after_tax_fees = +total_after_surge_fees + +tax_fee;

                                                                        if (total_after_tax_fees < min_fare) {
                                                                            total_after_tax_fees = min_fare;
                                                                            is_min_fare_used = 1;

                                                                            total_after_surge_fees = utils.get_reverse_service_fee(min_fare, tax)
                                                                            
                                                                            tax_fee = Number((tax * 0.01 * total_after_surge_fees).toFixed(2));
                                                                            trip.tax_fee = tax_fee;
                                                                            total_after_tax_fees = +total_after_surge_fees + +tax_fee;
                                                                        }
                                                                        trip.is_min_fare_used = is_min_fare_used;

                                                                        user_tax_fee = Number((user_tax * 0.01 * total_after_surge_fees).toFixed(2));
                                                                        trip.user_tax_fee = user_tax_fee;
                                                                        trip.user_miscellaneous_fee = user_miscellaneous_fee; 
                                                                    }
                                                                    trip.total_after_tax_fees = total_after_tax_fees;
                                                                    trip.total_after_surge_fees = total_after_surge_fees;

                                                                    ///////////////////////// FOR INVOICE //////////////////////////
                                                                    var current_rate = 1;
                                                                    var countryCurrencyCode = trip.currencycode;
                                                                    var adminCurrencyCode = trip.currencycode;
                                                                    var adminCurrency = trip.currency;

                                                                    adminCurrencyCode = setting_detail.adminCurrencyCode;
                                                                    adminCurrency = setting_detail.adminCurrency;

                                                                    utils.getCurrencyConvertRate(1, countryCurrencyCode, adminCurrencyCode, function (response) {

                                                                        if (response.success) {
                                                                            current_rate = response.current_rate;
                                                                        } else {
                                                                            current_rate = 1;
                                                                        }

                                                                        trip.current_rate = current_rate;

                                                                        Promo_Code.findOne({_id: trip.promo_id}).then((promocode) => {
                                                                            
                                                                            total_after_user_tax_fees = +total_after_tax_fees + +user_miscellaneous_fee + +user_tax_fee;

                                                                            if (trip.promo_id != null && promocode) {
                                                                                var promo_type = promocode.code_type;
                                                                                promo_value = promocode.code_value;
                                                                                if (promo_type == 1) { ///abs
                                                                                    promo_payment = promo_value;
                                                                                } else { // perc
                                                                                    promo_payment = Number((promo_value * 0.01 * total_after_user_tax_fees).toFixed(2));
                                                                                }


                                                                                total_after_promo_payment = total_after_user_tax_fees - promo_payment;


                                                                                if (total_after_promo_payment < 0) {
                                                                                    total_after_promo_payment = 0;
                                                                                    promo_payment = total_after_user_tax_fees;
                                                                                }


                                                                                User_promo_use.findOne({trip_id: trip._id}, function (err, userpromouse) {
                                                                                    userpromouse.user_used_amount = promo_payment;
                                                                                    userpromouse.user_used_amount_in_admin_currency = promo_payment * current_rate;
                                                                                    userpromouse.save();
                                                                                });
                                                                            } else {
                                                                                promo_payment = 0;
                                                                                total_after_promo_payment = total_after_user_tax_fees;
                                                                            }


                                                                            total_after_promo_payment = Number((total_after_promo_payment).toFixed(2));
                                                                            trip.promo_payment = promo_payment;
                                                                            trip.total_after_promo_payment = total_after_promo_payment;

                                                                            trip.total_after_referral_payment = total_after_promo_payment;
                                                                            ////////ENTRY IN PROVIDER EARNING TABLE ///////////
                                                                            var service_total_in_admin_currency = Number((total_after_user_tax_fees * current_rate).toFixed(3));

                                                                            var provider_profit_fees = Number((total_after_tax_fees * provider_profit * 0.01).toFixed(2));


                                                                            provider_tax_fee = Number((provider_tax * 0.01 * provider_profit_fees).toFixed(2));
                                                                            trip.provider_miscellaneous_fee = provider_miscellaneous_fee;
                                                                            trip.provider_tax_fee = provider_tax_fee;
                                                                            provider_service_fees = +provider_profit_fees + +toll_amount - provider_miscellaneous_fee - provider_tax_fee;

                                                                            var provider_service_fees_in_admin_currency = Number((provider_service_fees * current_rate).toFixed(3));

                                                                            var promo_referral_amount = promo_payment;
                                                                            total = total_after_promo_payment;

                                                                            total = +total + +toll_amount;
                                                                            total = Number((total).toFixed(2));
                                                                            var total_in_admin_currency = Number((total * current_rate).toFixed(3));
                                                                            trip.total_after_user_tax_fees = total_after_user_tax_fees
                                                                            trip.base_distance_cost = base_price;
                                                                            trip.admin_currency = adminCurrency;
                                                                            trip.admin_currencycode = adminCurrencyCode;
                                                                            trip.provider_service_fees = provider_service_fees;
                                                                            trip.provider_profit_fees = provider_profit_fees;
                                                                            trip.total_in_admin_currency = total_in_admin_currency;
                                                                            trip.service_total_in_admin_currency = service_total_in_admin_currency;
                                                                            trip.provider_service_fees_in_admin_currency = provider_service_fees_in_admin_currency;
                                                                            trip.promo_referral_amount = promo_referral_amount;
                                                                            trip.toll_amount = toll_amount;
                                                                            trip.total = total;

                                                                            var wallet_currency_code = user.wallet_currency_code;
                                                                            if (wallet_currency_code == "" || !wallet_currency_code) {
                                                                                wallet_currency_code = setting_detail.adminCurrencyCode;
                                                                            }
                                                                            utils.getCurrencyConvertRate(1, wallet_currency_code, countryCurrencyCode, function (response) {
                                                                                var wallet_current_rate = 1;
                                                                                if (response.success) {
                                                                                    wallet_current_rate = response.current_rate;
                                                                                }

                                                                                trip.wallet_current_rate = wallet_current_rate;

                                                                                trip.save().then(() => {
                                                                                    if (trip.is_tip == true) {
                                                                                        // utils.sendPushNotification(constant_json.USER_UNIQUE_NUMBER, device_type, device_token, push_messages.PUSH_CODE_FOR_WAITING_FOR_TIP, constant_json.PUSH_NOTIFICATION_SOUND_FILE_IN_IOS);
                                                                                    }
                                                                                    myAnalytics.insert_daily_provider_analytics(city_timezone, provider._id, TRIP_STATUS.TRIP_COMPLETED, null);
                                                                                    utils.update_request_status_socket(trip._id);
                                                                                    res.json({
                                                                                        success: true,
                                                                                        message: success_messages.MESSAGE_CODE_FOR_PROVIDER_YOUR_TRIP_COMPLETED_SUCCESSFULLY,
                                                                                        trip: trip,
                                                                                        tripservice: tripservice
                                                                                    });

                                                                                }, (err) => {
                                                                                    console.log(err);
                                                                                    res.json({
                                                                                        success: false,
                                                                                        error_code: error_message.ERROR_CODE_SOMETHING_WENT_WRONG
                                                                                    });
                                                                                });
                                                                            });

                                                                        });

                                                                    });
                                                                });
                                                            });
                                                        });
                                                    });
                                                });
                                            });
                                        });
                                    });
                                } else {
                                    utils.update_request_status_socket(trip._id);
                                    res.json({
                                        success: true,
                                        message: success_messages.ERROR_CODE_TRIP_IS_ALREADY_CANCELLED
                                    });
                                }

                            } else {
                                res.json({success: false, error_code: error_message.ERROR_CODE_NO_TRIP_FOUND});
                            }
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
            }, (err) => {
                console.log(err);
                res.json({
                    success: false,
                    error_code: error_message.ERROR_CODE_SOMETHING_WENT_WRONG
                });
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

exports.pay_payment = function (req, res, next) {

            var trip_id = "";
            if (res == null) {
                trip_id = next;
            } else {
                trip_id = req.body.trip_id;
            }

            Trip.findOne({_id: trip_id, is_trip_end: 0}).then((trip) => {
                if (trip) {
                    City.findOne({_id: trip.city_id}).then((city) => {
                        var is_provider_earning_set_in_wallet_on_other_payment = false;
                        var is_provider_earning_set_in_wallet_on_cash_payment = false;
                        if (city) {
                            is_provider_earning_set_in_wallet_on_other_payment = city.is_provider_earning_set_in_wallet_on_other_payment;
                            is_provider_earning_set_in_wallet_on_cash_payment = city.is_provider_earning_set_in_wallet_on_cash_payment;
                        }

                        var tip_amount;
                        var payment_id;

                        if (res == null) {
                            tip_amount = 0;
                            payment_id = trip.payment_id;
                        } else {
                            tip_amount = Number(req.body.tip_amount);
                            tip_amount = (tip_amount).toFixed(2);
                            payment_id = req.body.payment_id;
                        }

                        var payment_mode = trip.payment_mode;
                        var is_user_need_save = false; // to avoid can't save() the same doc multiple times in parallel.

                        Provider.findOne({_id: trip.confirmed_provider}).then((provider) => {
                            var provider_device_token = provider.device_token;
                            var provider_device_type = provider.device_type;

                            User.findOne({_id: trip.user_id}).then((user) => {
                                var device_token = user.device_token;
                                var device_type = user.device_type;

                                Corporate.findOne({_id: trip.user_type_id}).then((corporate) => {

                                    var countryCurrencyCode = trip.currencycode;

                                        trip.is_trip_end = 1;
                                        if (trip.user_type == Number(constant_json.USER_TYPE_DISPATCHER) || trip.user_type == Number(constant_json.USER_TYPE_HOTEL) || trip.user_type == Number(constant_json.USER_TYPE_PROVIDER)) {
                                            trip.is_user_invoice_show = 1;
                                            user.current_trip_id = null;
                                            is_user_need_save = true;
                                        }

                                        var total = +trip.total + +tip_amount;
                                        total = Number((total).toFixed(2));
                                        trip.total = total;


                                        var wallet_amount = Number((Math.max(user.wallet, 0)).toFixed(2) * trip.wallet_current_rate);
                                        var is_use_wallet = user.is_use_wallet;
                                        if(trip.trip_type == constant_json.TRIP_TYPE_CORPORATE  && corporate){
                                            wallet_amount = Number((Math.max(corporate.wallet, 0)).toFixed(2) * trip.wallet_current_rate);
                                            is_use_wallet = 1;
                                        }
                                        var wallet_payment = 0;
                                        var remaining_payment = 0;
                                        var total_after_wallet_payment = total;
                                        if (wallet_amount > 0 && total_after_wallet_payment > 0 && is_use_wallet == constant_json.YES) {
                                            if (wallet_amount > total_after_wallet_payment) {
                                                wallet_payment = total_after_wallet_payment;
                                            } else {
                                                wallet_payment = wallet_amount;
                                            }
                                            if(trip.trip_type == constant_json.TRIP_TYPE_CORPORATE && corporate){
                                                var total_wallet_amount = utils.addWalletHistory(constant_json.USER_UNIQUE_NUMBER, corporate.unique_id, corporate._id, null,
                                                    corporate.wallet_currency_code, trip.currencycode,
                                                    trip.wallet_current_rate, wallet_payment, corporate.wallet, constant_json.DEDUCT_WALLET_AMOUNT, constant_json.PAID_TRIP_AMOUNT, "Charge Of This Trip : " + trip.unique_id);
                                                corporate.wallet = total_wallet_amount;
                                                corporate.save();
                                                user.corporate_wallet_limit = user.corporate_wallet_limit - wallet_payment;
                                                is_user_need_save = true;
                                            } else {
                                                var total_wallet_amount = utils.addWalletHistory(constant_json.USER_UNIQUE_NUMBER, user.unique_id, user._id, null,
                                                    user.wallet_currency_code, trip.currencycode,
                                                    trip.wallet_current_rate, wallet_payment, user.wallet, constant_json.DEDUCT_WALLET_AMOUNT, constant_json.PAID_TRIP_AMOUNT, "Charge Of This Trip : " + trip.unique_id);
                                                user.wallet = total_wallet_amount;
                                                is_user_need_save = true;
                                            }

                                            total_after_wallet_payment = total_after_wallet_payment - wallet_payment;
                                        } else {
                                            wallet_payment = 0;
                                        }
                                        
                                        if (is_user_need_save) {
                                            user.save();
                                        }

                                        total_after_wallet_payment = Number((total_after_wallet_payment).toFixed(2));
                                        wallet_payment = Number((wallet_payment).toFixed(2));
                                        remaining_payment = total - wallet_payment;
                                        remaining_payment = Number((remaining_payment).toFixed(2));
                                        trip.wallet_payment = wallet_payment;
                                        trip.total_after_wallet_payment = total_after_wallet_payment;
                                        trip.remaining_payment = remaining_payment;
                                        trip.payment_status = PAYMENT_STATUS.COMPLETED;

                                        trip.provider_service_fees = +trip.provider_service_fees + +tip_amount;
                                        trip.total_in_admin_currency = trip.total * trip.current_rate;
                                        trip.provider_service_fees_in_admin_currency = trip.provider_service_fees * trip.current_rate;
                                        trip.tip_amount = tip_amount;
                                        if (payment_mode == Number(constant_json.PAYMENT_MODE_CASH)) {
                                            trip.provider_have_cash = remaining_payment;
                                        }
                                        trip.pay_to_provider = trip.provider_service_fees - trip.provider_have_cash;


                                        var complete_date_in_city_timezone = utils.get_date_now_at_city(new Date(), trip.timezone);
                                        var complete_date_tag = moment(moment(complete_date_in_city_timezone).startOf('day')).format(constant_json.DATE_FORMAT_MMM_D_YYYY);
                                        trip.complete_date_in_city_timezone = complete_date_in_city_timezone;
                                        trip.complete_date_tag = complete_date_tag;

                                        var total_wallet_amount = 0;
                                        if (payment_mode == Number(constant_json.PAYMENT_MODE_CASH) && is_provider_earning_set_in_wallet_on_cash_payment) {
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
                                                provider.save();
                                            } else {
                                                Partner.findOne({_id: trip.provider_type_id}).then((partner) => {
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
                                                    partner.save();
                                                });
                                            }

                                            trip.is_provider_earning_set_in_wallet = true;
                                            trip.provider_income_set_in_wallet = Math.abs(trip.pay_to_provider);
                                        }


                                        // End 6 March //

                                        if (payment_mode == constant_json.PAYMENT_MODE_CASH) {
                                            cash_payment = remaining_payment;
                                            trip.is_paid = 1;
                                            trip.is_pending_payments = 0;
                                            trip.cash_payment = cash_payment;
                                            trip.remaining_payment = 0;
                                            trip.save().then(() => {
                                                utils.update_request_status_socket(trip._id);
                                                var email_notification = setting_detail.email_notification;
                                                if (email_notification == true) {
                                                }

                                                if (trip.is_tip == true) {
                                                    if (res == null) {

                                                        utils.sendPushNotification(constant_json.PROVIDER_UNIQUE_NUMBER, provider_device_type, provider_device_token, push_messages.PUSH_CODE_FOR_PROVIDER_TRIP_END, constant_json.PUSH_NOTIFICATION_SOUND_FILE_IN_IOS);
                                                        utils.sendPushNotification(constant_json.USER_UNIQUE_NUMBER, device_type, device_token, push_messages.PUSH_CODE_FOR_YOUR_TRIP_END, constant_json.PUSH_NOTIFICATION_SOUND_FILE_IN_IOS);

                                                    } else {

                                                        utils.sendPushNotification(constant_json.PROVIDER_UNIQUE_NUMBER, provider_device_type, provider_device_token, push_messages.PUSH_CODE_FOR_PROVIDER_TRIP_END, constant_json.PUSH_NOTIFICATION_SOUND_FILE_IN_IOS);
                                                        utils.sendPushNotification(constant_json.USER_UNIQUE_NUMBER, device_type, device_token, push_messages.PUSH_CODE_FOR_YOUR_TRIP_END, constant_json.PUSH_NOTIFICATION_SOUND_FILE_IN_IOS);
                                                        
                                                        if (trip.payment_status == PAYMENT_STATUS.COMPLETED) {
                                                            Trip.findOneAndRemove({ _id: trip._id }).then((deleted_trip) => {
                                                                if (deleted_trip) {
                                                                    var trip_history_data = new Trip_history(JSON.parse(JSON.stringify(deleted_trip)));
                                                                    trip_history_data.save(function () {
                                                                        res.json({
                                                                            success: true,
                                                                            message: success_messages.MESSAGE_CODE_FOR_PROVIDER_YOUR_TRIP_COMPLETED_SUCCESSFULLY,
                                                                            payment_status: trip.payment_status
                                                                        });
                                                                    });
                                                                } else {
                                                                    res.json({
                                                                        success: true,
                                                                        message: success_messages.MESSAGE_CODE_FOR_PROVIDER_YOUR_TRIP_COMPLETED_SUCCESSFULLY,
                                                                        payment_status: trip.payment_status
                                                                    });
                                                                }
                                                            });
                                                        } else {
                                                            res.json({
                                                                success: true,
                                                                message: success_messages.MESSAGE_CODE_FOR_PROVIDER_YOUR_TRIP_COMPLETED_SUCCESSFULLY,
                                                                payment_status: trip.payment_status
                                                            });
                                                        }
                                                    }

                                                } else {
                                                    if (res != null) {
                                                        if (req.body.provider_id != undefined) {

                                                            if (trip.payment_status == PAYMENT_STATUS.COMPLETED) {
                                                                Trip.findOneAndRemove({ _id: trip._id }).then((deleted_trip) => {
                                                                    if (deleted_trip) {
                                                                        var trip_history_data = new Trip_history(JSON.parse(JSON.stringify(deleted_trip)));
                                                                        trip_history_data.save(function () {
                                                                            res.json({
                                                                                success: true,
                                                                                message: success_messages.MESSAGE_CODE_FOR_PROVIDER_YOUR_TRIP_COMPLETED_SUCCESSFULLY,
                                                                                payment_status: trip.payment_status
                                                                            });
                                                                        });
                                                                    } else {
                                                                        res.json({
                                                                            success: true,
                                                                            message: success_messages.MESSAGE_CODE_FOR_PROVIDER_YOUR_TRIP_COMPLETED_SUCCESSFULLY,
                                                                            payment_status: trip.payment_status
                                                                        });
                                                                    }
                                                                });
                                                            }else{
                                                                res.json({
                                                                    success: true,
                                                                    message: success_messages.MESSAGE_CODE_FOR_PROVIDER_YOUR_TRIP_COMPLETED_SUCCESSFULLY,
                                                                    payment_status: trip.payment_status
                                                                });
                                                            }
                                                            utils.sendPushNotification(constant_json.USER_UNIQUE_NUMBER, device_type, device_token, push_messages.PUSH_CODE_FOR_YOUR_TRIP_END, constant_json.PUSH_NOTIFICATION_SOUND_FILE_IN_IOS);
                                                        } else {
                                                            res.json({
                                                                success: false,
                                                                error_code: error_message.ERROR_CODE_PAY_PAYMENT_FAILED
                                                            });
                                                        }
                                                    }
                                                }

                                            });
                                        } else if(payment_mode == constant_json.PAYMENT_MODE_APPLE_PAY){
                                            if (remaining_payment > 0) {
                                                trip.is_paid = 0;
                                                trip.remaining_payment = remaining_payment;
                                                trip.payment_status = PAYMENT_STATUS.FAILED;
                                                var email_notification = setting_detail.email_notification;
                                                if (email_notification == true) {
                                                }
                                                trip.save().then(() => {
                                                    utils.update_request_status_socket(trip._id);
                                                    trip.payment_status = PAYMENT_STATUS.FAILED;
                                                    res.json({
                                                        success: true,
                                                        message: success_messages.MESSAGE_CODE_FOR_PROVIDER_YOUR_TRIP_COMPLETED_SUCCESSFULLY,
                                                        payment_status: trip.payment_status,
                                                    });
                                                    utils.sendPushNotification(constant_json.USER_UNIQUE_NUMBER, device_type, device_token, push_messages.PUSH_CODE_FOR_YOUR_TRIP_END, constant_json.PUSH_NOTIFICATION_SOUND_FILE_IN_IOS);
                                                });
                                            } else {
                                                trip.is_paid = 1;
                                                trip.is_pending_payments = 0;
                                                trip.payment_status = PAYMENT_STATUS.COMPLETED;
                                                trip.card_payment = 0;
                                                trip.save().then(() => {
                                                    utils.update_request_status_socket(trip._id);
                                                    var email_notification = setting_detail.email_notification;
                                                    if (email_notification == true) {
                                                    }
                                                    if (trip.is_tip == true) {
                                                        if (req.body.user_id == undefined && req.body.token == undefined) {
                                                            utils.sendPushNotification(constant_json.PROVIDER_UNIQUE_NUMBER, provider_device_type, provider_device_token, push_messages.PUSH_CODE_FOR_PROVIDER_TRIP_END, constant_json.PUSH_NOTIFICATION_SOUND_FILE_IN_IOS);
                                                            utils.sendPushNotification(constant_json.USER_UNIQUE_NUMBER, device_type, device_token, push_messages.PUSH_CODE_FOR_YOUR_TRIP_END, constant_json.PUSH_NOTIFICATION_SOUND_FILE_IN_IOS);

                                                        } else {
                                                            utils.sendPushNotification(constant_json.PROVIDER_UNIQUE_NUMBER, provider_device_type, provider_device_token, push_messages.PUSH_CODE_FOR_PROVIDER_TRIP_END, constant_json.PUSH_NOTIFICATION_SOUND_FILE_IN_IOS);
                                                            res.json({
                                                                success: true,
                                                                message: success_messages.MESSAGE_CODE_FOR_PROVIDER_YOUR_TRIP_COMPLETED_SUCCESSFULLY,
                                                                payment_status: trip.payment_status
                                                            });
                                                        }

                                                    } else {
                                                        if (req.body.provider_id != undefined) {
                                                            res.json({
                                                                success: true,
                                                                message: success_messages.MESSAGE_CODE_FOR_PROVIDER_YOUR_TRIP_COMPLETED_SUCCESSFULLY,
                                                                payment_status: trip.payment_status
                                                            });
                                                            utils.sendPushNotification(constant_json.USER_UNIQUE_NUMBER, device_type, device_token, push_messages.PUSH_CODE_FOR_YOUR_TRIP_END, constant_json.PUSH_NOTIFICATION_SOUND_FILE_IN_IOS);
                                                        } else {
                                                            res.json({
                                                                success: false,
                                                                error_code: error_message.ERROR_CODE_PAY_PAYMENT_FAILED
                                                            });
                                                        }
                                                    }
                                                }, (err) => {
                                                    console.log(err);
                                                    res.json({
                                                        success: false,
                                                        error_code: error_message.ERROR_CODE_SOMETHING_WENT_WRONG
                                                    });
                                                });
                                            }
                                        } else {

                                            if (remaining_payment > 0) {
                                                var user_id = trip.user_id;
                                                var email = user.email;
                                                var customer_id = user.customer_id;
                                                if(trip.trip_type == constant_json.TRIP_TYPE_CORPORATE && corporate){
                                                    user_id = trip.user_type_id;
                                                    customer_id = corporate.customer_id;
                                                    email = corporate.email;
                                                }
                                                trip.is_paid = 0;
                                                trip.remaining_payment = remaining_payment;
                                                trip.payment_status = PAYMENT_STATUS.WAITING;
                                                var email_notification = setting_detail.email_notification;
                                                if (email_notification == true) {
                                                }

                                                    Card.findOne({user_id: user_id, payment_gateway_type: trip.payment_gateway_type, is_default: true}, function(error, card_detail){

                                                        if(card_detail){

                                                            if (countryCurrencyCode == "" || !countryCurrencyCode) {
                                                                countryCurrencyCode = setting_detail.adminCurrencyCode;
                                                            }
                                                            if(trip.payment_gateway_type == PAYMENT_GATEWAY.stripe){
                                                                var stripe_secret_key = setting_detail.stripe_secret_key;
                                                            
                                                                var stripe = require("stripe")(stripe_secret_key);
                                                                stripe.paymentIntents.create({
                                                                    amount: Math.round((remaining_payment * 100)),
                                                                    currency: countryCurrencyCode,
                                                                    customer: customer_id,
                                                                    payment_method: card_detail.payment_method
                                                                }, function(error, paymentIntent){
                                                                    if(paymentIntent){
                                                                        trip.payment_intent_id = paymentIntent.id;
                                                                            trip.save().then(() => {
                                                                                utils.update_request_status_socket(trip._id);
                                                                            res.json({
                                                                                success: true,
                                                                                message: success_messages.MESSAGE_CODE_FOR_PROVIDER_YOUR_TRIP_COMPLETED_SUCCESSFULLY,
                                                                                payment_status: trip.payment_status,
                                                                                payment_method: card_detail.payment_method, 
                                                                                client_secret: paymentIntent.client_secret
                                                                            });
                                                                            utils.sendPushNotification(constant_json.USER_UNIQUE_NUMBER, device_type, device_token, push_messages.PUSH_CODE_FOR_YOUR_TRIP_END, constant_json.PUSH_NOTIFICATION_SOUND_FILE_IN_IOS);
                                                                        });
                                                                    } else {
                                                                        utils.trip_payment_failed(trip, city, provider);
                                                                        trip.payment_status = PAYMENT_STATUS.FAILED;
                                                                        trip.save().then(() => {
                                                                            utils.update_request_status_socket(trip._id);
                                                                            res.json({
                                                                                success: true,
                                                                                error: error.raw.message,
                                                                                message: success_messages.MESSAGE_CODE_FOR_PROVIDER_YOUR_TRIP_COMPLETED_SUCCESSFULLY,
                                                                                payment_status: trip.payment_status,
                                                                            });
                                                                            utils.sendPushNotification(constant_json.USER_UNIQUE_NUMBER, device_type, device_token, push_messages.PUSH_CODE_FOR_YOUR_TRIP_END, constant_json.PUSH_NOTIFICATION_SOUND_FILE_IN_IOS);
                                                                        });
                                                                    }
                                                                });
                                                            } else {
                                                                const params = JSON.stringify({
                                                                    "email": email,
                                                                    "amount": Math.round((remaining_payment * 100)),
                                                                    // currency : wallet_currency_code,
                                                                    authorization_code: card_detail.payment_method
                                                                });
                                                                const options = {
                                                                  hostname: 'api.paystack.co',
                                                                  port: 443,
                                                                  path: '/charge',
                                                                  method: 'POST',
                                                                  headers: {
                                                                    Authorization: 'Bearer '+setting_detail.paystack_secret_key,
                                                                    'Content-Type': 'application/json'
                                                                  }
                                                                }
                                                                const request = https.request(options, res_data => {
                                                                    let data = ''
                                                                    res_data.on('data', (chunk) => {
                                                                        data += chunk
                                                                    });
                                                                    res_data.on('end', () => {
                                                                        var payment_response = JSON.parse(data);
                                                                        if(payment_response.status){
                                                                            trip.payment_intent_id = payment_response.reference;
                                                                            trip.save().then(async () => {
                                                                                trip.payment_intent_id = payment_response.data.reference;
                                                                                if(payment_response.data.status == 'success'){

                                                                                    trip.is_paid = 1;
                                                                                    trip.is_pending_payments = 0;
                                                                                    trip.card_payment = 0;
                                                                                    trip.payment_status = PAYMENT_STATUS.COMPLETED;
                                                                                    trip.remaining_payment = 0;
                                                                                    trip.card_payment = payment_response.data.amount / 100;

                                                                                    // start provider profit after card payment done
                                                                                    await utils.trip_provider_profit_card_wallet_settlement(trip);
                                                                                    // end of provider profit after card payment done

                                                                                    trip.save().then(() => {
                                                                                        utils.update_request_status_socket(trip._id);
                                                                                        utils.sendPushNotification(constant_json.USER_UNIQUE_NUMBER, device_type, device_token, push_messages.PUSH_CODE_FOR_YOUR_TRIP_END, constant_json.PUSH_NOTIFICATION_SOUND_FILE_IN_IOS);
                                                                                        Trip.findOneAndRemove({ _id: trip._id }).then((deleted_trip) => {
                                                                                            if (deleted_trip) {
                                                                                                var trip_history_data = new Trip_history(JSON.parse(JSON.stringify(deleted_trip)));
                                                                                                trip_history_data.save(function () {
                                                                                                    res.json({
                                                                                                        success: true,
                                                                                                        message: success_messages.MESSAGE_CODE_FOR_PROVIDER_YOUR_TRIP_COMPLETED_SUCCESSFULLY,
                                                                                                        payment_status: trip.payment_status
                                                                                                    });
                                                                                                });
                                                                                            } else {
                                                                                                res.json({
                                                                                                    success: true,
                                                                                                    message: success_messages.MESSAGE_CODE_FOR_PROVIDER_YOUR_TRIP_COMPLETED_SUCCESSFULLY,
                                                                                                    payment_status: trip.payment_status
                                                                                                });
                                                                                            }
                                                                                        });
                                                                                    }, (err) => {
                                                                                        console.log(err);
                                                                                        res.json({
                                                                                            success: false,
                                                                                            error_code: error_message.ERROR_CODE_SOMETHING_WENT_WRONG
                                                                                        });
                                                                                    });


                                                                                } else if(payment_response.data.status == 'open_url'){
                                                                                    trip.payment_status = PAYMENT_STATUS.FAILED;
                                                                                    utils.update_request_status_socket(trip._id);
                                                                                    trip.save().then(() => {
                                                                                        utils.update_request_status_socket(trip._id);
                                                                                        var json_response = {success: false, url: payment_response.data.url}
                                                                                        res.json(json_response)
                                                                                        utils.sendPushNotification(constant_json.USER_UNIQUE_NUMBER, device_type, device_token, push_messages.PUSH_CODE_FOR_YOUR_TRIP_END, constant_json.PUSH_NOTIFICATION_SOUND_FILE_IN_IOS);
                                                                                    });
                                                                                } else {
                                                                                    utils.trip_payment_failed(trip, city, provider);
                                                                                    trip.payment_status = PAYMENT_STATUS.FAILED;
                                                                                    utils.update_request_status_socket(trip._id);
                                                                                    trip.save().then(() => {
                                                                                        utils.update_request_status_socket(trip._id);
                                                                                        var json_response = {success: false, reference: payment_response.data.reference, required_param: payment_response.data.status}
                                                                                        console.log(json_response)
                                                                                        res.json(json_response)
                                                                                        utils.sendPushNotification(constant_json.USER_UNIQUE_NUMBER, device_type, device_token, push_messages.PUSH_CODE_FOR_YOUR_TRIP_END, constant_json.PUSH_NOTIFICATION_SOUND_FILE_IN_IOS);
                                                                                    });
                                                                                }                                                                                
                                                                            });

                                                                        } else {
                                                                            var error_message = '';
                                                                            if(payment_response.data){
                                                                                error_message = payment_response.data.message;
                                                                            } else {
                                                                                error_message = payment_response.message;
                                                                            }
                                                                            trip.payment_status = PAYMENT_STATUS.FAILED;
                                                                            trip.save().then(() => {
                                                                                utils.update_request_status_socket(trip._id);
                                                                                res.json({
                                                                                    success: true,
                                                                                    error: error_message,
                                                                                    message: success_messages.MESSAGE_CODE_FOR_PROVIDER_YOUR_TRIP_COMPLETED_SUCCESSFULLY,
                                                                                    payment_status: trip.payment_status,
                                                                                });
                                                                                utils.sendPushNotification(constant_json.USER_UNIQUE_NUMBER, device_type, device_token, push_messages.PUSH_CODE_FOR_YOUR_TRIP_END, constant_json.PUSH_NOTIFICATION_SOUND_FILE_IN_IOS);
                                                                            });
                                                                        }
                                                                    })
                                                                }).on('error', error => {
                                                                  console.error(error)
                                                                })
                                                                request.write(params)
                                                                request.end()
                                                            }
                                                        } else {
                                                            trip.payment_status = PAYMENT_STATUS.FAILED;
                                                            trip.save().then(() => {
                                                                utils.update_request_status_socket(trip._id);
                                                                res.json({
                                                                    success: true,
                                                                    message: success_messages.MESSAGE_CODE_FOR_PROVIDER_YOUR_TRIP_COMPLETED_SUCCESSFULLY,
                                                                    payment_status: trip.payment_status,
                                                                });
                                                                utils.sendPushNotification(constant_json.USER_UNIQUE_NUMBER, device_type, device_token, push_messages.PUSH_CODE_FOR_YOUR_TRIP_END, constant_json.PUSH_NOTIFICATION_SOUND_FILE_IN_IOS);
                                                            });
                                                        }
                                                    });
                                            } else {
                                                trip.is_paid = 1;
                                                trip.is_pending_payments = 0;
                                                trip.card_payment = 0;
                                                trip.save().then(() => {
                                                    utils.update_request_status_socket(trip._id);
                                                    var email_notification = setting_detail.email_notification;
                                                    if (email_notification == true) {
                                                    }
                                                    if (trip.is_tip == true) {
                                                        if (req.body.user_id == undefined && req.body.token == undefined) {
                                                            utils.sendPushNotification(constant_json.PROVIDER_UNIQUE_NUMBER, provider_device_type, provider_device_token, push_messages.PUSH_CODE_FOR_PROVIDER_TRIP_END, constant_json.PUSH_NOTIFICATION_SOUND_FILE_IN_IOS);
                                                            utils.sendPushNotification(constant_json.USER_UNIQUE_NUMBER, device_type, device_token, push_messages.PUSH_CODE_FOR_YOUR_TRIP_END, constant_json.PUSH_NOTIFICATION_SOUND_FILE_IN_IOS);

                                                        } else {
                                                            utils.sendPushNotification(constant_json.PROVIDER_UNIQUE_NUMBER, provider_device_type, provider_device_token, push_messages.PUSH_CODE_FOR_PROVIDER_TRIP_END, constant_json.PUSH_NOTIFICATION_SOUND_FILE_IN_IOS);
                                                            if (trip.payment_status == PAYMENT_STATUS.COMPLETED) {
                                                                Trip.findOneAndRemove({ _id: trip._id }).then((deleted_trip) => {
                                                                    if (deleted_trip) {
                                                                        var trip_history_data = new Trip_history(JSON.parse(JSON.stringify(deleted_trip)));
                                                                        trip_history_data.save(function () {
                                                                            res.json({
                                                                                success: true,
                                                                                message: success_messages.MESSAGE_CODE_FOR_PROVIDER_YOUR_TRIP_COMPLETED_SUCCESSFULLY,
                                                                                payment_status: trip.payment_status
                                                                            });
                                                                        });
                                                                    } else {
                                                                        res.json({
                                                                            success: true,
                                                                            message: success_messages.MESSAGE_CODE_FOR_PROVIDER_YOUR_TRIP_COMPLETED_SUCCESSFULLY,
                                                                            payment_status: trip.payment_status
                                                                        });
                                                                    }
                                                                });
                                                            } else {
                                                                res.json({
                                                                    success: true,
                                                                    message: success_messages.MESSAGE_CODE_FOR_PROVIDER_YOUR_TRIP_COMPLETED_SUCCESSFULLY,
                                                                    payment_status: trip.payment_status
                                                                });
                                                            }
                                                        }

                                                    } else {
                                                        if (req.body.provider_id != undefined) {
                                                            if (trip.payment_status == PAYMENT_STATUS.COMPLETED) {
                                                                Trip.findOneAndRemove({ _id: trip._id }).then((deleted_trip) => {
                                                                    if (deleted_trip) {
                                                                        var trip_history_data = new Trip_history(JSON.parse(JSON.stringify(deleted_trip)));
                                                                        trip_history_data.save(function () {
                                                                            res.json({
                                                                                success: true,
                                                                                message: success_messages.MESSAGE_CODE_FOR_PROVIDER_YOUR_TRIP_COMPLETED_SUCCESSFULLY,
                                                                                payment_status: trip.payment_status
                                                                            });
                                                                        });
                                                                    } else {
                                                                        res.json({
                                                                            success: true,
                                                                            message: success_messages.MESSAGE_CODE_FOR_PROVIDER_YOUR_TRIP_COMPLETED_SUCCESSFULLY,
                                                                            payment_status: trip.payment_status
                                                                        });
                                                                    }
                                                                });
                                                            } else {
                                                                res.json({
                                                                    success: true,
                                                                    message: success_messages.MESSAGE_CODE_FOR_PROVIDER_YOUR_TRIP_COMPLETED_SUCCESSFULLY,
                                                                    payment_status: trip.payment_status
                                                                });
                                                            }
                                                            utils.sendPushNotification(constant_json.USER_UNIQUE_NUMBER, device_type, device_token, push_messages.PUSH_CODE_FOR_YOUR_TRIP_END, constant_json.PUSH_NOTIFICATION_SOUND_FILE_IN_IOS);
                                                        } else {
                                                            res.json({
                                                                success: false,
                                                                error_code: error_message.ERROR_CODE_PAY_PAYMENT_FAILED
                                                            });
                                                        }
                                                    }
                                                }, (err) => {
                                                    console.log(err);
                                                    res.json({
                                                        success: false,
                                                        error_code: error_message.ERROR_CODE_SOMETHING_WENT_WRONG
                                                    });
                                                });
                                            }
                                        }
                                }); 
                            });
                        });

                    });

                } else {
                    res.json({success: false, error_code: error_message.ERROR_CODE_TRIP_NOT_FOUND});
                }
            }, (err) => {
                console.log(err);
                res.json({
                    success: false,
                    error_code: error_message.ERROR_CODE_SOMETHING_WENT_WRONG
                });
            }); ///////// end TRIP
};

exports.pay_tip_payment = function (req, res) {
    if(req.body.udf5){
        req.body.trip_id = req.body.udf5;
    }
    Trip.findOne({_id: req.body.trip_id}).then((trip) => {
        Trip_history.findOne({_id: req.body.trip_id, is_trip_end: 1}).then((trip_history) => {
            if(!trip){
                trip = trip_history;
            }
            if (trip) {
                if(!trip.payment_gateway_type || trip.payment_gateway_type== PAYMENT_GATEWAY.stripe){
                    var stripe_secret_key = setting_detail.stripe_secret_key;

                    var stripe = require("stripe")(stripe_secret_key);
                    stripe.paymentIntents.retrieve(trip.tip_payment_intent_id, function(error, intent){
                        if(intent && intent.charges && intent.charges.data && intent.charges.data.length>0) {
                            trip.tip_amount = intent.charges.data[0].amount/100;
                            trip.total = trip.total + trip.tip_amount;
                            trip.provider_service_fees = +trip.provider_service_fees + +trip.tip_amount;
                            trip.pay_to_provider = trip.pay_to_provider + +trip.tip_amount;
                            trip.card_payment = trip.card_payment + trip.tip_amount;

                            Provider.findOne({_id: trip.confirmed_provider}, function(error, provider){
                                City.findOne({_id: trip.city_id}).then((city) => {
                                    if (city.is_provider_earning_set_in_wallet_on_other_payment){
                                        if (provider.provider_type == Number(constant_json.PROVIDER_TYPE_NORMAL)) {
                                            var total_wallet_amount = utils.addWalletHistory(constant_json.PROVIDER_UNIQUE_NUMBER, provider.unique_id, provider._id, provider.country_id,
                                                provider.wallet_currency_code, trip.currencycode,
                                                1, trip.tip_amount, provider.wallet, constant_json.ADD_WALLET_AMOUNT, constant_json.SET_TRIP_PROFIT, "Set Profit Of This Trip : " + trip.unique_id);
                                            
                                            provider.wallet = total_wallet_amount;
                                            provider.save();
                                        } else {
                                            Partner.findOne({_id: trip.provider_type_id}).then((partner) => {
                                                var total_wallet_amount = utils.addWalletHistory(constant_json.PARTNER_UNIQUE_NUMBER, partner.unique_id, partner._id, partner.country_id,
                                                    partner.wallet_currency_code, trip.currencycode,
                                                    1, trip.tip_amount, partner.wallet, constant_json.ADD_WALLET_AMOUNT, constant_json.SET_TRIP_PROFIT, "Set Profit Of This Trip : " + trip.unique_id);

                                                partner.wallet = total_wallet_amount;
                                                partner.save();
                                            });
                                        }

                                        trip.is_provider_earning_set_in_wallet = true;
                                        trip.provider_income_set_in_wallet = trip.provider_income_set_in_wallet + Math.abs(trip.tip_amount);
                                    }

                                    trip.save().then(() => {
                                        res.json({success: true, message: success_messages.MESSAGE_CODE_PAYMENT_PAID_SUCCESSFULLY });
                                    });
                                });
                            });

                        } else {
                            res.json({success: false, error_code: error_message.ERROR_CODE_YOUR_TRIP_PAYMENT_IS_PENDING})
                        }
                    });
                } else if(trip.payment_gateway_type== PAYMENT_GATEWAY.payu){
                    trip.tip_amount = req.body.amount;
                    trip.total = trip.total + trip.tip_amount;
                    trip.provider_service_fees = +trip.provider_service_fees + +trip.tip_amount;
                    trip.pay_to_provider = trip.pay_to_provider + +trip.tip_amount;
                    trip.card_payment = trip.card_payment + trip.tip_amount;
                    trip.payment_intent_id = req.body.mihpayid;
                    
                    Provider.findOne({_id: trip.confirmed_provider}, function(error, provider){
                        City.findOne({_id: trip.city_id}).then((city) => {
                            if (city.is_provider_earning_set_in_wallet_on_other_payment){
                                if (provider.provider_type == Number(constant_json.PROVIDER_TYPE_NORMAL)) {
                                    var total_wallet_amount = utils.addWalletHistory(constant_json.PROVIDER_UNIQUE_NUMBER, provider.unique_id, provider._id, provider.country_id,
                                        provider.wallet_currency_code, trip.currencycode,
                                        1, trip.tip_amount, provider.wallet, constant_json.ADD_WALLET_AMOUNT, constant_json.SET_TRIP_PROFIT, "Set Profit Of This Trip : " + trip.unique_id);
                                    
                                    provider.wallet = total_wallet_amount;
                                    provider.save();
                                } else {
                                    Partner.findOne({_id: trip.provider_type_id}).then((partner) => {
                                        var total_wallet_amount = utils.addWalletHistory(constant_json.PARTNER_UNIQUE_NUMBER, partner.unique_id, partner._id, partner.country_id,
                                            partner.wallet_currency_code, trip.currencycode,
                                            1, trip.tip_amount, partner.wallet, constant_json.ADD_WALLET_AMOUNT, constant_json.SET_TRIP_PROFIT, "Set Profit Of This Trip : " + trip.unique_id);

                                        partner.wallet = total_wallet_amount;
                                        partner.save();
                                    });
                                }

                                trip.is_provider_earning_set_in_wallet = true;
                                trip.provider_income_set_in_wallet = trip.provider_income_set_in_wallet + Math.abs(trip.tip_amount);
                            }

                            trip.save().then(() => {
                                if(req.body.udf4){
                                    res.redirect(req.body.udf4);
                                } else {
                                    res.json({success: true, message: success_messages.MESSAGE_CODE_PAYMENT_PAID_SUCCESSFULLY });
                                }
                            });
                        });
                    });

                }
            } else {
                res.json({success: false, error_code: error_message.ERROR_CODE_TRIP_NOT_FOUND})
            }
        });
    });
}

exports.pay_stripe_intent_payment = function (req, res) {

    if(req.body.txnid){
        req.body.trip_id = req.body.txnid;
    }

    Trip.findOne({ _id: req.body.trip_id, $or: [{ payment_status: PAYMENT_STATUS.WAITING }, { payment_status: PAYMENT_STATUS.FAILED }] }).then((trip) => {
        Trip_history.findOne({ _id: req.body.trip_id, $or: [{ payment_status: PAYMENT_STATUS.WAITING }, { payment_status: PAYMENT_STATUS.FAILED }] }).then(async (trip_history) => {
            if (!trip) {
                trip = trip_history;
            }
            if (trip) {

                if(!trip.payment_gateway_type || trip.payment_gateway_type== PAYMENT_GATEWAY.stripe){

                    var stripe_secret_key = setting_detail.stripe_secret_key;

                    var stripe = require("stripe")(stripe_secret_key);
                    stripe.paymentIntents.retrieve(trip.payment_intent_id, async function (error, intent) {
                        if (intent && intent.charges && intent.charges.data && intent.charges.data.length > 0) {
                            trip.payment_status = PAYMENT_STATUS.COMPLETED;
                            trip.remaining_payment = 0;
                            trip.card_payment = intent.charges.data[0].amount / 100;

                            if (trip.is_trip_cancelled == 1) {
                                User.findOne({ _id: trip.user_id }).then((user) => {
                                    user.current_trip_id = null;
                                    user.save();
                                });
                            }

                            // start provider profit after card payment done
                            await utils.trip_provider_profit_card_wallet_settlement(trip);
                            // end of provider profit after card payment done

                                
                            trip.save().then(() => {
                                utils.update_request_status_socket(trip._id);
                                User.findOne({ _id: trip.user_id }, function (error, user) {
                                    user.corporate_wallet_limit = user.corporate_wallet_limit - trip.card_payment;
                                    user.save();
                                })
                                Trip.findOneAndRemove({ _id: trip._id }).then((deleted_trip) => {
                                    if (deleted_trip) {
                                        var trip_history_data = new Trip_history(JSON.parse(JSON.stringify(deleted_trip)));
                                        trip_history_data.save(function () {
                                            res.json({ success: true, message: success_messages.PAYMENT_PAID_SUCCESSFULLY });
                                        });
                                    } else {
                                        res.json({ success: true, message: success_messages.PAYMENT_PAID_SUCCESSFULLY });
                                    }
                                });
                            });
                        } else {
                            res.json({ success: false, error_code: error_message.ERROR_CODE_YOUR_TRIP_PAYMENT_IS_PENDING })
                        }
                    });
                } else if(trip.payment_gateway_type== PAYMENT_GATEWAY.payu){
                    trip.payment_status = PAYMENT_STATUS.COMPLETED;
                    trip.remaining_payment = 0;
                    trip.card_payment = req.body.amount;
                    trip.payment_intent_id = req.body.mihpayid;

                    if (trip.is_trip_cancelled == 1) {
                        User.findOne({ _id: trip.user_id }).then((user) => {
                            user.current_trip_id = null;
                            user.save();
                        });
                    }

                    // start provider profit after card payment done
                    await utils.trip_provider_profit_card_wallet_settlement(trip);
                    // end of provider profit after card payment done

                    trip.save().then(() => {
                        utils.update_request_status_socket(trip._id);
                        User.findOne({ _id: trip.user_id }, function (error, user) {
                            user.corporate_wallet_limit = user.corporate_wallet_limit - trip.card_payment;
                            user.save();
                        })
                            Trip.findOneAndRemove({ _id: trip._id }).then((deleted_trip) => {
                                if (deleted_trip) {
                                    var trip_history_data = new Trip_history(JSON.parse(JSON.stringify(deleted_trip)));
                                    trip_history_data.save(function () {
                                        if(req.body.udf4){
                                            res.redirect(req.body.udf4);
                                        } else {
                                            res.json({ success: true, message: success_messages.PAYMENT_PAID_SUCCESSFULLY });
                                        }
                                    });
                                } else {
                                    if(req.body.udf4){
                                        res.redirect(req.body.udf4);
                                    } else {
                                        res.json({ success: true, message: success_messages.PAYMENT_PAID_SUCCESSFULLY });
                                    }
                                }
                            });
                    });
                }

            } else {
                res.json({ success: false, error_code: error_message.ERROR_CODE_TRIP_NOT_FOUND })
            }
        });
    });
}

exports.fail_stripe_intent_payment = function (req, res) {
    if(req.body.txnid){
        req.body.trip_id = req.body.txnid;
    }
    Trip.findOne({_id: req.body.trip_id, $or: [{payment_status: PAYMENT_STATUS.WAITING }, {payment_status: PAYMENT_STATUS.FAILED }] }).then((trip) => {
        if (trip) {
            Corporate.findOne({_id: trip.user_type_id}).then((corporate) => {
                if(trip.trip_type == constant_json.TRIP_TYPE_CORPORATE && corporate){
                    var wallet_payment = trip.remaining_payment;
                    var total_wallet_amount = utils.addWalletHistory(constant_json.USER_UNIQUE_NUMBER, corporate.unique_id, corporate._id, null,
                        corporate.wallet_currency_code, trip.currencycode,
                        trip.wallet_current_rate, wallet_payment, corporate.wallet, constant_json.DEDUCT_WALLET_AMOUNT, constant_json.PAID_TRIP_AMOUNT, "Charge Of This Trip : " + trip.unique_id);
                    corporate.wallet = total_wallet_amount;
                    corporate.save();

                    utils.update_request_status_socket(trip._id);
                    trip.payment_status = PAYMENT_STATUS.COMPLETED;
                    trip.remaining_payment = 0;
                    trip.wallet_payment = wallet_payment;

                    if (trip.is_trip_cancelled == 1) {
                        User.findOne({ _id: trip.user_id }).then((user) => {
                            user.current_trip_id = null;
                            user.save();
                        });
                    }
                    trip.save().then(() => {
                        User.findOne({ _id: trip.user_id }, function (error, user) {
                            user.corporate_wallet_limit = user.corporate_wallet_limit - trip.card_payment;
                            user.save();
                        })
                        Trip.findOneAndRemove({ _id: trip._id }).then((deleted_trip) => {
                            if (deleted_trip) {
                                var trip_history_data = new Trip_history(JSON.parse(JSON.stringify(deleted_trip)));
                                trip_history_data.save(function () {
                                    res.json({ success: true, message: success_messages.PAYMENT_PAID_SUCCESSFULLY });
                                });
                            } else {
                                res.json({ success: true, message: success_messages.PAYMENT_PAID_SUCCESSFULLY });
                            }
                        });
                    });

                } else {
                    if (trip.payment_gateway_type != PAYMENT_GATEWAY.payu) {
                        utils.update_request_status_socket(trip._id);
                    }

                    trip.payment_status = PAYMENT_STATUS.FAILED;
                    trip.save().then(() => {
                        res.json({success: true, message: success_messages.PAYMENT_FAILD });
                    }, (error)=>{
                        console.log(error)
                    });
                }
            });

        } else {
            res.json({success: false, error_code: error_message.ERROR_CODE_TRIP_NOT_FOUND})
        }
    });
}

///////////////////GETTRIP STATUS PROVIDER SIDE //////
exports.providergettripstatus = function (req, res) {

    utils.check_request_params(req.body, [{name: 'trip_id', type: 'string'}], function (response) {
        if (response.success) {
            var provider_id = req.body.provider_id;
            var token = req.body.token;
            var country_phone_code = "";
            var phone = "";
            if (provider_id != undefined && token != undefined) {
                Provider.findOne({_id: req.body.provider_id}).then((provider) => {
                    if (req.body.token != null && provider.token != req.body.token) {
                        res.json({success: false, error_code: error_message.ERROR_CODE_INVALID_TOKEN});
                    } else {

                        if (provider.is_trip.length > 0) {

                            Trip.findOne({
                                _id: {$in: provider.is_trip},
                                $or: [{current_providers: provider._id},
                                {confirmed_provider: provider._id}],

                                is_trip_cancelled: 0,
                                is_trip_cancelled_by_provider: 0
                            }).then((trip) => {
                                // console.log(trip)
                                Trip_history.findOne({
                                    _id: {$in: provider.is_trip},
                                    $or: [{current_providers: provider._id},
                                    {confirmed_provider: provider._id}],

                                    is_trip_cancelled: 0,
                                    is_trip_cancelled_by_provider: 0
                                }).then((trip_history) => {
                                    if(!trip){
                                        trip = trip_history;
                                    }

                                    if (trip) {
                                        Trip_Service.findOne({_id: trip.trip_service_city_type_id}).then((tripservice) => {

                                            if (tripservice) {
                                                User.findOne({_id: trip.user_id}).then((user) => {

                                                    if (user) {
                                                        country_phone_code = user.country_phone_code;
                                                        phone = user.phone;
                                                    }

                                                    Citytype.findById(trip.service_type_id).then((citytype_detail) => {
                                                        Type.findById(citytype_detail.typeid).then((type_detail) => {
                                                            var waiting_time_start_after_minute = 0;
                                                            var price_for_waiting_time = 0;
                                                            var total_wait_time = 0;
                                                            var provider_arrived_time = trip.provider_arrived_time;
                                                            if (provider_arrived_time != null) {
                                                                var end_time = new Date();
                                                                waiting_time_start_after_minute = tripservice.waiting_time_start_after_minute;
                                                                price_for_waiting_time = tripservice.price_for_waiting_time;
                                                                total_wait_time = utils.getTimeDifferenceInSecond(end_time, provider_arrived_time);
                                                                total_wait_time = total_wait_time - waiting_time_start_after_minute * 60;
                                                            }
                                                            if(trip.is_provider_status == 6){
                                                                var now = new Date();
                                                                var minutes = utils.getTimeDifferenceInMinute(now, trip.provider_trip_start_time);
                                                                trip.total_time = minutes;
                                                                trip.save();
                                                            }

                                                            var index = user.favourite_providers.findIndex((x)=>(x).toString() == (req.body.provider_id).toString())

                                                            if(index !== -1){
                                                                trip.is_favourite_provider = true;
                                                            }

                                                            res.json({
                                                                success: true,
                                                                map_pin_image_url: type_detail.map_pin_image_url,
                                                                message: success_messages.MESSAGE_CODE_FOR_PROVIDER_YOU_GET_TRIP_STATUS_SUCCESSFULLY,
                                                                country_phone_code: country_phone_code,
                                                                phone: phone,
                                                                trip: trip,
                                                                user: user,
                                                                tripservice: tripservice,
                                                                waiting_time_start_after_minute: waiting_time_start_after_minute,
                                                                price_for_waiting_time: price_for_waiting_time,
                                                                total_wait_time: total_wait_time
                                                            });
                                                        });
                                                    });
                                                });
                                            } else {
                                                res.json({
                                                    success: false,
                                                    error_code: error_message.ERROR_CODE_NOT_GET_TRIP_STATUS
                                                });
                                            }
                                        });
                                    } else {
                                        Trip.findOne({
                                            _id: req.body.trip_id,
                                            is_trip_cancelled_by_user: 1,
                                            is_trip_cancelled: 1
                                        }).then((cancel_trip) => {

                                            if (cancel_trip) {
                                                res.json({
                                                    success: false,
                                                    error_code: error_message.ERROR_CODE_TRIP_CANCELLED_BY_USER
                                                });
                                            } else {

                                                provider.is_trip = [];
                                                provider.is_available = 1;
                                                provider.save().then(()=>{
                                                    res.json({
                                                        success: false,
                                                        error_code: error_message.ERROR_CODE_NOT_GET_TRIP_STATUS
                                                    });
                                                })
                                            }

                                        });
                                    }
                                });
                            }, (err) => {
                                console.log(err);
                                res.json({
                                    success: false,
                                    error_code: error_message.ERROR_CODE_SOMETHING_WENT_WRONG
                                });
                            });

                        } else {
                            res.json({success: false, error_code: error_message.ERROR_CODE_NOT_GET_TRIP_STATUS});

                        }

                    }
                }, (err) => {
                    console.log(err);
                    res.json({
                        success: false,
                        error_code: error_message.ERROR_CODE_SOMETHING_WENT_WRONG
                    });
                });


            } else {

                Trip.findOne({
                    _id: req.body.trip_id,
                    is_trip_cancelled: 0,
                    is_trip_cancelled_by_provider: 0
                }).then((trip) => {

                    if (trip) {

                        Trip_Service.findOne({_id: trip.trip_service_city_type_id}).then((tripservice) => {

                            if (tripservice) {
                                User.findOne({_id: trip.user_id}).then((user) => {

                                    if (user) {
                                        country_phone_code = user.country_phone_code;
                                        phone = user.phone;
                                    }
                                    Citytype.findById(trip.service_type_id).then((citytype_detail) => {
                                        Type.findById(citytype_detail.typeid).then((type_detail) => {
                                            var waiting_time_start_after_minute = 0;
                                            var price_for_waiting_time = 0;
                                            var total_wait_time = 0;
                                            var provider_arrived_time = trip.provider_arrived_time;
                                            if (provider_arrived_time != null) {
                                                var end_time = new Date();
                                                waiting_time_start_after_minute = tripservice.waiting_time_start_after_minute;
                                                price_for_waiting_time = tripservice.price_for_waiting_time;
                                                total_wait_time = utils.getTimeDifferenceInSecond(end_time, provider_arrived_time);
                                                total_wait_time = total_wait_time - waiting_time_start_after_minute * 60;
                                            }

                                            res.json({
                                                success: true,
                                                country_phone_code: country_phone_code,
                                                phone: phone,
                                                map_pin_image_url: type_detail.map_pin_image_url,
                                                message: success_messages.MESSAGE_CODE_FOR_PROVIDER_YOU_GET_TRIP_STATUS_SUCCESSFULLY,
                                                trip: trip,
                                                waiting_time_start_after_minute: waiting_time_start_after_minute,
                                                price_for_waiting_time: price_for_waiting_time,
                                                total_wait_time: total_wait_time
                                            });
                                        });
                                    });

                                });

                            } else {
                                res.json({success: false, error_code: error_message.ERROR_CODE_NOT_GET_TRIP_STATUS});
                            }
                        });
                    } else {

                        Trip.findOne({_id: req.body.trip_id, is_trip_cancelled_by_user: 1}).then((cancel_trip) => {

                            if (cancel_trip) {
                                res.json({success: false, error_code: error_message.ERROR_CODE_TRIP_CANCELLED_BY_USER});
                            } else {
                                res.json({success: false, error_code: error_message.ERROR_CODE_NOT_GET_TRIP_STATUS});
                            }

                        });
                    }
                }, (err) => {
                    console.log(err);
                    res.json({
                        success: false,
                        error_code: error_message.ERROR_CODE_SOMETHING_WENT_WRONG
                    });
                });
            }
        } else {
            res.json({
                success: false,
                error_code: response.error_code,
                error_description: response.error_description
            });
        }
    });
};

//////////////////// user_history //////////////////////
exports.user_history = function (req, res) {

    utils.check_request_params(req.body, [{name: 'user_id', type: 'string'}], function (response) {
        if (response.success) {
            User.findOne({_id: req.body.user_id}).then((user) => {
                if (user.token != req.body.token) {
                    res.json({success: false, error_code: error_message.ERROR_CODE_INVALID_TOKEN});
                } else {
                    var lookup1 = {
                        $lookup:
                            {
                                from: "providers",
                                localField: "confirmed_provider",
                                foreignField: "_id",
                                as: "provider_detail"
                            }
                    };
                    var unwind1 = {$unwind: "$provider_detail"};

                    var mongoose = require('mongoose');
                    var Schema = mongoose.Types.ObjectId;
                    var condition = {$match: {'user_id': {$eq: Schema(req.body.user_id)}}};
                    var condition1 = {$match: {$or: [{is_trip_cancelled: {$eq: 1}}, {is_trip_end: {$eq: 1}}, {is_trip_cancelled_by_user: {$eq: 1}}, {is_trip_cancelled_by_provider: {$eq: 1}}]}};

                    var group = {
                        $project: {
                            trip_id: '$_id', unique_id: 1, invoice_number: 1,
                            current_provider: 1, provider_service_fees: 1,
                            is_trip_cancelled_by_user: 1,
                            is_trip_completed: 1,
                            is_trip_cancelled: 1,
                            is_user_rated: 1,
                            is_provider_rated: 1,
                            is_trip_cancelled_by_provider: 1,
                            first_name: '$provider_detail.first_name',
                            last_name: '$provider_detail.last_name',
                            picture: '$provider_detail.picture',
                            total: 1,
                            unit: 1,
                            currency: 1,
                            currencycode: 1,
                            total_time: 1,
                            user_create_time: 1,
                            total_distance: 1,
                            source_address: 1,
                            destination_address: 1,
                            provider_trip_end_time: 1,
                            timezone: 1,
                            created_at: 1
                        }
                    };

                    var start_date = req.body.start_date;
                    var end_date = req.body.end_date;
                    if (end_date == '' || end_date == undefined) {
                        end_date = new Date();
                    } else {
                        end_date = new Date(end_date);
                        end_date = end_date.setHours(23, 59, 59, 999);
                        end_date = new Date(end_date);
                    }

                    if (start_date == '' || start_date == undefined) {
                        start_date = new Date(0);
                        start_date = start_date.setHours(0, 0, 0, 0);
                        start_date = new Date(start_date);
                    } else {
                        start_date = new Date(start_date);
                        start_date = start_date.setHours(0, 0, 0, 0);
                        start_date = new Date(start_date);
                    }
                    var query1 = {};
                    query1['created_at'] = {$gte: start_date, $lt: end_date};
                    var filter = {"$match": query1};

                    var number_of_rec = 10;
                    var page = req.body.page || 1;
                    var skip = {};
                    skip["$skip"] = (page - 1) * number_of_rec;

                    var limit = {};
                    limit["$limit"] = number_of_rec;

                    var sort = {$sort: {created_at: -1}}

                    Trip_history.aggregate([condition, condition1, lookup1, unwind1, filter, group, sort, skip, limit]).then((array) => {
                        Trip.aggregate([condition, condition1, lookup1, unwind1, filter, group, sort, skip, limit]).then((array_list) => {
                            array_list = array_list.concat(array)
                            function compare( a, b ) {
                                return new Date(b.created_at) - new Date(a.created_at);
                            }
                            array_list.sort(compare)
                            res.json({success: true, trips: array_list});
                        });
                    }, (err) => {
                        console.log(err);
                        res.json({
                            success: false,
                            error_code: error_message.ERROR_CODE_SOMETHING_WENT_WRONG
                        });
                    });
                }
            }, (err) => {
                console.log(err);
                res.json({
                    success: false,
                    error_code: error_message.ERROR_CODE_SOMETHING_WENT_WRONG
                });
            });
        } else {
            res.json({
                success: false,
                error_code: response.error_code,
                error_description: response.error_description
            });
        }
    });
}


/////////////////////// provider_history ///////////////////////////////////
exports.provider_history = async function (req, res) {
    utils.check_request_params(req.body, [{ name: 'provider_id', type: 'string' }], function (response) {
        if (!response.success) {
            return res.json({ success: false, error_code: response.error_code, error_description: response.error_description });
        }
    })

    let provider = await Provider.findOne({ _id: req.body.provider_id })
    if (!provider) {
        return res.json({ success: false, error_code: error_message.ERROR_CODE_PROVIDER_DETAIL_NOT_FOUND });
    }

    if (provider.token != req.body.token) {
        return res.json({ success: false, error_code: error_message.ERROR_CODE_INVALID_TOKEN });
    }
    let lookup1 = {
        $lookup:
        {
            from: "users",
            localField: "user_id",
            foreignField: "_id",
            as: "user_detail"
        }
    };
    let unwind1 = { $unwind: "$user_detail" };

    let mongoose = require('mongoose');
    let Schema = mongoose.Types.ObjectId;

    let condition = { $match: { 'confirmed_provider': { $eq: Schema(req.body.provider_id) } } };

    let group = {
        $project: {
            trip_id: '$_id', unique_id: 1, invoice_number: 1,
            current_provider: 1, provider_service_fees: 1,
            is_trip_cancelled_by_user: 1,
            is_trip_cancelled: 1,
            is_user_rated: 1,
            is_trip_completed: 1,
            is_provider_rated: 1,
            is_trip_cancelled_by_provider: 1,
            first_name: '$user_detail.first_name',
            last_name: '$user_detail.last_name',
            picture: '$user_detail.picture',
            total: 1,
            unit: 1,
            currency: 1,
            currencycode: 1,
            total_time: 1,
            user_create_time: 1,
            total_distance: 1,
            source_address: 1,
            destination_address: 1,
            provider_trip_end_time: 1,
            timezone: 1,
            created_at: 1
        }
    };

    let start_date = req.body.start_date;
    let end_date = req.body.end_date;
    if (end_date == '' || end_date == undefined) {
        end_date = new Date();
    } else {
        end_date = new Date(end_date);
        end_date = end_date.setHours(23, 59, 59, 999);
        end_date = new Date(end_date);
    }

    if (start_date == '' || start_date == undefined) {
        start_date = new Date(0);
        start_date = start_date.setHours(0, 0, 0, 0);
        start_date = new Date(start_date);
    } else {
        start_date = new Date(start_date);
        start_date = start_date.setHours(0, 0, 0, 0);
        start_date = new Date(start_date);
    }
    let query1 = {};
    query1['created_at'] = { $gte: start_date, $lt: end_date };
    let filter = { "$match": query1 };

    let number_of_rec = 10;
    let page = req.body.page || 1;
    let skip = {};
    skip["$skip"] = (page - 1) * number_of_rec;

    let limit = {};
    limit["$limit"] = number_of_rec;
    let sort = { $sort: { created_at: -1 } }

    let trips = await Trip_history.aggregate([condition, lookup1, unwind1, filter, group, sort, skip, limit]);
    return res.json({ success: true, trips: trips });
};


exports.provider_submit_invoice = function (req, res) {

    utils.check_request_params(req.body, [{name: 'provider_id', type: 'string'}, {
        name: 'trip_id',
        type: 'string'
    }], function (response) {
        if (response.success) {
            Provider.findOne({_id: req.body.provider_id}).then((provider) => {
                if (provider) {
                    if (req.body.token != null && provider.token != req.body.token) {
                        res.json({success: false, error_code: error_message.ERROR_CODE_INVALID_TOKEN});
                    } else {
                        Trip.findOne({_id: req.body.trip_id, is_trip_end: 1}).then((trip) => {
                            Trip_history.findOne({_id: req.body.trip_id, is_trip_end: 1}).then((trip_history) => {
                                if(!trip){
                                    trip = trip_history;
                                }
                                if (trip) {
                                        User.findOne({_id: trip.user_id}).then((user) => {

                                            trip.is_trip_completed = 1;
                                            trip.is_provider_invoice_show = 1;
                                            trip.save(function(){
                                                provider.completed_request = provider.completed_request + 1;
                                                provider.is_available = 1;
                                                provider.is_trip = [];
                                                provider.save();

                                                Trip_Service.findOne({_id: trip.trip_service_city_type_id}).then((tripservice) => {
                                                    var email_notification = setting_detail.email_notification;
                                                    if (email_notification == true) {
                                                        allemails.sendProviderInvoiceEmail(req, provider, trip, tripservice, user);
                                                    }
                                                })


                                                if (trip.trip_type == Number(constant_json.TRIP_TYPE_DISPATCHER) || trip.trip_type == Number(constant_json.TRIP_TYPE_HOTEL) || trip.trip_type == Number(constant_json.TRIP_TYPE_PROVIDER) || trip.trip_type == Number(constant_json.TRIP_TYPE_GUEST_TOKEN)) {
                                                    user.current_trip_id = null;
                                                    user.save();
                                                }
                                                if(trip.is_user_invoice_show == 1 || trip.trip_type == 6){
                                                    Trip.findOneAndRemove({_id: req.body.trip_id}).then((deleted_trip) => {
                                                        if (deleted_trip) {
                                                            var trip_history_data = new Trip_history(JSON.parse(JSON.stringify(deleted_trip)));
                                                            trip_history_data.save(function (error) {
                                                                console.log(error)
                                                                res.json({ success: true });
                                                            });
                                                        } else {
                                                            res.json({ success: true });
                                                        }
                                                    }, (error)=>{
                                                        console.log(error)
                                                    });
                                                } else {
                                                    res.json({success: true});
                                                }
                                            });
                                        });
                                } else {
                                    res.json({success: false, error_code: error_message.ERROR_CODE_YOUR_TRIP_IS_NOT_END});
                                }
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
            }, (err) => {
                console.log(err);
                res.json({
                    success: false,
                    error_code: error_message.ERROR_CODE_SOMETHING_WENT_WRONG
                });
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

exports.user_submit_invoice = function (req, res) {

    utils.check_request_params(req.body, [{name: 'user_id', type: 'string'}, {
        name: 'trip_id',
        type: 'string'
    }], function (response) {
        if (response.success) {
            User.findOne({_id: req.body.user_id}).then((user) => {
                if (user) {
                    if (req.body.token != null && user.token != req.body.token) {
                        res.json({success: false, error_code: error_message.ERROR_CODE_INVALID_TOKEN});
                    } else {
                        Trip.findOne({_id: req.body.trip_id, is_trip_end: 1, payment_status: PAYMENT_STATUS.COMPLETED}).then((trip) => {
                            Trip_history.findOne({_id: req.body.trip_id, is_trip_end: 1, payment_status: PAYMENT_STATUS.COMPLETED}).then((trip_history) => {
                                if(!trip){
                                    trip = trip_history;
                                }
                                if (trip) {
                                    trip.is_user_invoice_show = 1;
                                    trip.save(function(){
                                        Provider.findOne({ _id: trip.provider_id }).then((provider) => {
                                            Trip_Service.findOne({ _id: trip.trip_service_city_type_id }).then((tripservice) => {
                                                var email_notification = setting_detail.email_notification;
                                                if (email_notification == true) {
                                                    // console.log("mail sent user invoice");
                                                    allemails.sendUserInvoiceEmail(req, user, provider, trip, tripservice);
                                                }
                                            })
                                        })

                                        user.current_trip_id = null;
                                        user.save();
                                            
                                        Trip.findOneAndRemove({ _id: req.body.trip_id }).then((deleted_trip) => {
                                            if (deleted_trip) {
                                                var trip_history_data = new Trip_history(JSON.parse(JSON.stringify(deleted_trip)));
                                                trip_history_data.save().then(() => {
                                                    res.json({ success: true });
                                                }, (error) => {
                                                    console.log(error)
                                                });
                                            } else {
                                                res.json({ success: true });
                                            }
                                        }, (error) => {
                                            console.log(error)
                                        });
                                    });
                                } else {
                                    res.json({success: false, error_code: error_message.ERROR_CODE_YOUR_TRIP_IS_NOT_END});
                                }
                            });
                        });
                    }

                } else {
                    res.json({success: false, error_code: error_message.ERROR_CODE_USER_DETAIL_NOT_FOUND});
                }
            }, (err) => {
                console.log(err);
                res.json({
                    success: false,
                    error_code: error_message.ERROR_CODE_SOMETHING_WENT_WRONG
                });
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
////////////// PROVIDER RATING SERVICE  //////////////////////////

exports.provider_rating = function (req, res) {
    utils.check_request_params(req.body, [{name: 'provider_id', type: 'string'}, {
        name: 'trip_id',
        type: 'string'
    }], function (response) {
        if (response.success) {
            Provider.findOne({_id: req.body.provider_id}).then((provider) => {
                if (provider) {
                    if (req.body.token != null && provider.token != req.body.token) {
                        res.json({success: false, error_code: error_message.ERROR_CODE_INVALID_TOKEN});
                    } else {
                        Trip.findOne({_id: req.body.trip_id, is_trip_end: 1}).then((trip) => {
                            Trip_history.findOne({_id: req.body.trip_id, is_trip_end: 1}).then((trip_history) => {
                                if(!trip){
                                    trip = trip_history;
                                }
                                if(trip){
                                    if (trip.is_trip_end == 1) {

                                        User.findOne({_id: trip.user_id}).then((user) => {
                                            var rating = req.body.rating;
                                            var old_rate = user.rate;
                                            var old_rate_count = user.rate_count;
                                            var new_rate_counter = (old_rate_count + 1);
                                            var new_rate = ((old_rate * old_rate_count) + rating) / new_rate_counter;
                                            user.rate = new_rate;
                                            user.rate_count++;
                                            user.save();
                                            Reviews.findOne({trip_id: trip._id}).then((review) => {

                                                if (!review) {

                                                    var review = new Reviews({
                                                        trip_id: trip._id,
                                                        trip_unique_id: trip.unique_id,
                                                        userRating: 0,
                                                        userReview: "",
                                                        providerRating: rating,
                                                        providerReview: req.body.review,
                                                        provider_id: trip.confirmed_provider,
                                                        user_id: trip.user_id
                                                    });
                                                    review.save();
                                                } else {
                                                    review.providerRating = rating;
                                                    review.providerReview = req.body.review;
                                                    review.save();
                                                }
                                            });
                                            trip.is_user_rated = 1;

                                            trip.save().then(() => {
                                                res.json({
                                                    success: true,
                                                    message: success_messages.MESSAGE_CODE_FOR_PROVIDER_GIVE_RATING_SUCCESSFULLY
                                                });

                                            });
                                        });
                                    } else {
                                        res.json({success: false, error_code: error_message.ERROR_CODE_YOUR_TRIP_IS_NOT_END});
                                    }
                                } else {
                                    res.json({success: false, error_code: error_message.ERROR_CODE_TRIP_NOT_FOUND})
                                }
                            });
                        });
                    }
                } else {
                    res.json({success: false, error_code: error_message.ERROR_CODE_PROVIDER_DETAIL_NOT_FOUND});

                }
            }, (err) => {
                console.log(err);
                res.json({
                    success: false,
                    error_code: error_message.ERROR_CODE_SOMETHING_WENT_WRONG
                });
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
////////////////////// USER  RATING  SERVICE/////////////

exports.user_rating = function (req, res) {
    utils.check_request_params(req.body, [{name: 'user_id', type: 'string'}, {
        name: 'trip_id',
        type: 'string'
    }], function (response) {
        if (response.success) {
            User.findOne({_id: req.body.user_id}).then((user) => {
                if (user) {
                    if (req.body.token != null && user.token != req.body.token) {
                        res.json({success: false, error_code: error_message.ERROR_CODE_INVALID_TOKEN});
                    } else {

                        Trip.findOneAndUpdate({
                            _id: req.body.trip_id,
                            is_trip_end: 1
                        }, req.body, {new: true}).then((trip) => {
                            Trip_history.findOne({_id: req.body.trip_id, is_trip_end: 1}).then((trip_history) => {
                                if(!trip){
                                    trip = trip_history;
                                }
                                if (trip) {
                                    var is_trip_end = trip.is_trip_end;
                                    if (is_trip_end == 1) {
                                        Provider.findOne({_id: trip.confirmed_provider}).then((provider) => {
                                            var rating = req.body.rating;
                                            var old_rate = provider.rate;
                                            var old_rate_count = provider.rate_count;
                                            var new_rate_counter = (old_rate_count + 1);
                                            var new_rate = ((old_rate * old_rate_count) + rating) / new_rate_counter;
                                            var is_user_invoice_show = trip.is_user_invoice_show;
                                            provider.rate = new_rate;
                                            provider.rate_count++;
                                            provider.save();
                                            Reviews.findOne({trip_id: trip._id}).then((review) => {

                                                if (!review) {
                                                    var reviews = new Reviews({
                                                        trip_id: trip._id,
                                                        trip_unique_id: trip.unique_id,
                                                        userRating: rating,
                                                        userReview: req.body.review,
                                                        providerRating: 0,
                                                        providerReview: "",
                                                        provider_id: trip.confirmed_provider,
                                                        user_id: trip.user_id
                                                    });
                                                    reviews.save();
                                                } else {
                                                    review.userRating = rating;
                                                    review.userReview = req.body.review;
                                                    review.save();
                                                }
                                            });

                                            trip.is_provider_rated = 1;
                                            trip.is_user_invoice_show = 1;
                                            user.completed_request = user.completed_request + 1;
                                            user.current_trip_id = null;
                                            user.save();
                                            trip.save().then(() => {
                                                if(is_user_invoice_show == 0){
                                                    Trip.findOneAndRemove({_id: req.body.trip_id}).then((deleted_trip) => {
                                                        if (deleted_trip) {
                                                            var trip_history_data = new Trip_history(JSON.parse(JSON.stringify(deleted_trip)));
                                                            trip_history_data.save().then(() => {
                                                                res.json({
                                                                    success: true,
                                                                    message: success_messages.MESSAGE_CODE_USER_GIVE_RATING_SUCCESSFULLY
                                                                });
                                                            }, (error) => {
                                                                console.log(error)
                                                            });
                                                        } else {
                                                            res.json({
                                                                success: true,
                                                                message: success_messages.MESSAGE_CODE_USER_GIVE_RATING_SUCCESSFULLY
                                                            });
                                                        }
                                                    }, (error)=>{
                                                        console.log(error)
                                                    });
                                                } else {
                                                    res.json({
                                                        success: true,
                                                        message: success_messages.MESSAGE_CODE_USER_GIVE_RATING_SUCCESSFULLY
                                                    });
                                                }
                                            });
                                        });
                                    } else {
                                        res.json({success: false, error_code: error_message.ERROR_CODE_YOUR_TRIP_IS_NOT_END});
                                    }
                                }
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
                    res.json({success: false, error_code: error_message.ERROR_CODE_USER_DETAIL_NOT_FOUND});

                }
            }, (err) => {
                console.log(err);
                res.json({
                    success: false,
                    error_code: error_message.ERROR_CODE_SOMETHING_WENT_WRONG
                });
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


/////////// USER TRIP DETAIL ///////////////////
exports.user_tripdetail = function (req, res) {
    utils.check_request_params(req.body, [{name: 'user_id', type: 'string'}, {
        name: 'trip_id',
        type: 'string'
    }], function (response) {
        if (response.success) {
            User.findOne({_id: req.body.user_id}).then((users) => {
                if (users.token != req.body.token) {
                    res.json({success: false, error_code: error_message.ERROR_CODE_INVALID_TOKEN});
                } else {
                    Trip.findOne({_id: req.body.trip_id}).then((trip) => {
                        Trip_history.findOne({_id: req.body.trip_id}).then((trip_history) => {
                            if(!trip){
                                trip = trip_history
                            }
                            if (trip) {
                                if (trip.is_trip_cancelled == 0 && trip.is_trip_cancelled_by_user == 0 && trip.is_trip_cancelled_by_provider == 0 && trip.is_trip_end == 1) {

                                    Trip_Service.findOne({_id: trip.trip_service_city_type_id}).then((tripservice) => {
                                        if (tripservice) {
                                            TripLocation.findOne({tripID: trip._id}).then((tripLocation) => {

                                                Provider.findOne({_id: trip.confirmed_provider}).then((provider) => {

                                                    res.json({
                                                        success: true,
                                                        message: success_messages.MESSAGE_CODE_HISTORY_DETAIL_GET_SUCCESSFULLY,
                                                        trip: trip,
                                                        tripservice: tripservice,
                                                        provider: provider,
                                                        startTripToEndTripLocations: tripLocation.startTripToEndTripLocations
                                                    });
                                                });
                                            });

                                        } else {
                                            res.json({
                                                success: false,
                                                error_code: error_message.ERROR_CODE_TRIP_SERVICE_NOT_FOUND
                                            });

                                        }
                                    });

                                } else {
                                    res.json({
                                        success: false,
                                        error_code: error_message.ERROR_CODE_TRIP_IS_ALREADY_CANCELLED
                                    });

                                }
                            } else {

                                res.json({success: false, error_code: error_message.ERROR_CODE_YOUR_TRIP_DETAIL_NOT_FOUND});


                            }
                        }, (err) => {
                            console.log(err);
                            res.json({
                                success: false,
                                error_code: error_message.ERROR_CODE_SOMETHING_WENT_WRONG
                            });

                        });
                    });
                }
            }, (err) => {
                console.log(err);
                res.json({
                    success: false,
                    error_code: error_message.ERROR_CODE_SOMETHING_WENT_WRONG
                });
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

///////// PROVIDER TRIP DETAIL  //////////////
exports.provider_tripdetail = function (req, res) {
    utils.check_request_params(req.body, [{name: 'provider_id', type: 'string'}, {
        name: 'trip_id',
        type: 'string'
    }], function (response) {
        if (response.success) {
            Provider.findOne({_id: req.body.provider_id}).then((provider) => {
                if (provider.token != req.body.token) {
                    res.json({success: false, error_code: error_message.ERROR_CODE_INVALID_TOKEN});
                } else {
                    Trip.findOne({_id: req.body.trip_id}).then((trip) => {
                        Trip_history.findOne({_id: req.body.trip_id}).then((trip_history) => {
                            if(!trip){
                                trip = trip_history
                            }
                            if (trip) {
                                if (trip.is_trip_cancelled == 0 && trip.is_trip_cancelled_by_user == 0 && trip.is_trip_cancelled_by_provider == 0 && trip.is_trip_end == 1) {

                                    Trip_Service.findOne({_id: trip.trip_service_city_type_id}).then((tripservice) => {
                                        if (tripservice) {

                                            TripLocation.findOne({tripID: trip._id}).then((tripLocation) => {


                                                User.findOne({_id: trip.user_id}).then((user) => {

                                                    res.json({
                                                        success: true,
                                                        message: success_messages.MESSAGE_CODE_FOR_PROVIDER_YOUR_TRIP_DETAIL_GET_SUCCESSFULLY,
                                                        trip: trip,
                                                        tripservice: tripservice,
                                                        user: user,
                                                        startTripToEndTripLocations: tripLocation.startTripToEndTripLocations
                                                    });
                                                });
                                            });

                                        } else {
                                            res.json({
                                                success: false,
                                                error_code: error_message.ERROR_CODE_TRIP_SERVICE_NOT_FOUND
                                            });

                                        }
                                    });

                                } else {
                                    res.json({
                                        success: false,
                                        error_code: error_message.ERROR_CODE_TRIP_IS_ALREADY_CANCELLED
                                    });

                                }
                            } else {
                                res.json({success: false, error_code: error_message.ERROR_CODE_YOUR_TRIP_DETAIL_NOT_FOUND});

                            }
                        }, (err) => {
                            console.log(err);
                            res.json({
                                success: false,
                                error_code: error_message.ERROR_CODE_SOMETHING_WENT_WRONG
                            });
                        });
                    });
                }
            }, (err) => {
                console.log(err);
                res.json({
                    success: false,
                    error_code: error_message.ERROR_CODE_SOMETHING_WENT_WRONG
                });
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

// user_invoice //
exports.user_invoice = function (req, res) {
    utils.check_request_params(req.body, [{name: 'user_id', type: 'string'}, {
        name: 'trip_id',
        type: 'string'
    }], function (response) {
        if (response.success) {
            User.findOne({_id: req.body.user_id}).then((user) => {
                if (user) {
                    if (req.body.token != null && user.token != req.body.token) {
                        res.json({success: false, error_code: error_message.ERROR_CODE_INVALID_TOKEN});
                    } else {
                        Trip.findOne({_id: req.body.trip_id}).then((trip) => {
                            Trip_history.findOne({_id: req.body.trip_id}).then((trip_history) => {
                                if(!trip){
                                    trip = trip_history;
                                }
                                if (trip) {
                                    if (trip.is_trip_cancelled == 0 && trip.is_trip_cancelled_by_provider == 0) {

                                        Provider.findOne({_id: trip.provider_id}).then((provider) => {

                                            Trip_Service.findOne({_id: trip.trip_service_city_type_id}).then((tripservice) => {

                                                if (!tripservice) {
                                                    res.json({
                                                        success: false,
                                                        error_code: error_message.ERROR_CODE_TRIP_SERVICE_NOT_FOUND
                                                    });
                                                } else {
                                                    var email_notification = setting_detail.email_notification;
                                                    if (email_notification == true) {
                                                    }

                                                    res.json({
                                                        success: true,
                                                        message: success_messages.MESSAGE_CODE_GET_YOUR_INVOICE_SUCCESSFULLY,
                                                        trip: trip,
                                                        tripservice: tripservice,
                                                        provider_detail: {
                                                            first_name: provider.first_name,
                                                            last_name: provider.last_name,
                                                            picture: provider.picture
                                                        }
                                                    });
                                                }
                                            });
                                        });

                                    } else {
                                        res.json({
                                            success: false,
                                            error_code: error_message.ERROR_CODE_TRIP_IS_ALREADY_CANCELLED
                                        });
                                    }
                                } else {

                                    res.json({
                                        success: false,
                                        error_code: error_message.ERROR_CODE_TRIP_NOT_FOUND
                                    });

                                }
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
                    res.json({success: false, error_code: error_message.ERROR_CODE_USER_DETAIL_NOT_FOUND});
                }
            }, (err) => {
                console.log(err);
                res.json({
                    success: false,
                    error_code: error_message.ERROR_CODE_SOMETHING_WENT_WRONG
                });
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

// provider_invoice // 
exports.provider_invoice = function (req, res) {
    utils.check_request_params(req.body, [{name: 'provider_id', type: 'string'}, {
        name: 'trip_id',
        type: 'string'
    }], function (response) {
        if (response.success) {
            Provider.findOne({_id: req.body.provider_id}).then((provider) => {
                if (provider) {
                    if (req.body.token != null && provider.token != req.body.token) {
                        res.json({success: false, error_code: error_message.ERROR_CODE_INVALID_TOKEN});
                    } else {
                        Trip.findOne({_id: req.body.trip_id}).then((trip) => {
                            Trip_history.findOne({_id: req.body.trip_id}).then((trip_history) => {
                                if(!trip){
                                    trip = trip_history;
                                }
                                if (trip) {
                                    if (trip.is_trip_cancelled == 0 && trip.is_trip_cancelled_by_provider == 0) {

                                        Trip_Service.findOne({_id: trip.trip_service_city_type_id}).then((tripservice) => {
                                            if (!tripservice) {
                                                res.json({
                                                    success: false,
                                                    error_code: error_message.ERROR_CODE_TRIP_SERVICE_NOT_FOUND
                                                });
                                            } else {
                                                var email_notification = setting_detail.email_notification;
                                                if (email_notification == true) {
                                                }

                                                res.json({
                                                    success: true,
                                                    message: success_messages.MESSAGE_CODE_GET_INVOICE_SUCCESSFULLY,
                                                    trip: trip,
                                                    tripservice: tripservice
                                                });

                                            }
                                        });
                                    } else {
                                        res.json({
                                            success: false,
                                            error_code: error_message.ERROR_CODE_TRIP_IS_ALREADY_CANCELLED
                                        });
                                    }

                                } else {

                                    res.json({success: false, error_code: error_message.ERROR_CODE_TRIP_NOT_FOUND});
                                }
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
            }, (err) => {
                console.log(err);
                res.json({
                    success: false,
                    error_code: error_message.ERROR_CODE_SOMETHING_WENT_WRONG
                });
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
////////////////////////////////////

////////////////////////// USER SET DESTINATION ///////////////////////////////////////
exports.user_setdestination = function (req, res) {
    utils.check_request_params(req.body, [{name: 'user_id', type: 'string'}, {
        name: 'trip_id',
        type: 'string'
    }], function (response) {
        if (response.success) {
            User.findOne({_id: req.body.user_id}).then((user) => {
                if (user) {
                    if (user.token != req.body.token) {
                        res.json({success: false, error_code: error_message.ERROR_CODE_INVALID_TOKEN});
                    } else {
                        Trip.findOne({
                            _id: req.body.trip_id,
                            is_trip_cancelled: 0,
                            is_trip_cancelled_by_provider: 0,
                            user_id: req.body.user_id,
                            is_trip_end: 0
                        }).then((trip) => {
                            if (trip) {

                                Provider.findOne({_id: trip.confirmed_provider}).then((providers) => {
                                    var device_token = providers.device_token;
                                    var device_type = providers.device_type;
                                    //////////////////////  PUSH NOTIFICATION ///////////
                                    utils.sendPushNotification(constant_json.PROVIDER_UNIQUE_NUMBER, device_type, device_token, push_messages.PUSH_CODE_FOR_SET_DESTINATION, constant_json.PUSH_NOTIFICATION_SOUND_FILE_IN_IOS);
                                });
                                trip.destination_address = req.body.destination_address;
                                trip.destinationLocation = [req.body.d_latitude, req.body.d_longitude];
                                trip.save().then(() => {
                                    utils.update_request_status_socket(trip._id);
                                    res.json({
                                        success: true,
                                        message: success_messages.MESSAGE_CODE_SET_DESTINATION_SUCCESSFULLY,
                                        destinationLocation: trip.destinationLocation
                                    });
                                });
                            } else {
                                res.json({success: false, error_code: error_message.ERROR_CODE_DESTINATION_NOT_SET});
                            }
                        }, (err) => {
                            console.log(err);
                            res.json({
                                success: false,
                                error_code: error_message.ERROR_CODE_SOMETHING_WENT_WRONG
                            });
                        });
                    }
                } else {
                    res.json({success: false, error_code: error_message.ERROR_CODE_USER_DETAIL_NOT_FOUND});
                }
            }, (err) => {
                console.log(err);
                res.json({
                    success: false,
                    error_code: error_message.ERROR_CODE_SOMETHING_WENT_WRONG
                });
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
// getgooglemappath

exports.getgooglemappath = function (req, res) {
    utils.check_request_params(req.body, [{name: 'trip_id', type: 'string'}], function (response) {
        if (response.success) {
            TripLocation.findOne({tripID: req.body.trip_id}).then((tripLocation) => {

                if (tripLocation) {
                    res.json({success: true, triplocation: tripLocation});
                } else {
                    res.json({success: false});
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
//setgooglemappath  
exports.setgooglemappath = function (req, res) {
    utils.check_request_params(req.body, [{name: 'trip_id', type: 'string'}], function (response) {
        if (response.success) {
            TripLocation.findOne({tripID: req.body.trip_id}).then((tripLocation) => {

                tripLocation.googlePickUpLocationToDestinationLocation = req.body.googlePickUpLocationToDestinationLocation;
                tripLocation.googlePathStartLocationToPickUpLocation = req.body.googlePathStartLocationToPickUpLocation;
                tripLocation.save().then(() => {
                    res.json({success: true});

                });
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


exports.check_trip_inside_zone_queue = function (city_id, latitude, longitude, res_data) {
    CityZone.find({ cityid: city_id }, function (error, zone_queue_list) {
        if (zone_queue_list.length > 0) {
            var is_trip_inside_zone_queue = false;
            zone_queue_list.forEach(function (zone_queue_data, index) {
                var geo = geolib.isPointInside(
                    { latitude: latitude, longitude: longitude },
                    zone_queue_data.kmlzone
                );
                if (geo) {
                    is_trip_inside_zone_queue = true;
                }
                if (index == zone_queue_list.length - 1) {
                    res_data({ is_trip_inside_zone_queue: is_trip_inside_zone_queue, zone_queue_id: zone_queue_data._id });
                }
            });
        } else {
            res_data({ is_trip_inside_zone_queue: false, zone_queue_id: null });
        }
    });
};



exports.twilio_voice_call = function(req,res){
    var trip_id = req.body.trip_id;
    console.log("twilio_voice_call")
    console.log(req.body)
    Trip.findOne({_id: trip_id},function(err, trip){
        if(trip){
            
            var user_id = trip.user_id;
            var provider_id = trip.confirmed_provider;

              var twilio_account_sid = setting_detail.twilio_account_sid;
              var twilio_auth_token = setting_detail.twilio_auth_token;
              var twilio_number = setting_detail.twilio_number;
              var client = require('twilio')(twilio_account_sid, twilio_auth_token);
              var twiml_url = setting_detail.twiml_url;

            if(req.body.type==1){
                Provider.findOne({_id: provider_id},function(err,provider){
                    User.findOne({_id: user_id},function(err,user){
                        
                        if(provider){
                            var provider_number = provider.country_phone_code+provider.phone;
                            var user_number     = user.country_phone_code+user.phone;

                            twiml_url = twiml_url+"?to="+provider_number;
                            client.calls.create({
                                url:  twiml_url,   
                                to:   user_number,
                                from: twilio_number
                            }, function(err) {
                                if(err){
                                    console.log(err)
                                    res.json({ "success": false, error_code: error_message.ERROR_CODE_TWILIO_SERVICE_NOT_AVAILABLE });

                                }else{
                                    res.json({"success":true});
                                }
                            });
                        }
                    });
                });
            }else{
                User.findOne({_id:user_id},function(err,user){
                    Provider.findOne({_id:provider_id},function(err,provider){
                        if(user){
                            var provider_number = provider.country_phone_code+provider.phone;
                            var user_number     = user.country_phone_code+user.phone;
                            twiml_url = twiml_url+"?to="+user_number;

                            client.calls.create({
                                url: twiml_url,   
                                to: provider_number,
                                from: twilio_number
                            }, function(err) {
                                if(err){
                                    console.log(err)
                                    res.json({ "success": false, error_code: error_message.ERROR_CODE_TWILIO_SERVICE_NOT_AVAILABLE });
                                } else{
                                    res.json({"success":true});
                                }
                            });
                        }
                    });
                });
            }
                
        }
        else{
            res.json({"success":false});
        }
        
    });
}



exports.refund_amount_in_wallet = function (req, res) {
    if (typeof req.session.userid == 'undefined') {
        return res.json({ success: false });
    }
    utils.check_request_params(req.body, [{ name: 'trip_id', type: 'string' }], async function (response) {
        if (!response.success) {
            return res.json({ success: false, error_code: response.error_code, error_description: response.error_description });
        }
        let trip = await Trip.findOne({ _id: req.body.trip_id });
        let amount = Number(req.body.amount);
        if (!trip) {
            trip = await Trip_history.findOne({ _id: req.body.trip_id });
        }
        if (!trip) {
            return res.json({ success: false, error_code: error_message.ERROR_CODE_TRIP_NOT_FOUND });
        }
        let user_data = await User.findById(trip.user_id);
        let status = constant_json.ADD_WALLET_AMOUNT;
        let total_wallet_amount = utils.addWalletHistory(constant_json.USER_UNIQUE_NUMBER, user_data.unique_id, user_data._id, user_data.country_id, user_data.wallet_currency_code, user_data.wallet_currency_code,
            1, Math.abs(amount), user_data.wallet, status, constant_json.ADDED_BY_ADMIN, "Refund Of This Trip : " + trip.unique_id);
        user_data.wallet = total_wallet_amount;
        await user_data.save();

        trip.refund_amount += amount;
        trip.is_amount_refund = true;
        await trip.save();

        message = admin_messages.success_message_refund;
        res.json({ success: true });
    });
}

exports.refund_amount_in_card = function (req, res) {
    if (typeof req.session.userid == 'undefined') {
        return res.json({ success: false });
    }
    utils.check_request_params(req.body, [{ name: 'trip_id', type: 'string' }], async function (response) {
        if (!response.success) {
            return res.json({ success: false, error_code: response.error_code, error_description: response.error_description });
        }
        let trip = await Trip.findOne({ _id: req.body.trip_id });
        if (!trip) {
            trip = await Trip_history.findOne({ _id: req.body.trip_id });
        }
        if (!trip) {
            return res.json({ success: false, error_code: error_message.ERROR_CODE_TRIP_NOT_FOUND });
        }

        if (!trip.payment_gateway_type || trip.payment_gateway_type == PAYMENT_GATEWAY.stripe) {
            cards.refund_payment(trip.payment_intent_id, PAYMENT_GATEWAY.stripe);
        } else if (trip.payment_gateway_type == PAYMENT_GATEWAY.paystack) {
            cards.refund_payment(trip.payment_intent_id, PAYMENT_GATEWAY.paystack);
        } else if (trip.payment_gateway_type == PAYMENT_GATEWAY.payu) {
            cards.refund_payment(trip._id, PAYMENT_GATEWAY.payu);
        }
        trip.refund_amount += trip.card_payment;
        trip.is_amount_refund = true;
        await trip.save();

        message = admin_messages.success_message_refund;
        res.json({ success: true });
    });
}

exports.pay_by_other_payment_mode = function (req, res) {
    utils.check_request_params(req.body, [{ name: 'trip_id', type: 'string' }], async function (response) {
        if (!response.success) {
            return res.json({ success: false, error_code: response.error_code, error_description: response.error_description });
        }
        let trip = await Trip.findOne({ _id: req.body.trip_id, $or: [{ payment_status: PAYMENT_STATUS.WAITING }, { payment_status: PAYMENT_STATUS.FAILED }] });

        if (!trip) {
            trip = await Trip_history.findOne({ _id: req.body.trip_id, $or: [{ payment_status: PAYMENT_STATUS.WAITING }, { payment_status: PAYMENT_STATUS.FAILED }] });
        }

        if (!trip) {
            return res.json({ success: false, error_code: error_message.ERROR_CODE_TRIP_NOT_FOUND });
        }

        let city = await City.findOne({ _id: trip.city_id });
        let provider = await Provider.findOne({ _id: trip.confirmed_provider });
        let user = await User.findOne({ _id: trip.user_id });
        let corporate = await Corporate.findOne({ _id: trip.user_type_id });


        if (city.is_payment_mode_cash == 1) {
            var wallet_payment = 0;
            var remaining_payment = 0;
            var total = trip.remaining_payment;
            var total_after_wallet_payment = trip.remaining_payment;

            total_after_wallet_payment = Number((total_after_wallet_payment).toFixed(2));
            wallet_payment = Number((wallet_payment).toFixed(2));
            remaining_payment = total - wallet_payment;
            remaining_payment = Number((remaining_payment).toFixed(2));
            trip.wallet_payment += wallet_payment;
            trip.total_after_wallet_payment = total_after_wallet_payment;
            trip.remaining_payment = remaining_payment;
            trip.payment_status = PAYMENT_STATUS.COMPLETED;

            trip.payment_mode = constant_json.PAYMENT_MODE_CASH;
            trip.provider_have_cash = remaining_payment;
            trip.pay_to_provider = trip.provider_service_fees - trip.provider_have_cash;

            trip.is_paid = 1;
            trip.is_pending_payments = 0;
            trip.cash_payment = remaining_payment;
            trip.remaining_payment = 0;
            await trip.save()
        } else {
            var wallet_payment = 0;
            var remaining_payment = 0;
            var total = trip.remaining_payment;
            var total_after_wallet_payment = trip.remaining_payment;

            wallet_payment = total_after_wallet_payment;
            if (trip.trip_type == constant_json.TRIP_TYPE_CORPORATE && corporate) {
                var total_wallet_amount = utils.addWalletHistory(constant_json.USER_UNIQUE_NUMBER, corporate.unique_id, corporate._id, null,
                    corporate.wallet_currency_code, trip.currencycode,
                    trip.wallet_current_rate, wallet_payment, corporate.wallet, constant_json.DEDUCT_WALLET_AMOUNT, constant_json.PAID_TRIP_AMOUNT, "Charge Of This Trip : " + trip.unique_id);
                corporate.wallet = total_wallet_amount;
                await corporate.save();
                user.corporate_wallet_limit = user.corporate_wallet_limit - wallet_payment;
            } else {
                var total_wallet_amount = utils.addWalletHistory(constant_json.USER_UNIQUE_NUMBER, user.unique_id, user._id, null,
                    user.wallet_currency_code, trip.currencycode,
                    trip.wallet_current_rate, wallet_payment, user.wallet, constant_json.DEDUCT_WALLET_AMOUNT, constant_json.PAID_TRIP_AMOUNT, "Charge Of This Trip : " + trip.unique_id);
                user.wallet = total_wallet_amount;
            }
            await user.save();

            total_after_wallet_payment = total_after_wallet_payment - wallet_payment;

            total_after_wallet_payment = Number((total_after_wallet_payment).toFixed(2));
            wallet_payment = Number((wallet_payment).toFixed(2));
            remaining_payment = total - wallet_payment;
            remaining_payment = Number((remaining_payment).toFixed(2));
            trip.wallet_payment += wallet_payment;
            trip.total_after_wallet_payment = total_after_wallet_payment;
            trip.remaining_payment = remaining_payment;
            trip.payment_status = PAYMENT_STATUS.COMPLETED;

            trip.is_paid = 1;
            trip.is_pending_payments = 0;
            trip.card_payment = 0;
            await trip.save()
        }
        
        await utils.trip_provider_profit_card_wallet_settlement(trip, city, provider);
        utils.update_request_status_socket(trip._id);
        if (trip.payment_status == PAYMENT_STATUS.COMPLETED) {
            Trip.findOneAndRemove({ _id: trip._id }).then((deleted_trip) => {
                if (deleted_trip) {
                    var trip_history_data = new Trip_history(JSON.parse(JSON.stringify(deleted_trip)));
                    trip_history_data.save(function () {
                        return res.json({
                            success: true,
                            message: success_messages.MESSAGE_CODE_FOR_PROVIDER_YOUR_TRIP_COMPLETED_SUCCESSFULLY,
                            payment_status: trip.payment_status
                        });
                    });
                } else {
                    return res.json({
                        success: true,
                        message: success_messages.MESSAGE_CODE_FOR_PROVIDER_YOUR_TRIP_COMPLETED_SUCCESSFULLY,
                        payment_status: trip.payment_status
                    });
                }
            });
        } else {
            return res.json({
                success: true,
                message: success_messages.MESSAGE_CODE_FOR_PROVIDER_YOUR_TRIP_COMPLETED_SUCCESSFULLY,
                payment_status: trip.payment_status
            });
        }
    });
}