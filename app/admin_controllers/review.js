var utils = require('../controllers/utils');
var moment = require('moment');
var Reviews = require('mongoose').model('Reviews');
var User = require('mongoose').model('User');
var Provider = require('mongoose').model('Provider');
var xl = require('excel4node');
var fs = require("fs");
var console = require('../controllers/console');
var Trip_history = require('mongoose').model('Trip_history');

exports.review = function (req, res, next) {
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
            search_item = 'user_detail.email';
            search_value = '';
            sort_order = -1;
            sort_field = 'trip_detail.unique_id';
            filter_start_date = '';
            filter_end_date = '';

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
                        localField: "provider_id",
                        foreignField: "_id",
                        as: "provider_detail"
                    }
        };

        var unwind1 = {$unwind: "$provider_detail"};

        var lookup2 = {
            $lookup:
                    {
                        from: "trip_histories",
                        localField: "trip_id",
                        foreignField: "_id",
                        as: "trip_detail"
                    }
        };

        var unwind2 = {$unwind: "$trip_detail"};
        value = search_value;
        value = value.replace(/^\s+|\s+$/g, '');
        value = value.replace(/ +(?= )/g, '');
        var search = {"$match": {}};
        search["$match"][search_item] = {$regex: new RegExp(value, 'i')}

        var filter = {"$match": {}};
        filter["$match"]['created_at'] = {$gte: start_date, $lt: end_date};

        var sort = {"$sort": {}};
        sort["$sort"][sort_field] = parseInt(sort_order);

        var count = {$group: {_id: null, total: {$sum: 1}, data: {$push: '$data'}}};

        var skip = {};
        skip["$skip"] = page * number_of_rec;

        var limit = {}
        limit["$limit"] = number_of_rec;


        Reviews.aggregate([lookup, unwind, lookup1, unwind1, lookup2, unwind2, search, filter, count]).then((array) => { 
            if (!array || array.length == 0)
            {
                array = [];
                res.render('reviews', { detail: array, 'current_page': 1, 'pages': 0, 'next': 1, 'pre': 0, moment: moment, sort_field, sort_order, search_item, search_value, search_value, filter_start_date, filter_end_date });
            } else {
                    var is_public_demo = setting_detail.is_public_demo;
                    var pages = Math.ceil(array[0].total / number_of_rec);
                    Reviews.aggregate([lookup, unwind, lookup1, unwind1, lookup2, unwind2, search, filter, sort, skip, limit]).allowDiskUse(true).then((array) => { 

                        res.render('reviews', { is_public_demo: is_public_demo, timezone_for_display_date: setting_detail.timezone_for_display_date, detail: array, 'current_page': page, 'pages': pages, 'next': next, 'pre': pre, moment: moment, sort_field, sort_order, search_item, search_value, search_value, filter_start_date, filter_end_date });
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
}


exports.generate_review_excel = function (req, res, next) {
    if (typeof req.session.userid != 'undefined') {

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
            search_item = 'user_detail.email';
            search_value = '';
            sort_order = -1;
            sort_field = 'trip_detail.unique_id';
            filter_start_date = '';
            filter_end_date = '';

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
                        localField: "provider_id",
                        foreignField: "_id",
                        as: "provider_detail"
                    }
        };

        var unwind1 = {$unwind: "$provider_detail"};

        value = search_value;
        value = value.replace(/^\s+|\s+$/g, '');
        value = value.replace(/ +(?= )/g, '');

        var search = {"$match": {}};
        search["$match"][search_item] = {$regex: new RegExp(value, 'i')}

        var filter = {"$match": {}};
        filter["$match"]['created_at'] = {$gte: start_date, $lt: end_date};

        var sort = {"$sort": {}};
        sort["$sort"][sort_field] = parseInt(sort_order);


        var skip = {};
        skip["$skip"] = page * number_of_rec;

        var limit = {};
        limit["$limit"] = number_of_rec;


        Reviews.aggregate([lookup, unwind, lookup1, unwind1, search, filter, sort]).then((array) => { 
            
            var date = new Date()
            var time = date.getTime()

            var wb = new xl.Workbook();
            var ws = wb.addWorksheet('sheet1');
            var col = 1;

            ws.cell(1, col++).string(req.__('title_trip_id'));
            ws.cell(1, col++).string(req.__('title_date'));
            ws.cell(1, col++).string(req.__('title_user_email'));
            ws.cell(1, col++).string(req.__('title_user_rate'));
            ws.cell(1, col++).string(req.__('title_user_review'));
            ws.cell(1, col++).string(req.__('title_provider_email'));
            ws.cell(1, col++).string(req.__('title_provider_rate'));
            ws.cell(1, col++).string(req.__('title_provider_review'));
            array.forEach(function (data, index) {
                col = 1;
                ws.cell(index + 2, col++).number(data.trip_unique_id);
                ws.cell(index + 2, col++).string(moment(data.created_at).format("DD MMM 'YY") + ' ' + moment(data.created_at).format("hh:mm a"));
                ws.cell(index + 2, col++).string(data.user_detail.email);
                ws.cell(index + 2, col++).number(data.userRating);
                ws.cell(index + 2, col++).string(data.userReview);
                ws.cell(index + 2, col++).string(data.provider_detail.email);
                ws.cell(index + 2, col++).number(data.providerRating);
                ws.cell(index + 2, col++).string(data.providerReview);

                if (index == array.length - 1) {
                    wb.write('data/xlsheet/' + time + '_review.xlsx', function (err) {
                        if (err) {
                            console.error(err);
                        } else {
                            var url = req.protocol + "://" + req.get('host') + "/xlsheet/" + time + "_review.xlsx";
                            res.json(url);
                            setTimeout(function () {
                                fs.unlink('data/xlsheet/' + time + '_review.xlsx', function () {
                                });
                            }, 10000)
                        }
                    });
                }
            });
        }, (err) => {
            utils.error_response(err, res)
        });

    } else {
        res.redirect('/admin');
    }
}

exports.review_detail = function (req, res) {

    if (typeof req.session.userid != 'undefined') {
        var Reviews = require('mongoose').model('Reviews');

        var query = {};
        query['_id'] = req.body.id;

        Reviews.findOne(query).then((review_data) => { 
            
            var query = {};
            query['_id'] = review_data.provider_id;
            Provider.findOne(query).then((provider) => { 

                var query = {};
                query['_id'] = review_data.user_id;

                User.findOne(query).then((user) => { 
                        var is_public_demo = setting_detail.is_public_demo;
                        res.render('review_detail', {is_public_demo: is_public_demo, detail: review_data, user: user, provider: provider, moment: moment});
                });
            });
        });
    } else {
        res.redirect('/admin');
    }

};

exports.cancellation_reason = function (req, res, next) {
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

        }

        if (req.body.start_date == '' || req.body.end_date == '') {
            if (req.body.start_date == '' && req.body.end_date == '') {
                var date = new Date(Date.now());
                date = date.setHours(0, 0, 0, 0);
                start_date = new Date(0);
                end_date = new Date(Date.now());
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
            start_date = new Date(0);
            end_date = new Date(Date.now());
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
                        localField: "provider_id",
                        foreignField: "_id",
                        as: "provider_detail"
                    }
        };

        var unwind1 = {$unwind: "$provider_detail"};

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
        } else
        {
            var search = {"$match": {}};
            search["$match"][search_item] = {$regex: new RegExp(value, 'i')}
        }

        var filter = {"$match": {}};
        filter["$match"]['provider_trip_end_time'] = {$gte: start_date, $lt: end_date};

        var sort = {"$sort": {}};
        sort["$sort"][sort_field] = parseInt(sort_order);

        var count = {$group: {_id: null, total: {$sum: 1}, data: {$push: '$data'}}};

        var skip = {};
        skip["$skip"] = page * number_of_rec;

        var limit = {};
        limit["$limit"] = number_of_rec;

        var query1 = {};
        var query2 = {};
        query1['is_trip_cancelled_by_user'] = 1;
        query2['is_trip_cancelled_by_provider'] = 1;
        var condition = {"$match": {$or: [query1, query2]}};
        
            Trip_history.aggregate([condition, lookup, unwind, lookup1, unwind1, search, filter, count]).then((array) => { 
                if (!array || array.length == 0)
                {
                    array = [];
                    res.render('cancelation_reasons', { detail: array, 'current_page': 1, 'pages': 0, 'next': 1, 'pre': 0, moment: moment, sort_field, sort_order, search_item, search_value, filter_start_date, filter_end_date });
                } else
                {
                    var pages = Math.ceil(array[0].total / number_of_rec);
                    Trip_history.aggregate([condition, lookup, unwind, lookup1, unwind1, search, filter, sort, skip, limit]).then((array) => { 

                        res.render('cancelation_reasons', { detail: array, timezone_for_display_date: setting_detail.timezone_for_display_date, 'current_page': page, 'pages': pages, 'next': next, 'pre': pre, moment: moment, sort_field, sort_order, search_item, search_value, filter_start_date, filter_end_date });
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


exports.generate_cancelation_reason_excel = function (req, res, next) {
    if (typeof req.session.userid != 'undefined') {

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

        }

        if (req.body.start_date == '' || req.body.end_date == '') {
            if (req.body.start_date == '' && req.body.end_date == '') {
                var date = new Date(Date.now());
                date = date.setHours(0, 0, 0, 0);
                start_date = new Date(0);
                end_date = new Date(Date.now());
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
                        localField: "provider_id",
                        foreignField: "_id",
                        as: "provider_detail"
                    }
        };

        var unwind1 = {$unwind: "$provider_detail"};

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
        } else
        {
            var search = {"$match": {}};
            search["$match"][search_item] = {$regex: new RegExp(value, 'i')}
        }

        var filter = {"$match": {}};
        filter["$match"]['provider_trip_end_time'] = {$gte: start_date, $lt: end_date};

        var sort = {"$sort": {}};
        sort["$sort"][sort_field] = parseInt(sort_order);


        var skip = {};
        skip["$skip"] = page * number_of_rec;

        var limit = {};
        limit["$limit"] = number_of_rec;

        var query1 = {};
        var query2 = {};
        query1['is_trip_cancelled_by_user'] = 1;
        query2['is_trip_cancelled_by_provider'] = 1;
        var condition = {"$match": {$or: [query1, query2]}};
            Trip_history.aggregate([condition, lookup, unwind, lookup1, unwind1, search, filter, sort]).then((array) => { 

                var date = new Date()
                var time = date.getTime()

                var wb = new xl.Workbook();
                var ws = wb.addWorksheet('sheet1');
                var col = 1;

                ws.cell(1, col++).string(req.__('title_trip_id'));
                ws.cell(1, col++).string(req.__('title_user_id'));
                ws.cell(1, col++).string(req.__('title_user'));
                ws.cell(1, col++).string(req.__('title_provider_id'));
                ws.cell(1, col++).string(req.__('title_provider'));
                ws.cell(1, col++).string(req.__('title_date'));
                ws.cell(1, col++).string(req.__('title_cancel_by'));
                ws.cell(1, col++).string(req.__('title_cancellation_reason'));

                array.forEach(function (data, index) {
                    col = 1;
                    ws.cell(index + 2, col++).number(data.unique_id);
                    ws.cell(index + 2, col++).number(data.user_detail.unique_id);
                    ws.cell(index + 2, col++).string(data.user_detail.first_name + ' ' + data.user_detail.last_name);
                    ws.cell(index + 2, col++).number(data.provider_detail.unique_id);
                    ws.cell(index + 2, col++).string(data.provider_detail.first_name + ' ' + data.provider_detail.last_name);
                    ws.cell(index + 2, col++).string(moment(data.created_at).format("DD MMM 'YY") + ' ' + moment(data.created_at).format("hh:mm a"));

                    if (data.is_trip_cancelled_by_provider == 1) {
                        ws.cell(index + 2, col++).string(req.__('title_total_cancelled_by_provider'));
                    } else if (data.is_trip_cancelled_by_user == 1) {
                        ws.cell(index + 2, col++).string(req.__('title_total_cancelled_by_user'));
                    }

                    ws.cell(index + 2, col++).string(data.cancel_reason);

                    if (index == array.length - 1) {
                        wb.write('data/xlsheet/' + time + '_cancellation_reason.xlsx', function (err) {
                            if (err) {
                                console.error(err);
                            } else {
                                var url = req.protocol + "://" + req.get('host') + "/xlsheet/" + time + "_cancellation_reason.xlsx";
                                res.json(url);
                                setTimeout(function () {
                                    fs.unlink('data/xlsheet/' + time + '_cancellation_reason.xlsx', function () {
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