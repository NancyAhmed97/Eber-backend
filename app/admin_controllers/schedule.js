var utils = require('../controllers/utils');
var Trip = require('mongoose').model('Trip');
var moment = require("moment");
var fs = require("fs");
var xl = require('excel4node');
var console = require('../controllers/console');

exports.Schedules_list = function (req, res, next) {
    if (typeof req.session.userid != 'undefined') {
        
        var query = {};
        var page;
        var next;
        var pre;
        var search_item;
        var search_value;
        var sort_order;
        var sort_field;
        var filter_start_date;
        var filter_end_date;
        var payment;
        query['is_trip_created'] = 0;

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

        if (req.body.search_item == undefined)
        {

            search_item = 'user_detail.first_name';
            search_value = '';
            sort_order = -1;
            sort_field = 'unique_id';
            filter_start_date = '';
            filter_end_date = '';

            var start_date = '';
            var end_date = '';
            payment = 2;
        } else
        {
            var value = req.body.search_value;
            value = value.replace(/^\s+|\s+$/g, '');
            value = value.replace(/ +(?= )/g, '');
            value = new RegExp(value, 'i');


            sort_order = req.body.sort_item[1];
            sort_field = req.body.sort_item[0];
            search_item = req.body.search_item
            search_value = req.body.search_value;
            filter_start_date = req.body.start_date;
            filter_end_date = req.body.end_date;

            var start_date = req.body.start_date;
            var end_date = req.body.end_date;
            payment = Number(req.body.payment);
        }
        var filter = {"$match": {}};

        if (req.body.start_date == '' || req.body.end_date == '') {
            if (req.body.start_date == '' && req.body.end_date == '') {
                date = new Date(Date.now());
                date = utils.dateWithTimeZone(setting_detail.timezone_for_display_date,date);
                filter["$match"]['server_start_time_for_schedule'] = {$gte: date};
            } else if (req.body.start_date == '') {
                var start_date = req.body.end_date;
                var end_date = req.body.end_date;
                start_date = new Date(start_date);
                start_date = start_date.setHours(0, 0, 0, 0);
                start_date = new Date(start_date);
                end_date = new Date(end_date);
                end_date = end_date.setHours(11, 59, 59, 999);
                end_date = new Date(end_date);
                start_date = utils.dateWithTimeZone(setting_detail.timezone_for_display_date, start_date);
                end_date = utils.dateWithTimeZone(setting_detail.timezone_for_display_date, end_date);
                filter["$match"]['server_start_time_for_schedule'] = {$gte: start_date, $lt: end_date};
            } else {
                var start_date = req.body.start_date;
                var end_date = req.body.start_date;
                start_date = new Date(start_date);
                start_date = start_date.setHours(0, 0, 0, 0);
                start_date = new Date(start_date);
                end_date = new Date(end_date);
                end_date = end_date.setHours(11, 59, 59, 999);
                end_date = new Date(end_date);
                start_date = utils.dateWithTimeZone(setting_detail.timezone_for_display_date, start_date);
                end_date = utils.dateWithTimeZone(setting_detail.timezone_for_display_date, end_date);
                filter["$match"]['server_start_time_for_schedule'] = {$gte: start_date, $lt: end_date};
            }
        } else if (req.body.start_date == undefined || req.body.end_date == undefined) {
            var date = new Date(Date.now());
            date = utils.dateWithTimeZone(setting_detail.timezone_for_display_date,date);
            filter["$match"]['server_start_time_for_schedule'] = {$gte: date};
        } else {
            var start_date = req.body.start_date;
            var end_date = req.body.end_date;
            start_date = new Date(start_date);
            start_date = start_date.setHours(0, 0, 0, 0);
            start_date = new Date(start_date);
            end_date = new Date(end_date);
            end_date = end_date.setHours(11, 59, 59, 999);
            end_date = new Date(end_date);
            start_date = utils.dateWithTimeZone(setting_detail.timezone_for_display_date, start_date);
            end_date = utils.dateWithTimeZone(setting_detail.timezone_for_display_date, end_date);
            filter["$match"]['server_start_time_for_schedule'] = {$gte: start_date, $lt: end_date};
        }

        var number_of_rec = 10;

        var lookup = {
            $lookup:
                    {
                        from: "users",
                        localField: "user_id",
                        foreignField: "_id",
                        as: "user_detail"
                    }
        };
        var unwind = {$unwind: "$user_detail"};



        value = search_value;
        value = value.replace(/^\s+|\s+$/g, '');
        value = value.replace(/ +(?= )/g, '');

        if (search_item == "user_detail.first_name")
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
                query2['user_detail.last_name'] = {$regex: new RegExp(value, 'i')};

                var search = {"$match": {$or: [query1, query2]}};
            } else {

                query1[search_item] = {$regex: new RegExp(value, 'i')};
                query2['user_detail.last_name'] = {$regex: new RegExp(value, 'i')};
                query3[search_item] = {$regex: new RegExp(full_name[0], 'i')};
                query4['user_detail.last_name'] = {$regex: new RegExp(full_name[0], 'i')};
                query5[search_item] = {$regex: new RegExp(full_name[1], 'i')};
                query6['user_detail.last_name'] = {$regex: new RegExp(full_name[1], 'i')};

                var search = {"$match": {$or: [query1, query2, query3, query4, query5, query6]}};
            }
        } else
        {

            var search = {"$match": {search_item: {$regex: new RegExp(value, 'i')}}};
        }



        var sort = {"$sort": {}};
        sort["$sort"][sort_field] = parseInt(sort_order);

        var count = {$group: {_id: null, total: {$sum: 1}, data: {$push: '$data'}}};

        var skip = {};
        skip["$skip"] = page * number_of_rec;

        var limit = {};
        limit["$limit"] = number_of_rec;

        var condition = {$match: {'is_schedule_trip': {$eq: true}}};

        var payment_condition = {$match: {}};
        if (payment !== 2) {
            payment_condition['$match']['payment_mode'] = {$eq: payment}
        }

        var condition2 = {$match: {'is_trip_completed': {$eq: 0}}};
        var condition3 = {$match: {'is_trip_end': {$eq: 0}}};
        var condition4 = {$match: {'provider_id': {$eq: null}}};
        var condition5 = {$match: {'current_provider': {$eq: null}}};

        Trip.aggregate([condition, payment_condition, condition2, condition3, condition4, condition5, lookup, unwind, search, filter, count]).then((array) => { 
       
            if (!array || array.length == 0)
            {
                array = [];
                res.render('schedules_list', { detail: array, 'current_page': 1, 'pages': 0, 'next': 1, 'pre': 0, moment: moment, sort_field, sort_order, search_item, search_value, filter_start_date, filter_end_date, payment });
            } else
            {
                var pages = Math.ceil(array[0].total / number_of_rec);
                Trip.aggregate([condition, payment_condition, condition2, condition3, condition4, condition5, lookup, unwind, search, filter, sort, skip, limit]).then((array) => { 
                    res.render('schedules_list', { detail: array, scheduled_request_pre_start_minute: setting_detail.scheduled_request_pre_start_minute, 'current_page': page, 'pages': pages, 'next': next, 'pre': pre, moment: moment, sort_field, sort_order, search_item, search_value, filter_start_date, filter_end_date, payment });
                    delete message;
                }, (err) => {
                    utils.error_response(err, res)
                });
            }
        }, (err) => {
            utils.error_response(err, res)
        });
    } else {
        res.redirect('/admin');
    }

};

exports.genetare_schedules_request_excel = function (req, res) {
    if (typeof req.session.userid != 'undefined') {
        var query = {};
        var page;
        var next;
        var pre;
        var search_item;
        var search_value;
        var sort_order;
        var sort_field;
        var filter_start_date;
        var filter_end_date;
        var status;
        query['is_trip_created'] = 0;

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

        if (req.body.search_item == undefined)
        {

            search_item = 'user_detail.first_name';
            search_value = '';
            sort_order = -1;
            sort_field = 'unique_id';
            filter_start_date = '';
            filter_end_date = '';

            var start_date = '';
            var end_date = '';
            status = 0;
        } else
        {
            var value = req.body.search_value;
            value = value.replace(/^\s+|\s+$/g, '');
            value = value.replace(/ +(?= )/g, '');
            value = new RegExp(value, 'i');


            sort_order = req.body.sort_item[1];
            sort_field = req.body.sort_item[0];
            search_item = req.body.search_item
            search_value = req.body.search_value;
            filter_start_date = req.body.start_date;
            filter_end_date = req.body.end_date;

            var start_date = req.body.start_date;
            var end_date = req.body.end_date;
            status = Number(req.body.status);
        }
        var filter = {"$match": {}};

        if (req.body.start_date == '' || req.body.end_date == '') {
            if (req.body.start_date == '' && req.body.end_date == '') {
                date = new Date(Date.now());
                date = utils.dateWithTimeZone(setting_detail.timezone_for_display_date,date);
                filter["$match"]['server_start_time_for_schedule'] = {$gte: date};
            } else if (req.body.start_date == '') {
                var start_date = req.body.end_date;
                var end_date = req.body.end_date;
                start_date = new Date(start_date);
                start_date = start_date.setHours(0, 0, 0, 0);
                start_date = new Date(start_date);
                end_date = new Date(end_date);
                end_date = end_date.setHours(11, 59, 59, 999);
                end_date = new Date(end_date);
                start_date = utils.dateWithTimeZone(setting_detail.timezone_for_display_date, start_date);
                end_date = utils.dateWithTimeZone(setting_detail.timezone_for_display_date, end_date);
                filter["$match"]['server_start_time_for_schedule'] = {$gte: start_date, $lt: end_date};
            } else {
                var start_date = req.body.start_date;
                var end_date = req.body.start_date;
                start_date = new Date(start_date);
                start_date = start_date.setHours(0, 0, 0, 0);
                start_date = new Date(start_date);
                end_date = new Date(end_date);
                end_date = end_date.setHours(11, 59, 59, 999);
                end_date = new Date(end_date);
                start_date = utils.dateWithTimeZone(setting_detail.timezone_for_display_date, start_date);
                end_date = utils.dateWithTimeZone(setting_detail.timezone_for_display_date, end_date);
                filter["$match"]['server_start_time_for_schedule'] = {$gte: start_date, $lt: end_date};
            }
        } else if (req.body.start_date == undefined || req.body.end_date == undefined) {
            var date = new Date(Date.now());
            date = utils.dateWithTimeZone(setting_detail.timezone_for_display_date,date);
            filter["$match"]['server_start_time_for_schedule'] = {$gte: date};
        } else {
            var start_date = req.body.start_date;
            var end_date = req.body.end_date;
            start_date = new Date(start_date);
            start_date = start_date.setHours(0, 0, 0, 0);
            start_date = new Date(start_date);
            end_date = new Date(end_date);
            end_date = end_date.setHours(11, 59, 59, 999);
            end_date = new Date(end_date);
            start_date = utils.dateWithTimeZone(setting_detail.timezone_for_display_date, start_date);
            end_date = utils.dateWithTimeZone(setting_detail.timezone_for_display_date, end_date);
            filter["$match"]['server_start_time_for_schedule'] = {$gte: start_date, $lt: end_date};
        }

        var number_of_rec = 10;

        var lookup = {
            $lookup:
                    {
                        from: "users",
                        localField: "user_id",
                        foreignField: "_id",
                        as: "user_detail"
                    }
        };
        var unwind = {$unwind: "$user_detail"};



        value = search_value;
        value = value.replace(/^\s+|\s+$/g, '');
        value = value.replace(/ +(?= )/g, '');

        if (search_item == "user_detail.first_name")
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
                query2['user_detail.last_name'] = {$regex: new RegExp(value, 'i')};

                var search = {"$match": {$or: [query1, query2]}};
            } else {

                query1[search_item] = {$regex: new RegExp(value, 'i')};
                query2['user_detail.last_name'] = {$regex: new RegExp(value, 'i')};
                query3[search_item] = {$regex: new RegExp(full_name[0], 'i')};
                query4['user_detail.last_name'] = {$regex: new RegExp(full_name[0], 'i')};
                query5[search_item] = {$regex: new RegExp(full_name[1], 'i')};
                query6['user_detail.last_name'] = {$regex: new RegExp(full_name[1], 'i')};

                var search = {"$match": {$or: [query1, query2, query3, query4, query5, query6]}};
            }
        } else
        {

            var search = {"$match": {search_item: {$regex: new RegExp(value, 'i')}}};
        }



        var sort = {"$sort": {}};
        sort["$sort"][sort_field] = parseInt(sort_order);


        var skip = {};
        skip["$skip"] = page * number_of_rec;

        var limit = {};
        limit["$limit"] = number_of_rec;

        var condition = {$match: {'is_schedule_trip': {$eq: true}}};
        var condition1 = {$match:{}};
        if(req.body.status == 0)
        {
            condition1 = {$match: {'is_trip_cancelled': {$eq: 0}}};
        }
        if(req.body.status == 2)
        {
            condition1 = {$match: {'is_trip_cancelled': {$eq: 1}}};
        }
        var condition2 = {$match: {'is_trip_completed': {$eq: 0}}};
        var condition3 = {$match: {'is_trip_end': {$eq: 0}}};
        var condition4 = {$match: {'provider_id': {$eq: null}}};
        var condition5 = {$match: {'current_provider': {$eq: null}}};

        Trip.aggregate([condition, condition1, condition2, condition3, condition4, condition5, lookup, unwind, search, filter]).then((array) => { 

            var date = new Date()
            var time = date.getTime()

            var wb = new xl.Workbook();
            var ws = wb.addWorksheet('sheet1');
            var col = 1;

            ws.cell(1, col++).string(req.__('title_id'));
            ws.cell(1, col++).string(req.__('title_creation_time'));
            ws.cell(1, col++).string(req.__('title_timezone'));
            ws.cell(1, col++).string(req.__('title_city_time'));
            ws.cell(1, col++).string(req.__('title_user'));
            ws.cell(1, col++).string(req.__('title_status'));
            ws.cell(1, col++).string(req.__('title_pickup_address'));
            ws.cell(1, col++).string(req.__('title_destination_address'));
            ws.cell(1, col++).string(req.__('title_payment'));
            
            array.forEach(function (data, index) {
                col = 1;
                ws.cell(index + 2, col++).number(data.unique_id);
                ws.cell(index + 2, col++).string(moment(data.created_at).tz(setting_detail.timezone_for_display_date).format('DD MMM YYYY HH:mm a'));
                ws.cell(index + 2, col++).string(data.timezone);
                ws.cell(index + 2, col++).string(moment(data.server_start_time_for_schedule).tz(setting_detail.timezone_for_display_date).format('DD MMM YYYY HH:mm a'));
                ws.cell(index + 2, col++).string(data.user_detail.first_name + ' ' + data.user_detail.last_name);

                if (data.is_trip_cancelled == 1) {
                    ws.cell(index + 2, col++).string(req.__('title_cancelled_request'));
                } else if (data.is_trip_cancelled == 0) {
                    ws.cell(index + 2, col++).string(req.__('title_trip_status_pending'));
                } 

                ws.cell(index + 2, col++).string(data.source_address);
                ws.cell(index + 2, col++).string(data.destination_address);

                if (data.payment_mode == 1) {
                    ws.cell(index + 2, col++).string(req.__('title_pay_by_cash'));
                } else {
                    ws.cell(index + 2, col++).string(req.__('title_pay_by_card'));
                }

                if (index == array.length - 1) {
                    wb.write('data/xlsheet/' + time + '_schedule_trip.xlsx', function (err) {
                        if (err) {
                            console.error(err);
                        } else {
                            var url = req.protocol + "://" + req.get('host') + "/xlsheet/" + time + "_schedule_trip.xlsx";
                            res.json(url);
                            setTimeout(function () {
                                fs.unlink('data/xlsheet/' + time + '_schedule_trip.xlsx', function () {
                                });
                            }, 10000)
                        }
                    });
                }
            })
        }, (err) => {
            utils.error_response(err, res)
        });

    } else {
        res.redirect('/admin');
    }

};