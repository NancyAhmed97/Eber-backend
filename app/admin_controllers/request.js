var Trip = require('mongoose').model('Trip');
var Provider = require('mongoose').model('Provider');
var Trip_Location = require('mongoose').model('trip_location');
var moment = require('moment-timezone');
var xl = require('excel4node');
var fs = require("fs");
var console = require('../controllers/console');
var utils = require('../controllers/utils');
var Trip_history = require('mongoose').model('Trip_history');
var Promo_Code = require('mongoose').model('Promo_Code');

exports.list = function (req, res, next) {

    if (typeof req.session.userid != 'undefined') {
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
        var status;
        var startdate;
        var enddate;
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

        var Table = Trip_history
        if (req.body.search_item == undefined)
        {
            var request = req.path.split('/')[1];
            search_item = 'user_detail.first_name';
            search_value = '';
            sort_order = -1;
            sort_field = 'unique_id';
            filter_start_date = '';
            filter_end_date = '';
            payment = 2;
            status = 3;

        } else
        {
            var request = req.body.request;
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
            payment = Number(req.body.payment);
            status = Number(req.body.status);
        }

        var condition = {};
        var start_date = req.body.start_date;
        var end_date = req.body.end_date;

        if (request == 'running_requests')
        {
            Table = Trip;
        }

        if (request == 'today_requests')
        {
            var date = new Date(Date.now());
            date = date.setHours(0, 0, 0, 0);
            startdate = new Date(date);
            enddate = new Date(Date.now());

            var start_date = '';
            var end_date = '';
            var condition = {$match: {'created_at': {$gte: startdate, $lt: enddate}}};

        } else
        {
            var condition = {$match: {}};
        }

        if (end_date == '' || end_date == undefined) {
            end_date = new Date();
        } else {
            end_date = new Date(end_date);
            end_date = end_date.setHours(23, 59, 59, 999);
            end_date = new Date(end_date);
        }

        if (start_date == '' || start_date == undefined) {
            start_date = new Date(end_date.getTime() - (6 * 24 * 60 * 60 * 1000));
            start_date = start_date.setHours(0, 0, 0, 0);
            start_date = new Date(start_date);
        } else {
            start_date = new Date(start_date);
            start_date = start_date.setHours(0, 0, 0, 0);
            start_date = new Date(start_date);
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

        var lookup1 = {
            $lookup:
                    {
                        from: "providers",
                        localField: "current_provider",
                        foreignField: "_id",
                        as: "provider_detail"
                    }
        };


        var lookup2 = {
            $lookup:
                    {
                        from: "city_types",
                        localField: "service_type_id",
                        foreignField: "_id",
                        as: "city_type_detail"
                    }
        };

        var unwind2 = {$unwind: "$city_type_detail"};

        var lookup3 = {
            $lookup:
                    {
                        from: "types",
                        localField: "city_type_detail.typeid",
                        foreignField: "_id",
                        as: "type_detail"
                    }
        };

        var unwind3 = {$unwind: "$type_detail"};

        var lookup5 = {
            $lookup:
                    {
                        from: "promo_codes",
                        localField: "promo_id",
                        foreignField: "_id",
                        as: "promo_detail"
                    }
        };

        var unwind5 = {
            $unwind: { path: "$promo_detail", preserveNullAndEmptyArrays: true }
        };

        value = search_value;
        value = value.replace(/^\s+|\s+$/g, '');
        value = value.replace(/ +(?= )/g, '');

        var search = {$match: {}};
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

                query1['user_detail.first_name'] = {$regex: new RegExp(value, 'i')};
                query2['user_detail.last_name'] = {$regex: new RegExp(value, 'i')};

                search = {"$match": {$or: [query1, query2]}};
            } else {

                query1[search_item] = {$regex: new RegExp(value, 'i')};
                query2['user_detail.last_name'] = {$regex: new RegExp(value, 'i')};
                query3[search_item] = {$regex: new RegExp(full_name[0], 'i')};
                query4['user_detail.last_name'] = {$regex: new RegExp(full_name[0], 'i')};
                query5[search_item] = {$regex: new RegExp(full_name[1], 'i')};
                query6['user_detail.last_name'] = {$regex: new RegExp(full_name[1], 'i')};

                search = {"$match": {$or: [query1, query2, query3, query4, query5, query6]}};
            }
        } else if (search_item == "provider_detail.first_name")
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

                search = {"$match": {$or: [query1, query2]}};
            } else {

                query1[search_item] = {$regex: new RegExp(value, 'i')};
                query2['provider_detail.last_name'] = {$regex: new RegExp(value, 'i')};
                query3[search_item] = {$regex: new RegExp(full_name[0], 'i')};
                query4['provider_detail.last_name'] = {$regex: new RegExp(full_name[0], 'i')};
                query5[search_item] = {$regex: new RegExp(full_name[1], 'i')};
                query6['provider_detail.last_name'] = {$regex: new RegExp(full_name[1], 'i')};

                search = {"$match": {$or: [query1, query2, query3, query4, query5, query6]}};
            }
        } else if (search_item == "type_detail.typename") {
            var query1 = {};
            query1[search_item] = { $regex: new RegExp(value, 'i') };
            search = { "$match": { $or: [query1] } };
        } else if (search_item == "promo_detail.promocode") {
            var query1 = {};
            query1[search_item] = { $regex: new RegExp(value, 'i') };
            search = { "$match": { $or: [query1] } };
        } else {
            var query1 = {};
            if (value != "") {
                value = Number(value)
                query1[search_item] = { $eq: value };
                search = { "$match": query1 };
            } else {
                search = { $match: {} };
            }
        }

        var payment_condition = {$match: {}};
        if (payment !== 2) {
            payment_condition['$match']['payment_mode'] = {$eq: payment}
        }

        var status_condition = {$match: {}};

        if (status == 1) {
            status_condition['$match']['is_trip_completed'] = {$eq: 1}
        } else if (status == 2) {
            status_condition['$match']['is_trip_cancelled'] = {$eq: 1}
        } else if (status == 0) {
            status_condition['$match']['is_trip_cancelled'] = {$eq: 0}
            status_condition['$match']['is_trip_completed'] = {$eq: 0}
        }

        var filter = {"$match": {'created_at': {$gte: start_date, $lt: end_date} } };

        var sort = {"$sort": {}};
        sort["$sort"][sort_field] = parseInt(sort_order);

        var count = {$group: {_id: null, total: {$sum: 1}, data: {$push: '$data'}}};

        var skip = {};
        skip["$skip"] = page * number_of_rec;

        var limit = {};
        limit["$limit"] = number_of_rec;
        var trip_condition = { $match: { $or: [{ is_schedule_trip: { $eq: false } }, { is_trip_cancelled: 1 }] } }

        Table.aggregate([filter, condition, trip_condition, payment_condition, status_condition, lookup, unwind, lookup1, lookup2, unwind2, lookup3, unwind3, lookup5, unwind5, search, count]).then((array) => { 
            if (!array || array.length == 0)
            {
                array = [];
                res.render('request_list', { detail: array, request: request, 'current_page': 1, 'pages': 0, 'next': 1, 'pre': 0, moment: moment, sort_field, sort_order, search_item, search_value, filter_start_date, filter_end_date, status, payment });
            } else
            {
                var pages = Math.ceil(array[0].total / number_of_rec);
                Table.aggregate([filter, condition, trip_condition, payment_condition, status_condition, lookup, unwind, lookup1, lookup2, unwind2, lookup3, unwind3, lookup5, unwind5, search, sort, skip, limit]).then((array) => { 

                    res.render('request_list', { detail: array, timezone_for_display_date: setting_detail.timezone_for_display_date, request: request, 'current_page': page, 'pages': pages, 'next': next, 'pre': pre, moment: moment, sort_field, sort_order, search_item, search_value, filter_start_date, filter_end_date, status, payment });
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


exports.genetare_request_excel = function (req, res) {

    if (typeof req.session.userid != 'undefined') {

        var request = req.body.request;
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



        if (request == 'today_requests')
        {
            var date = new Date(Date.now());
            date = date.setHours(0, 0, 0, 0);
            startdate = new Date(date);
            enddate = new Date(Date.now());

            var start_date = '';
            var end_date = '';
            var condition = {$match: {'created_at': {$gte: startdate, $lt: enddate}}};

        } else
        {
            var condition = {$match: {}};
        }

        if (req.body.start_date == '' || req.body.end_date == '') {
            if (req.body.start_date == '' && req.body.end_date == '') {
                end_date = new Date(Date.now());
                var start_date = new Date(end_date.getTime() - (6 * 24 * 60 * 60 * 1000));
                start_date = start_date.setHours(0, 0, 0, 0);
                start_date = new Date(start_date);
            } else if (req.body.start_date == '') {
                start_date = new Date(0);
                var end_date = req.body.end_date;
                end_date = new Date(end_date);
                end_date = end_date.setHours(23, 59, 59, 999);
                end_date = new Date(end_date);
            } else {
                var start_date = req.body.start_date;
                start_date = new Date(start_date);
                start_date = start_date.setHours(0, 0, 0, 0);
                start_date = new Date(start_date);
                end_date = new Date(Date.now());
            }
        } else if (req.body.start_date == undefined || req.body.end_date == undefined) {
            end_date = new Date(Date.now());
            var start_date = new Date(end_date.getTime() - (6 * 24 * 60 * 60 * 1000));
            start_date = start_date.setHours(0, 0, 0, 0);
            start_date = new Date(start_date);
        } else {
            var start_date = req.body.start_date;
            var end_date = req.body.end_date;
            start_date = new Date(start_date);
            start_date = start_date.setHours(0, 0, 0, 0);
            start_date = new Date(start_date);
            end_date = new Date(end_date);
            end_date = end_date.setHours(23, 59, 59, 999);
            end_date = new Date(end_date);
        }


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

        var lookup1 = {
            $lookup:
                    {
                        from: "providers",
                        localField: "confirmed_provider",
                        foreignField: "_id",
                        as: "provider_detail"
                    }
        };


        var lookup2 = {
            $lookup:
                    {
                        from: "city_types",
                        localField: "service_type_id",
                        foreignField: "_id",
                        as: "city_type_detail"
                    }
        };

        var unwind2 = {$unwind: "$city_type_detail"};

        var lookup3 = {
            $lookup:
                    {
                        from: "types",
                        localField: "city_type_detail.typeid",
                        foreignField: "_id",
                        as: "type_detail"
                    }
        };

        var unwind3 = {$unwind: "$type_detail"};

        var lookup5 = {
            $lookup:
                    {
                        from: "promo_codes",
                        localField: "promo_id",
                        foreignField: "_id",
                        as: "promo_detail"
                    }
        };

        var unwind5 = {
            $unwind: { path: "$promo_detail", preserveNullAndEmptyArrays: true }
        };
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
        } else if (search_item == "provider_detail.first_name")
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
        } else if (search_item == "promo_detail.promocode") {
            var query1 = {};
            query1[search_item] = { $regex: new RegExp(value, 'i') };
            search = { "$match": { $or: [query1] } };
        } else {
            var query1 = {};
            if (value != "")
            {
                value = Number(value)
                query1[search_item] = {$eq: value};
                var search = {"$match": query1};
            } else
            {
                var search = {$match: {}};
            }
        }

        var filter = {"$match": {'created_at': {$gte: start_date, $lt: end_date} }};

        var sort = {"$sort": {}};
        sort["$sort"][sort_field] = parseInt(sort_order);

        var Table = Trip_history
        var request = req.body.request;
        if (request == 'running_requests')
        {
            Table = Trip;
        }

        var trip_condition = {$match: {is_schedule_trip: {$eq: false}}}
        Table.aggregate([filter, condition, trip_condition, lookup, unwind, lookup1, lookup2, unwind2, lookup3, unwind3, lookup5, unwind5, search, sort]).then((array) => { 

            var date = new Date()
            var time = date.getTime()

            var wb = new xl.Workbook();
            var ws = wb.addWorksheet('sheet1');
            var col = 1;

            ws.cell(1, col++).string(req.__('title_id'));
            ws.cell(1, col++).string(req.__('title_user_id'));
            ws.cell(1, col++).string(req.__('title_user'));
            ws.cell(1, col++).string(req.__('title_provider_id'));
            ws.cell(1, col++).string(req.__('title_provider'));
            ws.cell(1, col++).string(req.__('title_date'));
            ws.cell(1, col++).string(req.__('title_status'));
            ws.cell(1, col++).string(req.__('title_amount'));
            ws.cell(1, col++).string(req.__('title_payment'));
            ws.cell(1, col++).string(req.__('title_payment_status'));
            
            array.forEach(function (data, index) {
                col = 1;
                ws.cell(index + 2, col++).number(data.unique_id);
                ws.cell(index + 2, col++).number(data.user_detail.unique_id);
                ws.cell(index + 2, col++).string(data.user_detail.first_name + ' ' + data.user_detail.last_name);
                if (data.provider_detail.length > 0) {
                    ws.cell(index + 2, col++).number(data.provider_detail[0].unique_id);
                    ws.cell(index + 2, col++).string(data.provider_detail[0].first_name + ' ' + data.provider_detail[0].last_name);
                } else {
                    col += 2;
                }
                ws.cell(index + 2, col++).string(moment(data.created_at).tz(setting_detail.timezone_for_display_date).format('DD MMM YYYY HH:mm a'));

                if (data.is_trip_cancelled == 1) {
                    if (data.is_trip_cancelled_by_provider == 1) {
                        ws.cell(index + 2, col++).string(req.__('title_total_cancelled_by_provider'));
                    } else if (data.is_trip_cancelled_by_user == 1) {
                        ws.cell(index + 2, col++).string(req.__('title_total_cancelled_by_user'));
                    } else {
                        ws.cell(index + 2, col++).string(req.__('title_total_cancelled'));
                    }
                } else {
                    if (data.is_provider_status == 2) {
                        ws.cell(index + 2, col++).string(req.__('title_trip_status_coming'));
                    } else if (data.is_provider_status == 4) {
                        ws.cell(index + 2, col++).string(req.__('title_trip_status_arrived'));
                    } else if (data.is_provider_status == 6) {
                        ws.cell(index + 2, col++).string(req.__('title_trip_status_trip_started'));
                    } else if (data.is_provider_status == 9) {
                        ws.cell(index + 2, col++).string(req.__('title_trip_status_completed'));
                    } else if (data.is_provider_status == 1 || data.is_provider_status == 0) {
                        if (data.is_provider_accepted == 1) {
                            ws.cell(index + 2, col++).string(req.__('title_trip_status_accepted'));
                        } else {
                            ws.cell(index + 2, col++).string(req.__('title_trip_status_waiting'));
                        }
                    }
                }


                ws.cell(index + 2, col++).number(data.total);

                if (data.payment_mode == 1) {
                    ws.cell(index + 2, col++).string(req.__('title_pay_by_cash'));
                } else {
                    ws.cell(index + 2, col++).string(req.__('title_pay_by_card'));
                }

                if (data.payment_status == 0) {
                    ws.cell(index + 2, col++).string(req.__('title_pending'));
                } else {
                    if (data.payment_status == 1) {
                        ws.cell(index + 2, col++).string(req.__('title_paid'));
                    } else {
                        ws.cell(index + 2, col++).string(req.__('title_not_paid'));
                    }
                }

                if (index == array.length - 1) {
                    wb.write('data/xlsheet/' + time + '_trip.xlsx', function (err) {
                        if (err) {
                            console.error(err);
                        } else {
                            var url = req.protocol + "://" + req.get('host') + "/xlsheet/" + time + "_trip.xlsx";
                            res.json(url);
                            setTimeout(function () {
                                fs.unlink('data/xlsheet/' + time + '_trip.xlsx', function () {
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


exports.requsest_status_ajax = function (req, res) {

    var array = req.body.trip_id_array;
    var i = 0;
    var tripDetailArray = [];
    Trip.find({_id: {$in: array}}).then((result) => { 
        if(result.length>0)
        {

            result.forEach(function (trip_data) {
    
                var provider_id = '';
                if (trip_data.confirmed_provider != null)
                {
                    provider_id = trip_data.confirmed_provider
                } else if (trip_data.current_provider != null)
                {
                    provider_id = trip_data.current_provider
                }
                if (provider_id != "")
                {
                    Provider.findById(provider_id).then((provider_detail) => { 
                        i++;
    
                        tripDetailArray.push({trip_detail: trip_data, provider: provider_detail.first_name + ' ' + provider_detail.last_name});
                        if (result.length == i)
                        {
                            res.json(tripDetailArray)
                        }
                    })
                } else
                {
                    i++;
    
                    tripDetailArray.push({trip_detail: trip_data, provider: ''});
                    if (result.length == i)
                    {
                        res.json(tripDetailArray)
                    }
                }
            })
        }
        else{
            res.json(tripDetailArray)
        }
    })
}

exports.trip_map = function (req, res) {
    if (typeof req.session.userid != 'undefined') {
        var id = req.body.id;
        var user_name = req.body.u_name;
        var provider_name = req.body.pr_name;
        var query = {};
        query['tripID'] = id;
        Trip.findById(id).then((trips) => {
            Trip_history.findById(id).then((trip_history) => {
                if (!trips) {
                    trips = trip_history;
                }
                Promo_Code.findById(trips.promo_id).then((promocode) => {
                    Trip_Location.findOne(query).then((locations) => {
                        var url = "https://maps.googleapis.com/maps/api/js?key=" + setting_detail.web_app_google_key + "&libraries=places&callback=initialize"
                        if (!locations) {
                            res.render('trip_map', { 'data': trips, timezone_for_display_date: setting_detail.timezone_for_display_date, 'url': url, 'user_name': user_name, 'provider_name': provider_name, 'moment': moment, 'promocode': promocode });
                        } else {
                            res.render('trip_map', { 'data': trips, timezone_for_display_date: setting_detail.timezone_for_display_date, 'url': url, 'trip_path_data': locations, 'user_name': user_name, 'provider_name': provider_name, 'moment': moment, 'promocode': promocode });
                        }
                    });
                })
            });
        });
    } else {
        res.redirect('/admin');
    }
};



//  REFUND AMOUNT //
//////////////////////////////
exports.trip_refund_amount = function (req, res) {
    
    if (typeof req.session.userid != 'undefined') {

        Trip.findOne({_id: req.body.id}).then((trip) => { 
        Trip_history.findOne({_id: req.body.id}).then((trip_history) => { 
            if (!trip) {
                trip = trip_history
            }
            var stripe = require("stripe")(setting_detail.stripe_secret_key);
            var charge_id = trip.payment_intent_id;

            stripe.refunds.create({
                payment_intent: charge_id
            }, function (err, refund) {
                if (refund) {
                    trip.refund_amount = refund.amount / 100;
                    trip.is_amount_refund = true;
                    trip.save();
                    message = admin_messages.success_message_refund;
                    res.redirect('/requests');
                } else
                {
                    message = admin_messages.error_message_refund;
                    res.redirect('/requests');
                }
            });
               
        });
        });

    } else {
        res.redirect('/admin');
    }
};

var mongoose = require('mongoose');
var Schema = mongoose.Types.ObjectId;
exports.chat_history = function (req, res) {

    if (typeof req.session.userid != 'undefined') {

        var condition = {$match:{_id: Schema(req.body.id)}}
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

        var lookup1 = {
            $lookup:
                    {
                        from: "providers",
                        localField: "current_provider",
                        foreignField: "_id",
                        as: "provider_detail"
                    }
        };
        var unwind1 = {$unwind: {
                path: "$provider_detail",
                preserveNullAndEmptyArrays: true
            }
        };

        Trip.aggregate([condition, lookup, unwind, lookup1, unwind1], function(error, trip_data){
            if(error || trip_data.length==0){
                Trip_history.aggregate([condition, lookup, unwind, lookup1, unwind1], function(error, trip_data){
                    if(error || trip_data.length==0){
                        res.redirect('/requests');
                    } else {
                        res.render('chat_history', { trip_data: trip_data[0], admin: req.session.admin })
                    }
                })
            } else {
                res.render('chat_history', { trip_data: trip_data[0], admin: req.session.admin })
            }
        })
    } else {
        res.redirect('/admin');
    }

};