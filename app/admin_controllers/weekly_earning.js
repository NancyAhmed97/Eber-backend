var Trip_history = require('mongoose').model('Trip_history');
var myUtils = require('../controllers/utils');
var moment = require('moment');
var xl = require('excel4node');
var fs = require("fs");
var console = require('../controllers/console');
var City = require('mongoose').model('City');
var Country = require('mongoose').model('Country');
var Provider_daily_analytic = require('mongoose').model('provider_daily_analytic');
var Provider = require('mongoose').model('Provider');

exports.weekly_earning = function (req, res, next) {
    var page;
    var next;
    var pre;
    var search_item;
    var search_value;
    if (req.body.page == undefined)
    {
        page = 0;
        next = 1;
        pre = 0;
    } else
    {
        page = req.body.page;
        next = parseInt(req.body.page) + 1;
        pre = req.body.page - 1;
    }

    if (req.body.search_item == undefined) {
        search_item = 'provider_detail.first_name';
        search_value = '';

        selected_country = null;
        selected_city = 'all'

    } else {
        search_item = req.body.search_item;
        search_value = req.body.search_value;
        selected_country = req.body.selected_country;
        selected_city = req.body.selected_city;
    }

    var week_start_date_view = "";//lastWeekStartDate.getDate() + ' ' + monthNames[lastWeekStartDate.getMonth()] + ' ' + lastWeekStartDate.getFullYear();
    var week_end_date_view = "";//lastWeekEndDate.getDate() + ' ' + monthNames[lastWeekEndDate.getMonth()] + ' ' + lastWeekEndDate.getFullYear();
    
    if (req.body.weekly_filter != undefined) {

        var weekDuration = req.body.weekly_filter;
        weekDuration = weekDuration.split('-');
        
        week_start_date_view = weekDuration[0];
        week_end_date_view = weekDuration[1];
        
        start_date = new Date(week_start_date_view);
        end_date = new Date(week_end_date_view);
                
        start_date = start_date.setHours(0, 0, 0, 0);
        start_date = new Date(start_date);
        end_date = end_date.setHours(23, 59, 59, 999);
        end_date = new Date(end_date);
    } else {
        var today = new Date();
        end_date = new Date(today.setDate(today.getDate() + 6 - today.getDay()));
        today = new Date(end_date);
        start_date = new Date(today.setDate(today.getDate() - 6));
        
        start_date = start_date.setHours(0, 0, 0, 0);
        start_date = new Date(start_date);
        end_date = end_date.setHours(23, 59, 59, 999);
        end_date = new Date(end_date);
        
        var monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        week_start_date_view = start_date.getDate() + ' ' + monthNames[start_date.getMonth()] + ' ' + start_date.getFullYear();
        week_end_date_view = end_date.getDate() + ' ' + monthNames[end_date.getMonth()] + ' ' + end_date.getFullYear();
    }

    var number_of_rec = 10;

    var lookup = {
        $lookup:
                {
                    from: "providers",
                    localField: "_id",
                    foreignField: "_id",
                    as: "provider_detail"
                }
    };

    var country_filter = {"$match": {}};
    var city_filter = {"$match": {}};
    var city_list = [];
    var mongoose = require("mongoose");
    if (selected_country != 'all') {
        country_filter["$match"]['country_id'] = {$eq: mongoose.Types.ObjectId(selected_country)};
        City.find({countryid: mongoose.Types.ObjectId(selected_country)}, function (error, city) {
            city_list = city;
        })
        if (selected_city != 'all') {
            city_filter["$match"]['city_id'] = {$eq: mongoose.Types.ObjectId(selected_city)};
        }
    }

    value = search_value;
    value = value.replace(/^\s+|\s+$/g, '');
    value = value.replace(/ +(?= )/g, '');
    if (search_item == "provider_detail.first_name")
    {
        var query1 = {};
        var query2 = {};
        var query3 = {};
        var query4 = {};
        var query5 = {};
        var query6 = {};

        var full_name = value.split(' ');
        if (typeof full_name[0] == 'undefined' || typeof full_name[1] == 'undefined') {

            query1[search_item] = {$regex: new RegExp(value, 'i')};
            query2['provider_detail.last_name'] = {$regex: new RegExp(value, 'i')};

            var search = {"$match": {$or: [query1, query2]}};
        } else {

            query1[search_item] = {$regex: new RegExp(value, 'i')};
            query2['provider_detail.last_name'] = {$regex: new RegExp(value, 'i')};
            query3[search_item] = {$regex: new RegExp(full_name[0], 'i')};
            query4['provider_detail.last_name'] = {$regex: new RegExp(full_name[0], 'i')};
            query5[search_item] = {$regex: new RegExp(full_name[1], 'i')};
            query6['provider_detail.last_name'] = {$regex: new RegExp(full_name[1], 'i')};

            var search = {"$match": {$or: [query1, query2, query3, query4, query5, query6]}};
        }
    } else
    {
        var search = {"$match": {}};
        search["$match"][search_item] = {$regex: value};
    }

    ////////////////////////////
    var trip_filter = {"$match": {}};
    trip_filter["$match"]['complete_date_in_city_timezone'] = {$gte: start_date, $lt: end_date};

    ///// For Count number of result /////
    var count = {$group: {_id: null, total: {$sum: 1}, data: {$push: '$data'}}};

    var sort = {"$sort": {}};
    sort["$sort"]['provider_trip_end_time'] = parseInt(-1);

    //// For skip number of result /////
    var skip = {};
    skip["$skip"] = page * 10;
    ///////////////////////////////////

    ///// For limitation on result /////
    var limit = {};
    limit["$limit"] = 10;
    ////////////////////////////////////
    var trip_condition = {'is_trip_completed': 1};
    var trip_condition_new = {$and: [{'is_trip_cancelled_by_user': 1}, {'pay_to_provider': {$gt: 0}}]};
    trip_condition = {$match: {$or: [trip_condition, trip_condition_new]}}

    var provider_weekly_analytic_data = {};
    Country.find({}).then((country_list) => { 
        if (typeof req.session.userid != 'undefined') {

            if (selected_country == null)
            {
                if (country_list.length > 0) {
                    selected_country = country_list[0]._id;
                }
            }
                   
            var trip_group_condition = {
                $group: {
                    _id: '$provider_id',
                    total_trip: {$sum: 1},
                    completed_trip: {$sum: {$cond: [{$eq: ["$is_trip_completed", 1]}, 1, 0]}},

                    total: {$sum: '$total'},
                    provider_have_cash: {$sum: '$provider_have_cash'},
                    provider_service_fees: {$sum: '$provider_service_fees'},
                    pay_to_provider: {$sum: {'$cond': [{$and: [{'$eq': ['$is_provider_earning_set_in_wallet', false]}, {'$eq': ['$is_transfered', false]}]}, '$pay_to_provider', 0]}},
                }
            }

            Trip_history.aggregate([trip_condition, trip_filter, country_filter, city_filter, trip_group_condition, lookup, search, count]).then((array) => { 

                if (array.length == 0) {
                    array = [];
                    res.render('weekly_earning', {detail: array, 'current_page': 1, provider_weekly_analytic: provider_weekly_analytic_data, country_list: country_list, city_list: city_list, type: req.body.type, 'pages': 0, 'next': 1, 'pre': 0, moment: moment , week_start_date_view : week_start_date_view , week_end_date_view : week_end_date_view,search_item,search_value});

                } else {

                    var pages = Math.ceil(array[0].total / number_of_rec);

                    Trip_history.aggregate([trip_condition, trip_filter, country_filter, city_filter, trip_group_condition, lookup, search, sort, skip, limit]).then((array) => { 

                        if (array.length == 0) {
                            array = [];
                            res.render('weekly_earning', {detail: array, 'current_page': 1, provider_weekly_analytic: provider_weekly_analytic_data, country_list: country_list, city_list: city_list, type: req.body.type, 'pages': 0, 'next': 1, 'pre': 0, moment: moment , week_start_date_view : week_start_date_view , week_end_date_view : week_end_date_view,search_item,search_value});

                        } else {
                            var trip_group_condition_total = {
                                $group: {
                                    _id: null,
                                    total_trip: {$sum: 1},
                                    completed_trip: {$sum: {$cond: [{$eq: ["$is_trip_completed", 1]}, 1, 0]}},

                                    total: {$sum: '$total'},
                                    promo_payment: {$sum: '$promo_payment'},
                                    card_payment: {$sum: '$card_payment'},
                                    cash_payment: {$sum: '$cash_payment'},
                                    wallet_payment: {$sum: '$wallet_payment'},
                                    admin_earning: {$sum: {$subtract: ['$total', '$provider_service_fees']}},
                                    admin_earning_in_currency: {$sum: {$subtract: ['$total_in_admin_currency', '$provider_service_fees_in_admin_currency']}},
                                    provider_earning: {$sum: '$provider_service_fees'},
                                    provider_have_cash: {$sum: '$provider_have_cash'},
                                    pay_to_provider: {$sum: {'$cond': [{$and: [{'$eq': ['$is_provider_earning_set_in_wallet', false]}, {'$eq': ['$is_transfered', false]}]}, '$pay_to_provider', 0]}},

                                }
                            }

                            Trip_history.aggregate([trip_condition, trip_filter, country_filter, city_filter, trip_group_condition_total]).then((trip_total) => { 

                                if (trip_total.length == 0) {
                                    array = [];
                                    res.render('weekly_earning', {detail: array, 'current_page': 1, provider_weekly_analytic: provider_weekly_analytic_data, country_list: country_list, city_list: city_list, type: req.body.type, 'pages': 0, 'next': 1, 'pre': 0, moment: moment , week_start_date_view : week_start_date_view , week_end_date_view : week_end_date_view ,search_item,search_value});
                                } else {
                                    res.render('weekly_earning', {detail: array, 'current_page': page, provider_weekly_analytic: provider_weekly_analytic_data, trip_total: trip_total, country_list: country_list, city_list: city_list, type: req.body.type, 'pages': pages, 'next': next, 'pre': pre, moment: moment , week_start_date_view : week_start_date_view , week_end_date_view : week_end_date_view,search_item,search_value});

                                }
                            }, (err) => {
                                console.log(err)
                            });
                        }
                    }, (err) => {
                        console.log(err)
                    });
                }
            }, (err) => {
                console.log(err)
            });
        } else
        {
            res.redirect('/admin');
        }

    });

};

exports.generate_weekly_earning_excel = function (req, res) {
    var array = [];
    if (req.body.page == undefined)
    {
        page = 0;
        next = 1;
        pre = 0;
    } else
    {
        page = req.body.page;
        next = parseInt(req.body.page) + 1;
        pre = req.body.page - 1;
    }

    if (req.body.search_item == undefined) {
        search_item = 'provider_detail.first_name';
        search_value = '';

        selected_country = null;
        selected_city = 'all'

    } else {
        search_item = req.body.search_item;
        search_value = req.body.search_value;
        selected_country = req.body.selected_country;
        selected_city = req.body.selected_city;

    }


    if (req.body.weekly_filter != undefined) {
        var weekDuration = req.body.weekly_filter;
        weekDuration = weekDuration.split('-');
        var array = [];
        start_date = new Date(weekDuration[0]);
        endDateofweek = new Date(weekDuration[1]);
        endDate = endDateofweek.getDate() + 1
        end_date = new Date(endDateofweek.setDate(endDate));
        //}
    } else {
        start_date = new Date(0);
        end_date = new Date(Date.now());
    }

    var number_of_rec = 10;

    var lookup = {
        $lookup:
                {
                    from: "providers",
                    localField: "_id",
                    foreignField: "_id",
                    as: "provider_detail"
                }
    };

    var country_filter = {"$match": {}};
    var city_filter = {"$match": {}};
    var city_list = [];
    var timezone = "";
    var mongoose = require("mongoose");
    if (selected_country != 'all') {
        country_filter["$match"]['country_id'] = {$eq: mongoose.Types.ObjectId(selected_country)};

        City.find({countryid: mongoose.Types.ObjectId(selected_country)}, function (error, city) {
            city_list = city;


        })
        if (selected_city != 'all') {
            city_filter["$match"]['city_id'] = {$eq: mongoose.Types.ObjectId(selected_city)};
        }
    }

    value = search_value;
    value = value.replace(/^\s+|\s+$/g, '');
    value = value.replace(/ +(?= )/g, '');
    if (search_item == "provider_detail.first_name")
    {
        var query1 = {};
        var query2 = {};
        var query3 = {};
        var query4 = {};
        var query5 = {};
        var query6 = {};

        var full_name = value.split(' ');
        if (typeof full_name[0] == 'undefined' || typeof full_name[1] == 'undefined') {

            query1[search_item] = {$regex: new RegExp(value, 'i')};
            query2['provider_detail.last_name'] = {$regex: new RegExp(value, 'i')};

            var search = {"$match": {$or: [query1, query2]}};
        } else {

            query1[search_item] = {$regex: new RegExp(value, 'i')};
            query2['provider_detail.last_name'] = {$regex: new RegExp(value, 'i')};
            query3[search_item] = {$regex: new RegExp(full_name[0], 'i')};
            query4['provider_detail.last_name'] = {$regex: new RegExp(full_name[0], 'i')};
            query5[search_item] = {$regex: new RegExp(full_name[1], 'i')};
            query6['provider_detail.last_name'] = {$regex: new RegExp(full_name[1], 'i')};

            var search = {"$match": {$or: [query1, query2, query3, query4, query5, query6]}};
        }
    } else
    {
        var search = {"$match": {}};
        search["$match"][search_item] = {$regex: value};
    }

    ////////////////////////////

    ///// For date filter /////
    var filter = {"$match": {}};
    filter["$match"]['date_server_timezone'] = {$gte: start_date, $lt: end_date};


    var trip_filter = {"$match": {}};

    ///// For Count number of result /////

    /////////////////////////////////////

    var sort = {"$sort": {}};
    sort["$sort"]['provider_trip_end_time'] = parseInt(-1);

    //// For skip number of result /////
    var skip = {};
    skip["$skip"] = page * 10;
    ///////////////////////////////////

    ///// For limitation on result /////
    var limit = {};
    limit["$limit"] = 10;
    ////////////////////////////////////

    var trip_condition = {$match: {'is_trip_completed': 1}};


    var provider_weekly_analytic_data = {};
    Country.find({}).then((country_list) => { 
        if (typeof req.session.userid != 'undefined') {

            if (selected_country == null)
            {
                selected_country = country_list[0]._id;
            }
            Country.findOne({_id: mongoose.Types.ObjectId(selected_country)}).then((country) => { 
                if (country)
                {
                    timezone = country.country_all_timezone[0];
                }
                if(selected_city == 'all'){
                    selected_city = null
                }
                City.findOne({_id: selected_city}).then((city) => { 
                    if (city)
                    {
                        timezone = city.timezone;
                    }
                    var today_start_date_time = myUtils.get_date_in_city_timezone(start_date, timezone);
                    var today_end_date_time = myUtils.get_date_in_city_timezone(end_date, timezone);

                    trip_filter["$match"]['provider_trip_end_time'] = {$gte: today_start_date_time, $lt: today_end_date_time};

                    var trip_group_condition = {
                        $group: {
                            _id: '$provider_id',
                            total_trip: {$sum: 1},
                            completed_trip: {$sum: {$cond: [{$eq: ["$is_trip_completed", 1]}, 1, 0]}},

                            total: {$sum: '$total'},
                            provider_have_cash: {$sum: '$provider_have_cash'},
                            provider_service_fees: {$sum: '$provider_service_fees'},
                            pay_to_provider: {$sum: '$pay_to_provider'}

                        }

                    }

                    Trip_history.aggregate([trip_condition, trip_filter, country_filter, city_filter, trip_group_condition, lookup, search, sort]).then((array) => { 

                        if (array.length == 0) {
                            array = [];
                            res.render('weekly_earning', {detail: array, 'current_page': 1, provider_weekly_analytic: provider_weekly_analytic_data, country_list: country_list, city_list: city_list, type: req.body.type, 'pages': 0, 'next': 1, 'pre': 0, moment: moment});
                        } else {
                            Trip_history.aggregate([trip_condition, trip_filter, country_filter, city_filter, trip_group_condition, lookup, search, sort]).then((array) => { 

                                if (array.length == 0) {
                                    array = [];
                                    res.render('weekly_earning', {detail: array, 'current_page': 1, provider_weekly_analytic: provider_weekly_analytic_data, country_list: country_list, city_list: city_list, type: req.body.type, 'pages': 0, 'next': 1, 'pre': 0, moment: moment});

                                } else {
                                    var trip_group_condition_total = {
                                        $group: {
                                            _id: null,
                                            total_trip: {$sum: 1},
                                            completed_trip: {$sum: {$cond: [{$eq: ["$is_trip_completed", 1]}, 1, 0]}},

                                            total: {$sum: '$total'},
                                            promo_payment: {$sum: '$promo_payment'},
                                            card_payment: {$sum: '$card_payment'},
                                            cash_payment: {$sum: '$cash_payment'},
                                            wallet_payment: {$sum: '$wallet_payment'},
                                            admin_earning: {$sum: {$subtract: ['$total', '$provider_service_fees']}},
                                            admin_earning_in_currency: {$sum: {$subtract: ['$total_in_admin_currency', '$provider_service_fees_in_admin_currency']}},
                                            provider_earning: {$sum: '$provider_service_fees_in_admin_currency'},
                                            provider_have_cash: {$sum: '$provider_have_cash'},
                                            pay_to_provider: {$sum: '$pay_to_provider'}
                                        }
                                    }

                                    Trip_history.aggregate([trip_condition, trip_filter, country_filter, city_filter, trip_group_condition_total]).then(() => { 

                                        var date = new Date()
                                        var time = date.getTime()
                                        var wb = new xl.Workbook();
                                        var ws = wb.addWorksheet('sheet1');
                                        var col = 1;

                                        ws.cell(1, col++).string(req.__('title_provider_id'));
                                        ws.cell(1, col++).string(req.__('title_name'));
                                        ws.cell(1, col++).string(req.__('title_phone'));
                                        ws.cell(1, col++).string(req.__('title_total'));
                                        ws.cell(1, col++).string(req.__('title_cash'));
                                        ws.cell(1, col++).string(req.__('title_provider_profit'));
                                        ws.cell(1, col++).string(req.__('title_pay_to_provider'));

                                        array.forEach(function (data, index) {
                                            col = 1;
                                            if (data.provider_detail.length > 0) {
                                                ws.cell(index + 2, col++).number(data.provider_detail[0].unique_id);
                                                ws.cell(index + 2, col++).string(data.provider_detail[0].first_name + ' ' + data.provider_detail[0].last_name);
                                                ws.cell(index + 2, col++).string(data.provider_detail[0].country_phone_code + data.provider_detail[0].phone);
                                            } else {
                                                col += 3;
                                            }

                                            ws.cell(index + 2, col++).number(data.total);
                                            ws.cell(index + 2, col++).number(data.provider_have_cash);
                                            ws.cell(index + 2, col++).number(data.provider_service_fees);
                                            ws.cell(index + 2, col++).number(data.pay_to_provider);

                                            if (index == array.length - 1) {
                                                wb.write('data/xlsheet/' + time + '_weekly_earning.xlsx', function (err) {
                                                    if (err) {
                                                        console.error(err);
                                                    } else {
                                                        var url = req.protocol + "://" + req.get('host') + "/xlsheet/" + time + "_weekly_earning.xlsx";
                                                        res.json(url);
                                                        setTimeout(function () {
                                                            fs.unlink('data/xlsheet/' + time + '_weekly_earning.xlsx', function () {
                                                            });
                                                        }, 10000)
                                                    }
                                                });
                                            }
                                        })
                                    }, (err) => {
                                        console.log(err)   
                                    });
                                }
                            }, (err) => {
                                console.log(err)
                            });
                        }
                    }, (err) => {
                        console.log(err)
                    });
                });
            });
        } else
        {
            res.redirect('/admin');
        }
    });
};

exports.statement_provider_weekly_earning = function (req, res) {

    var query = {};
    query['_id'] = req.body.id;

    start_date = new Date(req.body.week_start_date_view);
    end_date = new Date(req.body.week_end_date_view);

    start_date = start_date.setHours(0, 0, 0, 0);
    start_date = new Date(start_date);
    end_date = end_date.setHours(23, 59, 59, 999);
    end_date = new Date(end_date);
    
        
    Provider.findOne(query, function (err, provider) {

        var provider_match_condition = {$match: {'provider_id': {$eq: provider._id}}};
        var provider_daily_analytic_data = [];
        var date_for_tag = new Date(start_date);
        for (var i = 0; i < 7; i++) {
            provider_daily_analytic_data.push(moment(date_for_tag).format(constant_json.DATE_FORMAT_MMM_D_YYYY));
            date_for_tag = moment(date_for_tag).add(1, 'days');
        }
        
        var provider_daily_analytic_query = {$match: {date_tag: {$in: provider_daily_analytic_data}}}
        var group_analytic_data_condition = {
            $group: {
                _id: null,
                received: {$sum: '$received'},
                accepted: {$sum: '$accepted'},
                rejected: {$sum: '$rejected'},
                not_answered: {$sum: '$not_answered'},
                cancelled: {$sum: '$cancelled'},
                completed: {$sum: '$completed'},
                acception_ratio: {$sum: '$acception_ratio'},
                rejection_ratio: {$sum: '$rejection_ratio'},
                cancellation_ratio: {$sum: '$cancellation_ratio'},
                completed_ratio: {$sum: '$completed_ratio'},
                total_online_time: {$sum: '$total_online_time'}
            }
        }



        Provider_daily_analytic.aggregate([provider_match_condition, provider_daily_analytic_query, group_analytic_data_condition]).then((provider_daily_analytic) => { 

            var provider_daily_analytic_data = {};
            if (provider_daily_analytic.length > 0) {
                provider_daily_analytic_data = provider_daily_analytic[0];
                if ((Number(provider_daily_analytic_data.received)) > 0) {
                    received = provider_daily_analytic_data.received;
                    provider_daily_analytic_data.acception_ratio = myUtils.precisionRoundTwo(Number((provider_daily_analytic_data.accepted * 100) / received));
                    provider_daily_analytic_data.cancellation_ratio = myUtils.precisionRoundTwo(Number((provider_daily_analytic_data.cancelled * 100) / received));
                    provider_daily_analytic_data.completed_ratio = myUtils.precisionRoundTwo(Number((provider_daily_analytic_data.completed * 100) / received));
                    provider_daily_analytic_data.rejection_ratio = myUtils.precisionRoundTwo(Number((provider_daily_analytic_data.rejected * 100) / received));
                }
            }

            var provider_condition = {$match: {'provider_id': provider._id}};
            var filter = {"$match": {}};
            filter["$match"]['complete_date_in_city_timezone'] = {$gte: start_date, $lt: end_date};

            var trip_condition = {'is_trip_completed': 1};
            var trip_condition_new = {$and: [{'is_trip_cancelled_by_user': 1}, {'pay_to_provider': {$gt: 0}}]};
            trip_condition = {$match: {$or: [trip_condition, trip_condition_new]}};
            
            var trip_group_condition = {
                $group: {
                    _id: '$provider._id',
                    total_distance: {$sum: '$total_distance'},
                    total_time: {$sum: '$total_time'},
                    total_waiting_time: {$sum: '$total_waiting_time'},
                    total_service_surge_fees: {$sum: '$surge_fee'},
                    service_total: {$sum: '$total_after_surge_fees'},
                    total_cancellation_fees: {$sum: {'$cond': [{$and: [{'$eq': ['$is_trip_cancelled_by_user', 1]}, {'$gt': ['$pay_to_provider',  0]}]}, '$total_service_fees', 0]}},
                    
                    total_provider_tax_fees: {$sum: '$provider_tax_fee'},
                    total_provider_miscellaneous_fees: {$sum: '$provider_miscellaneous_fee'},
                    total_toll_amount: {$sum: '$toll_amount'},
                    total_tip_amount: {$sum: '$tip_amount'},
                    total_provider_service_fees: {$sum: '$provider_service_fees'},

                    total_provider_have_cash: {$sum: {'$cond': [{'$eq': ['$payment_mode', 1]}, '$cash_payment', 0]}},
                    total_deduct_wallet_amount: {$sum: {'$cond': [{'$eq': ['$is_provider_earning_set_in_wallet', true], '$eq': ['$payment_mode', 1]}, '$provider_income_set_in_wallet', 0]}},
                    total_added_wallet_amount: {$sum: {'$cond': [{'$eq': ['$is_provider_earning_set_in_wallet', true], '$eq': ['$payment_mode', 0]}, '$provider_income_set_in_wallet', 0]}},
                    total_paid_in_wallet_payment: {$sum: {'$cond': [{'$eq': ['$is_provider_earning_set_in_wallet', true]}, '$provider_income_set_in_wallet', 0]}},
                    total_transferred_amount: {$sum: {'$cond': [{$and: [{'$eq': ['$is_provider_earning_set_in_wallet', false]}, {'$eq': ['$is_transfered', true]}]}, '$pay_to_provider', 0]}},
                    total_pay_to_provider: {$sum: {'$cond': [{$and: [{'$eq': ['$is_provider_earning_set_in_wallet', false]}, {'$eq': ['$is_transfered', false]}]}, '$pay_to_provider', 0]}},

                    currency: {$first: '$currency'},
                    unit: {$first: '$unit'},
                    statement_number: {$first: '$invoice_number'},
                }
            }
            Trip_history.aggregate([provider_condition, trip_condition, filter, trip_group_condition]).then((array) => { 
                if (array.length == 0) {
                    array = {};
                    res.render('statement_provider_weeklyearning', {detail: array, type: req.body.type, provider_daily_analytic_data: provider_daily_analytic_data, moment: moment});

                } else {
                    res.render('statement_provider_weeklyearning', {detail: array[0], type: req.body.type, provider_daily_analytic_data: provider_daily_analytic_data, moment: moment});
                }
            }, (err) => {
                console.log(err)
            });
        });
    });
};

exports.admin_paidtoprovider = function (req, res) {
    if (typeof req.session.userid != 'undefined') {
        var Provider_weekly_earning = require('mongoose').model('provider_weekly_earning');


        var query = {};
        query['_id'] = req.body.provider_weekly_earning_id;

        Provider_weekly_earning.findOne(query, function (err, provider_weekly_earning) {
            if (err || provider_weekly_earning.length == 0) {
                console.log(err + 'No record found');
            } else {


                provider_weekly_earning.remaining_amount_to_paid = (provider_weekly_earning.remaining_amount_to_paid) - parseFloat(req.body.amount);
                provider_weekly_earning.admin_paid = (provider_weekly_earning.admin_paid) + parseFloat(req.body.amount);

                provider_weekly_earning.save(function (err) {
                    if (err) {
                        console.log(err);
                    } else {
                        res.redirect('/provider_weekly_earning');
                    }
                });
            }
        });
    } else {
        res.redirect('/admin');
    }
};