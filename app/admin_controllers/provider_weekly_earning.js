var Trip_history = require('mongoose').model('Trip_history');

var moment = require('moment');
var xl = require('excel4node');
var fs = require("fs");
var console = require('../controllers/console');
var utils = require('../controllers/utils');
// provider_weekly_earning
exports.provider_weekly_earning = function (req, res, next) {
    var array = [];

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
        sort_order = 1;
        sort_field = 'provider_detail.first_name';
       
    } else {
        search_item = req.body.search_item;
        search_value = req.body.search_value;
        sort_order = req.body.sort_item[1];
        sort_field = req.body.sort_item[0];
        
    }

    if (req.body.weekly_filter != undefined) {
        if (req.body.weekly_filter == 'All') {
            start_date = new Date(0);
            end_date = new Date(Date.now());
        } else {
            var weekDuration = req.body.weekly_filter;
            weekDuration = weekDuration.split('-');
            var array = [];
            var start_date = new Date(weekDuration[0]);
            var endDateofweek = new Date(weekDuration[1]);
            endDate = endDateofweek.getDate() + 1
            end_date = new Date(endDateofweek.setDate(endDate));
        }
    } else {
        start_date = new Date(0);
        end_date = new Date(Date.now());
    }

    var number_of_rec = 10;
 
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
    ///// For date filter /////
    var filter = {"$match": {}};
    filter["$match"]['provider_trip_end_time'] = {$gte: start_date, $lt: end_date};

    ///// For sort by field /////
    var sort = {"$sort": {}};
    sort["$sort"][sort_field] = parseInt(sort_order);
   
    ///// For Count number of result /////
    /////////////////////////////////////

    //// For skip number of result /////
    var skip = {};
    skip["$skip"] = page * 10

    ///// For limitation on result /////
    var limit = {};
    limit["$limit"] = 10

    if (typeof req.session.provider != 'undefined') {

        var timezone_for_display_date = setting_detail.timezone_for_display_date;
        var mongoose = require('mongoose');
        var Schema = mongoose.Types.ObjectId;
        var condition = {$match: {'confirmed_provider': {$eq: Schema(req.session.provider._id)}}};
        var trip_condition = {$match: {'is_trip_completed': {$eq: 1}}};

        Trip_history.aggregate([condition, trip_condition, filter]).then((array) => { 
            if (array.length == 0) {
                array = [];
                res.render('provider_panel_weekly_earning', {detail: array, timezone_for_display_date: timezone_for_display_date,
                    'current_page': 1, type: req.body.type, 'pages': 0, 'next': 1, 'pre': 0, moment: moment, sort_field, sort_order, search_item, search_value, filter_start_date, filter_end_date});
            } else {
                var pages = Math.ceil(array[0].total / number_of_rec);
                Trip_history.aggregate([condition, trip_condition, filter]).then((array) => { 

                    if (array.length == 0) {
                        array = [];
                        res.render('provider_panel_weekly_earning', {detail: array, timezone_for_display_date: timezone_for_display_date,
                            'current_page': 1, type: req.body.type, 'pages': 0, 'next': 1, 'pre': 0, moment: moment, sort_field, sort_order, search_item, search_value, filter_start_date, filter_end_date
                        });

                    } else {

                        Trip_history.aggregate([condition, trip_condition, filter]).then((trip_total) => { 

                            if (trip_total.length == 0) {
                                array = [];
                                res.render('provider_panel_weekly_earning', {detail: array, timezone_for_display_date: timezone_for_display_date,
                                    'current_page': 1, type: req.body.type, 'pages': 0, 'next': 1, 'pre': 0, moment: moment, sort_field, sort_order, search_item, search_value, filter_start_date, filter_end_date
                                });
                            } else {
                                res.render('provider_panel_weekly_earning', {detail: array, timezone_for_display_date: timezone_for_display_date,
                                    'current_page': page, trip_total: trip_total, type: req.body.type, 'pages': pages, 'next': next, 'pre': pre, moment: moment, sort_field, sort_order, search_item, search_value, filter_start_date, filter_end_date
                                });
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

    } else
    {
        res.redirect('/provider_login');
    }
    
};

exports.provider_weekly_earning_export_excel = function (req, res) {
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
        sort_order = 1;
        sort_field = 'provider_detail.first_name';
       
    } else {
        search_item = req.body.search_item;
        search_value = req.body.search_value;
        sort_order = req.body.sort_item[1];
        sort_field = req.body.sort_item[0];
        
    }

    if (req.body.weekly_filter != undefined) {
        if (req.body.weekly_filter == 'All') {
            start_date = new Date(0);
            end_date = new Date(Date.now());
        } else {
            var weekDuration = req.body.weekly_filter;
            weekDuration = weekDuration.split('-');
            var array = [];
            var start_date = new Date(weekDuration[0]);
            var endDateofweek = new Date(weekDuration[1]);
            endDate = endDateofweek.getDate() + 1
            end_date = new Date(endDateofweek.setDate(endDate));
        }
    } else {
        start_date = new Date(0);
        end_date = new Date(Date.now());
    }




    var number_of_rec = 10;

    ///// For search string /////


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
    ///// For date filter /////
    var filter = {"$match": {}};
    filter["$match"]['provider_trip_end_time'] = {$gte: start_date, $lt: end_date};


    ///// For sort by field /////
    var sort = {"$sort": {}};
    sort["$sort"][sort_field] = parseInt(sort_order);


    
    if (typeof req.session.provider != 'undefined') {
            var timezone_for_display_date = setting_detail.timezone_for_display_date;
            var mongoose = require('mongoose');
            var Schema = mongoose.Types.ObjectId;
            var condition = {$match: {'confirmed_provider': {$eq: Schema(req.session.provider._id)}}};
            var trip_condition = {$match: {'is_trip_completed': {$eq: 1}}};


            Trip_history.aggregate([condition, trip_condition, filter]).then((array) => { 
                if (array.length == 0) {
                    array = [];
                    res.render('provider_panel_weekly_earning', {detail: array, timezone_for_display_date: timezone_for_display_date,
                        'current_page': 1, type: req.body.type, 'pages': 0, 'next': 1, 'pre': 0, moment: moment});

                } else {

                    Trip_history.aggregate([condition, trip_condition, filter]).then((array) => { 

                        if (array.length == 0) {
                            array = [];
                            res.render('provider_panel_weekly_earning', {detail: array, timezone_for_display_date: timezone_for_display_date,
                                'current_page': 1, type: req.body.type, 'pages': 0, 'next': 1, 'pre': 0, moment: moment});

                        } else {

                              Trip_history.aggregate([condition, trip_condition, filter]).then(() => { 

                                var date = new Date()
                                var time = date.getTime()
                                var wb = new xl.Workbook();
                                var ws = wb.addWorksheet('sheet1');
                                var col = 1;

                                ws.cell(1, col++).string(req.__('title_trip_id'));
                                ws.cell(1, col++).string(req.__('title_trip_end_date'));
                                ws.cell(1, col++).string(req.__('title_total'));
                                ws.cell(1, col++).string(req.__('title_cash'));
                                ws.cell(1, col++).string(req.__('title_provider_profit'));
                                ws.cell(1, col++).string(req.__('title_pay_to_provider'));

                                array.forEach(function (data, index) {
                                    col = 1;
                                    ws.cell(index + 2, col++).number(data.unique_id);
                                    ws.cell(index + 2, col++).string(moment(data.provider_trip_end_time).format("DD MMM 'YY") + ' ' + moment(data.created_at).format("hh:mm a"));
                                    ws.cell(index + 2, col++).number(data.total);
                                    ws.cell(index + 2, col++).number(data.provider_have_cash);
                                    ws.cell(index + 2, col++).number(data.provider_service_fees);
                                    ws.cell(index + 2, col++).number(data.pay_to_provider);

                                    if (index == array.length - 1) {
                                        wb.write('data/xlsheet/' + time + '_provider_weekly_earning.xlsx', function (err) {
                                            if (err) {
                                                console.error(err);
                                            } else {
                                                var url = req.protocol + "://" + req.get('host') + "/xlsheet/" + time + "_provider_weekly_earning.xlsx";
                                                res.json(url);
                                                setTimeout(function () {
                                                    fs.unlink('data/xlsheet/' + time + '_provider_weekly_earning.xlsx', function () {
                                                    });
                                                }, 10000)
                                            }
                                        });
                                    }
                                })
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
    } else
    {
        res.redirect('/provider_login');
    }
};