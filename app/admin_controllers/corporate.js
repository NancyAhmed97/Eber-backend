var utils = require('../controllers/utils');
var Corporate = require('mongoose').model('Corporate');
var Trip = require('mongoose').model('Trip');
var moment = require('moment');
var Country = require('mongoose').model('Country')
var crypto = require('crypto');
var console = require('../controllers/console');
var mongoose = require('mongoose');
var xl = require('excel4node');
var fs = require("fs");
var console = require('../controllers/console');
var Trip_history = require('mongoose').model('Trip_history');

exports.list = function (req, res) {
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

        var query = {};
        var sort = {};
        var array = [];
        var query1 = {};
        var query2 = {};
        var query3 = {};
        var query4 = {};
        var query5 = {};
        var query6 = {};
        if (req.body.page == undefined) {
            sort['unique_id'] = -1;

            search_item = 'first_name';
            search_value = '';
            sort_order = -1;
            sort_field = 'unique_id';
            filter_start_date = '';
            filter_end_date = '';

            var start_date = '';
            var end_state = '';
        } else {

            var field = req.body.sort_item[0];
            var order = req.body.sort_item[1];
            var item = req.body.search_item;
            var value = req.body.search_value;

            sort[field] = order;

            sort_order = req.body.sort_item[1];
            sort_field = req.body.sort_item[0];
            search_item = item
            search_value = value;
            filter_start_date = req.body.start_date;
            filter_end_date = req.body.end_date;

            var start_date = req.body.start_date;
            var end_state = req.body.end_date;
        }
        if (start_date != '' || end_state != '') {
            if (start_date == '') {
                start_date = new Date(end_state);
                start_date = start_date - 1;
                end_date = new Date(end_state);
                end_date = end_date.setHours(11, 59, 59, 999);
                end_date = new Date(end_date);
                query['created_at'] = {$gte: start_date, $lt: end_date};
            } else if (end_state == '') {
                end_date = new Date(start_date);
                end_date = end_date.setHours(11, 59, 59, 999);
                end_date = new Date(end_date);
                start_date = new Date(start_date);
                start_date = start_date - 1;
                query['created_at'] = {$gte: start_date, $lt: end_date};
            } else {
                start_date = new Date(start_date);
                start_date = start_date.setHours(0, 0, 0, 0);
                start_date = new Date(start_date);
                end_date = new Date(end_state);
                end_date = end_date.setHours(11, 59, 59, 999);
                end_date = new Date(end_date);
                query['created_at'] = {$gte: start_date, $lt: end_date};
            }
        }

        if (item == 'first_name') {
            value = value.replace(/^\s+|\s+$/g, '');
            value = value.replace(/ +(?= )/g, '');

            var full_name = value.split(' ');
            if (typeof full_name[0] == 'undefined' || typeof full_name[1] == 'undefined') {

                query1[item] = new RegExp(value, 'i');
                query2['last_name'] = new RegExp(value, 'i');
                query3[''] = '';
                query4[''] = '';
                query5[''] = '';
                query6[''] = '';
            } else {
                query1[item] = new RegExp(value, 'i');
                query2['last_name'] = new RegExp(value, 'i');
                query3[item] = new RegExp(full_name[0], 'i');
                query4['last_name'] = new RegExp(full_name[0], 'i');
                query5[item] = new RegExp(full_name[1], 'i');
                query6['last_name'] = new RegExp(full_name[1], 'i');
            }
        } else {

            if (item != undefined) {
                query[item] = new RegExp(value, 'i');
            }
        }
        Corporate.count({$and: [{$or: [query1, query2, query3, query4, query5, query6]}, query]}).then((corporatecount) => { 

            if (corporatecount != 0) {
                if (req.body.page == undefined) {
                    page = 1;
                    next = 2;
                    pre = page - 1;

                    var options = {
                        sort: {unique_id: -1},
                        page: page,
                        limit: 10
                    };
                } else {
                    page = req.body.page;
                    next = parseInt(req.body.page) + 1;
                    pre = req.body.page - 1;

                    if (field == 'name') {
                        var options = {
                            sort: {name: order},
                            page: page,
                            limit: 10
                        };
                    } else if (field == 'unique_id') {
                        var options = {
                            sort: {unique_id: order},
                            page: page,
                            limit: 10
                        };
                    } else {
                        var options = {
                            sort: {email: order},
                            page: page,
                            limit: 10
                        };
                    }

                }

                Corporate.paginate({$and: [{$or: [query1, query2, query3, query4, query5, query6]}, query]}, options).then((corporatelist) => { 

                    var j = 1;
                    if (corporatelist.docs.length <= 0) {
                        res.render('corporate_list', {
                            detail: [], currentpage: corporatelist.page, pages: corporatelist.pages,
                            next: next, pre: pre,sort_field, sort_order, search_item, search_value, filter_start_date, filter_end_date
                        });
                    } else {
                        corporatelist.docs.forEach(function (data) {

                            var id = data._id;
                            var query = {};
                            query['user_type_id'] = id;

                            Trip.count(query).then((triptotal) => {

                                Trip_history.count(query).then((triphistorytotal) => {

                                    query['is_trip_end'] = 1

                                    Trip_history.count(query).then((completedtriptotal) => {

                                        if (j == corporatelist.docs.length) {
                                            var is_public_demo = setting_detail.is_public_demo;
                                            data.total_trip = triptotal + triphistorytotal;
                                            data.completed_trip = completedtriptotal;
                                            res.render('corporate_list', { is_public_demo: is_public_demo, detail: corporatelist.docs, currentpage: corporatelist.page, pages: corporatelist.pages, next: next, pre: pre,sort_field, sort_order, search_item, search_value, filter_start_date, filter_end_date });
                                            delete message;
                                        } else {
                                            data.total_trip = triptotal + triphistorytotal;
                                            data.completed_trip = completedtriptotal;
                                            j++;
                                        }
                                    });

                                });
                            });

                        });
                    }

                });
            } else {
                res.render('corporate_list', {
                    detail: array, currentpage: '', pages: '',
                    next: '', pre: '',sort_field, sort_order, search_item, search_value, filter_start_date, filter_end_date
                });
                delete message;
            }
        });
    } else {
        res.redirect('/admin');
    }
};


exports.genetare_corporate_excel = function (req, res) {
    if (typeof req.session.userid != 'undefined') {
        var query = {};
        sort = {};
        array = [];
        var query1 = {};
        var query2 = {};
        var query3 = {};
        var query4 = {};
        var query5 = {};
        var query6 = {};
        if (req.body.page == undefined) {
            sort['unique_id'] = -1;

            search_item = 'first_name';
            search_value = '';
            sort_order = -1;
            sort_field = 'unique_id';
            filter_start_date = '';
            filter_end_date = '';

            var start_date = '';
            var end_state = '';
        } else {

            var field = req.body.sort_item[0];
            var order = req.body.sort_item[1];
            var item = req.body.search_item;
            var value = req.body.search_value;

            sort[field] = order;

            sort_order = req.body.sort_item[1];
            sort_field = req.body.sort_item[0];
            search_item = item
            search_value = value;
            filter_start_date = req.body.start_date;
            filter_end_date = req.body.end_date;

            var start_date = req.body.start_date;
            var end_state = req.body.end_date;
        }
        if (start_date != '' || end_state != '') {
            if (start_date == '') {
                start_date = new Date(end_state);
                start_date = start_date - 1;
                end_date = new Date(end_state);
                end_date = end_date.setHours(11, 59, 59, 999);
                end_date = new Date(end_date);
                query['created_at'] = {$gte: start_date, $lt: end_date};
            } else if (end_state == '') {
                end_date = new Date(start_date);
                end_date = end_date.setHours(11, 59, 59, 999);
                end_date = new Date(end_date);
                start_date = new Date(start_date);
                start_date = start_date - 1;
                query['created_at'] = {$gte: start_date, $lt: end_date};
            } else {
                start_date = new Date(start_date);
                start_date = start_date.setHours(0, 0, 0, 0);
                start_date = new Date(start_date);
                end_date = new Date(end_state);
                end_date = end_date.setHours(11, 59, 59, 999);
                end_date = new Date(end_date);
                query['created_at'] = {$gte: start_date, $lt: end_date};
            }
        }

        if (item == 'first_name') {
            value = value.replace(/^\s+|\s+$/g, '');
            value = value.replace(/ +(?= )/g, '');

            var full_name = value.split(' ');
            if (typeof full_name[0] == 'undefined' || typeof full_name[1] == 'undefined') {

                query1[item] = new RegExp(value, 'i');
                query2['last_name'] = new RegExp(value, 'i');
                query3[''] = '';
                query4[''] = '';
                query5[''] = '';
                query6[''] = '';
            } else {
                query1[item] = new RegExp(value, 'i');
                query2['last_name'] = new RegExp(value, 'i');
                query3[item] = new RegExp(full_name[0], 'i');
                query4['last_name'] = new RegExp(full_name[0], 'i');
                query5[item] = new RegExp(full_name[1], 'i');
                query6['last_name'] = new RegExp(full_name[1], 'i');
            }
        } else {

            if (item != undefined) {
                query[item] = new RegExp(value, 'i');
            }
        }
        Corporate.find({$and: [{$or: [query1, query2, query3, query4, query5, query6]}, query]}).then((array) => { 

                var timezone_for_display_date = setting_detail.timezone_for_display_date;

                var j = 1;
                array.forEach(function (data) {
                    var id = data._id;
                    var query = {};
                    query['user_type_id'] = id;
                    
                    Trip.count(query).then((triptotal) => {
                        Trip_history.count(query).then((triphistorytotal) => {

                            query['is_trip_end'] = 1
                            Trip_history.count(query).then((completedtriptotal) => {
                                if (j == array.length) {
                                    data.total_trip = triptotal + triphistorytotal;
                                    data.completed_trip = completedtriptotal;
                                    generate_excel(req, res, array, timezone_for_display_date)
                                } else {
                                    data.total_trip = triptotal + triphistorytotal;
                                    data.completed_trip = completedtriptotal;
                                    j++;
                                }
                            });
                        });
                    });
                });

        })
    } else {
        res.redirect('/admin');
    }
};


function generate_excel(req, res, array, timezone) {


    var date = new Date()
    var time = date.getTime()
    var wb = new xl.Workbook();
    var ws = wb.addWorksheet('sheet1');
    var col = 1;

    ws.cell(1, col++).string(req.__('title_id'));
    ws.cell(1, col++).string(req.__('title_name'));
    ws.cell(1, col++).string(req.__('title_email'));
    ws.cell(1, col++).string(req.__('title_phone'));
    ws.cell(1, col++).string(req.__('title_total_request'));
    ws.cell(1, col++).string(req.__('title_completed_request'));
    ws.cell(1, col++).string(req.__('title_country'));
    ws.cell(1, col++).string(req.__('title_registered_date'));

    array.forEach(function (data, index) {
        col = 1;
        ws.cell(index + 2, col++).number(data.unique_id);
        ws.cell(index + 2, col++).string(data.name);
        ws.cell(index + 2, col++).string(data.email);
        ws.cell(index + 2, col++).string(data.country_phone_code + data.phone);
        ws.cell(index + 2, col++).number(data.total_trip);
        ws.cell(index + 2, col++).number(data.completed_trip);
        ws.cell(index + 2, col++).string(data.country_name);
        ws.cell(index + 2, col++).string(moment(data.created_at).tz(timezone).format("DD MMM 'YY") + ' ' + moment(data.created_at).tz(timezone).format("hh:mm a"));
        if (index == array.length - 1) {
            wb.write('data/xlsheet/' + time + '_corporate.xlsx', function (err) {
                if (err) {
                    console.error(err);
                } else {
                    var url = req.protocol + "://" + req.get('host') + "/xlsheet/" + time + "_corporate.xlsx";
                    res.json(url);
                    setTimeout(function () {
                        fs.unlink('data/xlsheet/' + time + '_corporate.xlsx', function () {
                        });
                    }, 10000)
                }
            });
        }

    })
}
;


exports.edit_corporate = function (req, res) {
    if (typeof req.session.userid != 'undefined') {
        var id = req.body.id;
        Corporate.findById(id).then((corporatedata) => { 
            Country.findOne({"_id": corporatedata.country_id}).then((country_detail) => { 
              	console.log(country_detail.countryname)
                    var is_public_demo = setting_detail.is_public_demo;

                    res.render('add_corporate', {data: corporatedata, id: id, countryname: country_detail.countryname, phone_number_min_length: setting_detail.minimum_phone_number_length, phone_number_length: setting_detail.maximum_phone_number_length, is_public_demo: is_public_demo});
                    delete message;
                
            });
        });
    } else {
        res.redirect('/admin');
    }
};

exports.update_corporate_detail = function (req, res) {
    if (typeof req.session.userid != 'undefined') {
        var id = req.body.id;
        var data = req.body;

        if (data.password != "") {
            var password = req.body.password;
            var hash = crypto.createHash('md5').update(password).digest('hex');
            data.password = hash;
        } else {
            delete data.password;
        }

        Corporate.findByIdAndUpdate(id, data).then(() => { 
            message = admin_messages.success_message_corporate_update;
            res.redirect("/corporate");
        });
    } else {
        res.redirect('/admin');
    }
};

exports.corporate_is_approved = function (req, res) {
    if (typeof req.session.userid != 'undefined') {
        var id = req.body.id;
        var is_approved = req.body.is_approved;

        if (is_approved == 0) {
            var change = 1;
        } else {
            var change = 0;
        }

        Corporate.findByIdAndUpdate(id, {is_approved: change}).then(() => { 
            res.redirect("/corporate");
        });
    } else {
        res.redirect('/admin');
    }
};


exports.add_corporate_wallet_amount = function (req, res) {

    if (typeof req.session.userid != 'undefined') {

        Corporate.findOne({_id: req.body.user_id}).then((corporate_data) => { 
            if (corporate_data)
            {

                var wallet = utils.precisionRoundTwo(Number(req.body.wallet));
                var total_wallet_amount = utils.addWalletHistory(constant_json.CORPORATE_UNIQUE_NUMBER, corporate_data.unique_id, corporate_data._id, corporate_data.country_id, corporate_data.wallet_currency_code, corporate_data.wallet_currency_code,
                        1, wallet, corporate_data.wallet, constant_json.ADD_WALLET_AMOUNT, constant_json.ADDED_BY_ADMIN, "By Admin")

                corporate_data.wallet = total_wallet_amount;
                corporate_data.save().then(() => { 
                   
                        res.json({success: true, wallet: corporate_data.wallet, message: req.__(admin_messages.success_message_add_wallet)});
                }, (err) => {
                                    utils.error_response(err, res)
                });

            } else
            {
                res.json({success: false, error_code: req.__(admin_messages.errpr_message_add_wallet_failed)});
            }
        });
    } else
    {
        res.json({success: false, error_code: req.__(admin_messages.errpr_message_add_wallet_failed)});
    }
};