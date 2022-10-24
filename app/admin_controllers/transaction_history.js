var utils = require('../controllers/utils');
var moment = require('moment');
var moment = require('moment-timezone');
var xl = require('excel4node');
var fs = require("fs");
var Transfer_History = require('mongoose').model('transfer_history');
var console = require('../controllers/console');

exports.admin_transaction_history = function (req, res, next) {
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
            search_item = '';
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

        var end_date = req.body.end_date;
        var start_date = req.body.start_date;
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
        var lookup1 = {
            $lookup:
                    {
                        from: "providers",
                        localField: "user_id",
                        foreignField: "_id",
                        as: "provider_detail"
                    }
        };
        
         var lookup2 = {
            $lookup:
                    {
                        from: "partners",
                        localField: "user_id",
                        foreignField: "_id",
                        as: "partner_detail"
                    }
        };

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


        Transfer_History.aggregate([lookup1,lookup2
        ]).then((array) => { 
            if (array.length == 0)
            {
                array = [];
                res.render('transaction_history', { detail: array, 'current_page': 1, 'pages': 0, 'next': 1, 'pre': 0, moment: moment, sort_field, sort_order, search_item, search_value, filter_start_date, filter_end_date });
            }
            else {
                    var is_public_demo = setting_detail.is_public_demo;
                    var pages = Math.ceil(array[0].total / number_of_rec);
                    Transfer_History.aggregate([lookup1, lookup2, search, filter, sort, skip, limit]).then((array) => { 
                        res.render('transaction_history', { is_public_demo: is_public_demo, timezone_for_display_date: setting_detail.timezone_for_display_date, detail: array, 'current_page': page, 'pages': pages, 'next': next, 'pre': pre, moment: moment, sort_field, sort_order, search_item, search_value, filter_start_date, filter_end_date });
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


exports.generate_transaction_history_excel = function (req, res) {
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
            search_item = 'wallet_description';
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

        var lookup1 = {
            $lookup:
                    {
                        from: "providers",
                        localField: "user_id",
                        foreignField: "_id",
                        as: "provider_detail"
                    }
        };

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

        Transfer_History.aggregate([lookup1, search, sort]).then((array) => { 

            var date = new Date()
            var time = date.getTime()
            var wb = new xl.Workbook();
            var ws = wb.addWorksheet('sheet1');
            var col = 1;

            ws.cell(1, col++).string(req.__('title_id'));
            ws.cell(1, col++).string(req.__('title_promo_type'));
            ws.cell(1, col++).string(req.__('title_date'));
            ws.cell(1, col++).string(req.__('title_email'));
            ws.cell(1, col++).string(req.__('title_currency'));
            ws.cell(1, col++).string(req.__('title_amount'));
            ws.cell(1, col++).string(req.__('title_status'));
            ws.cell(1, col++).string(req.__('title_transfer_by'));

            array.forEach(function (data, index) {
                col = 1;
                ws.cell(index + 2, col++).number(data.unique_id);
                if (data.user_type == 10) {
                    ws.cell(index + 2, col++).string(req.__('title_user'));
                } else if (data.user_type == 11) {
                    ws.cell(index + 2, col++).string(req.__('title_provider'));
                }
                ws.cell(index + 2, col++).string(moment(data.created_at).format("DD MMM 'YY") + ' ' + moment(data.created_at).format("hh:mm a"));

                if (data.user_type == 10) {
                    ws.cell(index + 2, col++).string(data.user_detail[0].email);
                } else if (data.user_type == 11) {
                    ws.cell(index + 2, col++).string(data.provider_detail[0].email);
                }

                ws.cell(index + 2, col++).string(data.currency_code);
                ws.cell(index + 2, col++).number(data.amount);
                ws.cell(index + 2, col++).string(data.transfer_status);
                ws.cell(index + 2, col++).string("Admin");

                if (index == array.length - 1) {
                    wb.write('data/xlsheet/' + time + '_transfer_history.xlsx', function (err) {
                        if (err) {
                            console.error(err);
                        } else {
                            var url = req.protocol + "://" + req.get('host') + "/xlsheet/" + time + "_transfer_history.xlsx";
                            res.json(url);
                            setTimeout(function () {
                                fs.unlink('data/xlsheet/' + time + '_transfer_history.xlsx', function () {
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