var Trip_history = require('mongoose').model('Trip_history');
var utils = require('../controllers/utils');
var moment = require('moment');
var City = require('mongoose').model('City');
var Country = require('mongoose').model('Country');
var xl = require('excel4node');
var fs = require("fs");
var console = require('../controllers/console');


exports.trip_earning = function (req, res, next) {
    var page;
    var next;
    var pre;
    var search_item;
    var search_value;
    var sort_order;
    var sort_field;
    var filter_start_date;
    var filter_end_date;
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
        filter_start_date = '';
        filter_end_date = '';
        selected_country = null;
        selected_city = null

    } else {
        search_item = req.body.search_item;
        search_value = req.body.search_value;
        selected_country = req.body.selected_country;
        selected_city = req.body.selected_city;
        filter_start_date = req.body.start_date;
        filter_end_date = req.body.end_date;
    }

    if (req.body.start_date == '' || req.body.start_date == undefined) {
        var date = new Date(Date.now());
        start_date = date.setHours(0, 0, 0, 0);
        start_date = new Date(start_date);
        end_date = date.setHours(23, 59, 59, 999);
        end_date = new Date(end_date);

    } else {
        var start_date = req.body.start_date;
        start_date = new Date(start_date);
        start_date = start_date.setHours(0, 0, 0, 0);
        start_date = new Date(start_date);

        var end_date = req.body.end_date;
        end_date = new Date(end_date);
        end_date = end_date.setHours(23, 59, 59, 999);
        end_date = new Date(end_date);
    }

    var number_of_rec = 10;
    var lookup = {
        $lookup:
        {
            from: "providers",
            localField: "current_provider",
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

    var trip_filter = {"$match": {}};
    ///// For Count number of result /////
    var count = {$group: {_id: null, total: {$sum: 1}, data: {$push: '$data'}}};
    /////////////////////////////////////

    //// For skip number of result /////
    var skip = {};
    skip["$skip"] = page * 10;
    ///////////////////////////////////

    ///// For limitation on result /////
    var limit = {};
    limit["$limit"] = 10;
    ////////////////////////////////////

    var sort = {"$sort": {}};
    sort["$sort"]['provider_trip_end_time'] = parseInt(-1);


    var provider_weekly_analytic_data = {};

    Country.find({}).then((country_list) => { 
        var timezone_for_display_date = setting_detail.timezone_for_display_date;
        if (typeof req.session.userid != 'undefined') {

            if (selected_country == null)
            {
                if (country_list.length > 0) {
                    selected_country = country_list[0]._id;
                }
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

                    if (timezone != "") {
                        var today_start_date_time = utils.get_date_in_city_timezone(start_date, timezone);
                        var today_end_date_time = utils.get_date_in_city_timezone(end_date, timezone);
                        trip_filter["$match"]['provider_trip_end_time'] = {$gte: today_start_date_time, $lt: today_end_date_time};
                    }

                    Trip_history.aggregate([trip_filter, country_filter, city_filter, lookup, search, count]).then((array) => { 

                        if (array.length == 0) {
                            array = [];
                            res.render('trip_earning', { detail: array, 'current_page': 1, provider_weekly_analytic: provider_weekly_analytic_data, country_list: country_list, city_list: city_list, type: req.body.type, 'pages': 0, 'next': 1, 'pre': 0, moment: moment, sort_field, sort_order, search_item, search_value, filter_start_date, filter_end_date });

                        } else
                        {
                            var pages = Math.ceil(array[0].total / number_of_rec);
                            Trip_history.aggregate([trip_filter, country_filter, city_filter, lookup, search, sort, skip, limit]).then((array) => { 

                                if (array.length == 0) {
                                    array = [];
                                    res.render('trip_earning', { detail: array, 'current_page': 1, provider_weekly_analytic: provider_weekly_analytic_data, country_list: country_list, city_list: city_list, type: req.body.type, 'pages': 0, 'next': 1, 'pre': 0, moment: moment, sort_field, sort_order, search_item, search_value, filter_start_date, filter_end_date });

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

                                    Trip_history.aggregate([trip_filter, country_filter, city_filter, trip_group_condition_total]).then((trip_total) => { 

                                        if (trip_total.length == 0) {
                                            array = [];
                                            res.render('trip_earning', { detail: array, 'current_page': 1, provider_weekly_analytic: provider_weekly_analytic_data, country_list: country_list, city_list: city_list, type: req.body.type, 'pages': 0, 'next': 1, 'pre': 0, moment: moment, sort_field, sort_order, search_item, search_value, filter_start_date, filter_end_date });
                                        } else {
                                            res.render('trip_earning', { detail: array, timezone_for_display_date: timezone_for_display_date, 'current_page': page, provider_weekly_analytic: provider_weekly_analytic_data, trip_total: trip_total, country_list: country_list, city_list: city_list, type: req.body.type, 'pages': pages, 'next': next, 'pre': pre, moment: moment, sort_field, sort_order, search_item, search_value, filter_start_date, filter_end_date });

                                        }
                                    }, (err) => {
                                        utils.error_response(err, res)
                                    });
                                }
                            }, (err) => {
                                utils.error_response(err, res)
                            });
                        }
                    }, (err) => {
                        utils.error_response(err, res)
                    });
                });
});
} else
{
    res.redirect('/admin');
}

});

}

exports.generate_trip_earning_excel = function (req, res) {
    if (req.body.page == undefined) {
        page = 0;
        next = 1;
        pre = 0;
    } else {
        page = req.body.page;
        next = parseInt(req.body.page) + 1;
        pre = req.body.page - 1;
    }

    if (req.body.search_item == undefined) {
        search_item = 'provider_detail.first_name';
        search_value = '';
        filter_start_date = '';
        filter_end_date = '';
        selected_country = null;
        selected_city = 'all'

    } else {
        search_item = req.body.search_item;
        search_value = req.body.search_value;
        selected_country = req.body.selected_country;
        selected_city = req.body.selected_city;
        filter_start_date = req.body.start_date;
        filter_end_date = req.body.end_date;
    }

    if (req.body.start_date == '' || req.body.start_date == undefined) {
        var date = new Date(Date.now());
        start_date = date.setHours(0, 0, 0, 0);
        start_date = new Date(start_date);
        end_date = date.setHours(23, 59, 59, 999);
        end_date = new Date(end_date);

    } else {
        var start_date = req.body.start_date;
        start_date = new Date(start_date);
        start_date = start_date.setHours(0, 0, 0, 0);
        start_date = new Date(start_date);

        var end_date = req.body.end_date;
        end_date = new Date(end_date);
        end_date = end_date.setHours(23, 59, 59, 999);
        end_date = new Date(end_date);
    }

    var lookup = {
        $lookup:
        {
            from: "providers",
            localField: "current_provider",
            foreignField: "_id",
            as: "provider_detail"
        }
    };

    var country_filter = { "$match": {} };
    var city_filter = { "$match": {} };
    var city_list = [];
    var timezone = "";
    var mongoose = require("mongoose");
    if (selected_country != 'all') {
        country_filter["$match"]['country_id'] = { $eq: mongoose.Types.ObjectId(selected_country) };

        City.find({ countryid: mongoose.Types.ObjectId(selected_country) }, function (error, city) {
            city_list = city;
        })
        if (selected_city != 'all') {
            city_filter["$match"]['city_id'] = { $eq: mongoose.Types.ObjectId(selected_city) };
        }
    }

    value = search_value;
    value = value.replace(/^\s+|\s+$/g, '');
    value = value.replace(/ +(?= )/g, '');
    if (search_item == "provider_detail.first_name") {
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
        var search = { "$match": {} };
        search["$match"][search_item] = { $regex: value };
    }

    ////////////////////////////
    var trip_filter = { "$match": {} };

    ///// For Count number of result /////
    /////////////////////////////////////

    //// For skip number of result /////
    var skip = {};
    skip["$skip"] = page * 10;
    ///////////////////////////////////

    ///// For limitation on result /////
    var limit = {};
    limit["$limit"] = 10;
    ////////////////////////////////////

    var sort = { "$sort": {} };
    sort["$sort"]['provider_trip_end_time'] = parseInt(-1);

    var provider_weekly_analytic_data = {};

    Country.find({}).then((country_list) => {

        if (typeof req.session.userid != 'undefined') {

            if (selected_country == null) {
                selected_country = country_list[0]._id;
            }
            Country.findOne({ _id: mongoose.Types.ObjectId(selected_country) }).then((country) => {
                if (country) {
                    timezone = country.country_all_timezone[0];
                }

                if (selected_city == 'all') {
                    selected_city = null
                }
                City.findOne({ _id: selected_city }).then((city) => {
                    if (city) {
                        timezone = city.timezone;
                    }
                    var today_start_date_time = utils.get_date_in_city_timezone(start_date, timezone);
                    var today_end_date_time = utils.get_date_in_city_timezone(end_date, timezone);

                    trip_filter["$match"]['provider_trip_end_time'] = { $gte: today_start_date_time, $lt: today_end_date_time };
                    Trip_history.aggregate([trip_filter, country_filter, city_filter, lookup, search, sort]).then((array) => {

                        if (array.length == 0) {
                            array = [];
                            res.render('trip_earning', { detail: array, 'current_page': 1, provider_weekly_analytic: provider_weekly_analytic_data, country_list: country_list, city_list: city_list, type: req.body.type, 'pages': 0, 'next': 1, 'pre': 0, moment: moment });

                        } else {
                            Trip_history.aggregate([trip_filter, country_filter, city_filter, lookup, search, sort]).then((array) => {

                                if (array.length == 0) {
                                    array = [];
                                    res.render('trip_earning', { detail: array, 'current_page': 1, provider_weekly_analytic: provider_weekly_analytic_data, country_list: country_list, city_list: city_list, type: req.body.type, 'pages': 0, 'next': 1, 'pre': 0, moment: moment });

                                } else {

                                    var trip_group_condition_total = {
                                        $group: {
                                            _id: null,
                                            total_trip: { $sum: 1 },
                                            completed_trip: { $sum: { $cond: [{ $eq: ["$is_trip_completed", 1] }, 1, 0] } },
                                            total: { $sum: '$total' },
                                            promo_payment: { $sum: '$promo_payment' },
                                            card_payment: { $sum: '$card_payment' },
                                            cash_payment: { $sum: '$cash_payment' },
                                            wallet_payment: { $sum: '$wallet_payment' },
                                            admin_earning: { $sum: { $subtract: ['$total', '$provider_service_fees'] } },
                                            admin_earning_in_currency: { $sum: { $subtract: ['$total_in_admin_currency', '$provider_service_fees_in_admin_currency'] } },
                                            provider_earning: { $sum: '$provider_service_fees_in_admin_currency' },
                                            provider_have_cash: { $sum: '$provider_have_cash' },
                                            pay_to_provider: { $sum: '$pay_to_provider' }
                                        }
                                    }

                                    Trip_history.aggregate([trip_filter, country_filter, city_filter, trip_group_condition_total]).then(() => {

                                        var date = new Date()
                                        var time = date.getTime()
                                        var wb = new xl.Workbook();
                                        var ws = wb.addWorksheet('sheet1');
                                        var col = 1;

                                        ws.cell(1, col++).string(req.__('title_trip_id'));
                                        ws.cell(1, col++).string(req.__('title_trip_end_date'));
                                        ws.cell(1, col++).string(req.__('title_provider_id'));
                                        ws.cell(1, col++).string(req.__('title_name'));
                                        ws.cell(1, col++).string(req.__('email_title_phone'));
                                        ws.cell(1, col++).string(req.__('title_total'));
                                        ws.cell(1, col++).string(req.__('title_cash'));
                                        ws.cell(1, col++).string(req.__('title_provider_profit'));
                                        ws.cell(1, col++).string(req.__('title_pay_to_provider'));

                                        array.forEach(function (data, index) {
                                            col = 1;
                                            ws.cell(index + 2, col++).number(data.unique_id);
                                            ws.cell(index + 2, col++).string(moment(data.provider_trip_end_time).format("DD MMM 'YY") + ' ' + moment(data.created_at).format("hh:mm a"));

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
                                                wb.write('data/xlsheet/' + time + '_trip_earning.xlsx', function (err) {
                                                    if (err) {
                                                        console.error(err);
                                                    } else {
                                                        var url = req.protocol + "://" + req.get('host') + "/xlsheet/" + time + "_trip_earning.xlsx";
                                                        res.json(url);
                                                        setTimeout(function () {
                                                            fs.unlink('data/xlsheet/' + time + '_trip_earning.xlsx', function () {
                                                            });
                                                        }, 10000)
                                                    }
                                                });
                                            }
                                        });
                                    }, (err) => {
                                        utils.error_response(err, res)
                                    });
                                }
                            }, (err) => {
                                utils.error_response(err, res)
                            });
                        }
                    }, (err) => {
                        utils.error_response(err, res)
                    });
                });
            });
        } else {
            res.redirect('/admin');
        }
    });

}