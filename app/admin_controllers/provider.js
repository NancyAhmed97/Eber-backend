var utils = require('../controllers/utils');
require('../controllers/constant');
var allemails = require('../controllers/emails');
var Providers = require('mongoose').model('Provider');
var Provider = require('mongoose').model('Provider');
var Trip = require('mongoose').model('Trip');
var Document = require('mongoose').model('Document');
var Provider_Document = require('mongoose').model('Provider_Document');
var Country = require('mongoose').model('Country');
var moment = require('moment');
var City = require('mongoose').model('City');
var Type = require('mongoose').model('Type');
var console = require('../controllers/console');
var Citytype = require('mongoose').model('city_type');
var mongoose = require('mongoose');
var Schema = mongoose.Types.ObjectId;
var City_type = require('mongoose').model('city_type');
var Provider_Vehicle_Document = require('mongoose').model('Provider_Vehicle_Document');
var myProviders = require('./provider');
express = require('express');
var xl = require('excel4node');
var fs = require("fs");
var console = require('../controllers/console');
var Trip_history = require('mongoose').model('Trip_history');


exports.referral_report = function (req, res, next) {
    if (typeof req.session.userid != 'undefined') {
        var filter_start_date;
        var filter_end_date;
        var start_date = req.body.start_date;
        var end_date = req.body.end_date;
        var page;
        var next;
        var pre;
        var search_item;
        var search_value;
        var sort_order;
        var sort_field;
        var number_of_rec = 10;
        filter_start_date = '';
        filter_end_date = '';

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
            search_item = 'unique_id';
            search_value = '';
            sort_order = 1;
            sort_field = 'unique_id';
        } else {
            var value = req.body.search_value;
            value = value.replace(/^\s+|\s+$/g, '');
            value = value.replace(/ +(?= )/g, '');
            value = new RegExp(value, 'i');
            sort_order = req.body.sort_item[1];
            sort_field = req.body.sort_item[0];
            search_item = req.body.search_item
            search_value = req.body.search_value;
        }

        if (end_date == '' || end_date == undefined) {
            end_date = new Date();
        } else {
            filter_end_date = end_date;
            end_date = new Date(end_date);
            end_date = end_date.setHours(23, 59, 59, 999);
            end_date = new Date(end_date);
        }
        if (start_date == '' || start_date == undefined) {
            start_date = new Date(0);
            start_date = start_date.setHours(0, 0, 0, 0);
            start_date = new Date(start_date);
        } else {
            filter_start_date = start_date;
            start_date = new Date(start_date);
            start_date = start_date.setHours(0, 0, 0, 0);
            start_date = new Date(start_date);
        }

        var lookup = {
            $lookup:
            {
                from: "providers",
                localField: "referred_by",
                foreignField: "_id",
                as: "referred_user_detail"
            }
        };

        var unwind = {$unwind: "$referred_user_detail"}

        var group = {
            $group: {
                _id: '$referred_user_detail._id',
                referred_user_count: {$sum: {$cond: [{$and: [{$gte: ["$referred_user_detail.created_at",start_date]}, {$lt: ["$referred_user_detail.created_at", end_date]}]}, 1, 0]}},
                unique_id: {$first: '$referred_user_detail.unique_id'},
                first_name: {$first: '$referred_user_detail.first_name'},
                last_name: {$first: '$referred_user_detail.last_name'},
                email: {$first: '$referred_user_detail.email'},
                phone: {$first: '$referred_user_detail.phone'}
            }
        }

        value = search_value;
        value = value.replace(/^\s+|\s+$/g, '');
        value = value.replace(/ +(?= )/g, '');

        var search = { $match: {} };

        if (search_item == "first_name") {
            var query1 = {};
            var query2 = {};
            var query3 = {};
            var query4 = {};
            var query5 = {};
            var query6 = {};

            var full_name = value.split(' ');
            if (typeof full_name[0] == 'undefined' || typeof full_name[1] == 'undefined') {

                query1['first_name'] = { $regex: new RegExp(value, 'i') };
                query2['last_name'] = { $regex: new RegExp(value, 'i') };

                search = { "$match": { $or: [query1, query2] } };
            } else {

                query1[search_item] = { $regex: new RegExp(value, 'i') };
                query2['last_name'] = { $regex: new RegExp(value, 'i') };
                query3[search_item] = { $regex: new RegExp(full_name[0], 'i') };
                query4['last_name'] = { $regex: new RegExp(full_name[0], 'i') };
                query5[search_item] = { $regex: new RegExp(full_name[1], 'i') };
                query6['last_name'] = { $regex: new RegExp(full_name[1], 'i') };

                search = { "$match": { $or: [query1, query2, query3, query4, query5, query6] } };
            }
        } else if (search_item == "unique_id") {
            var query1 = {};
            if (value != "") {
                value = Number(value)
                query1[search_item] = { $eq: value };
                search = { "$match": query1 };
            } else {
                search = { $match: {} };
            }
        } else {
            var query1 = {};
            if (value != "") {
                query1[search_item] = { $regex: new RegExp(value, 'i') };
                search = { "$match": query1 };
            } else {
                search = { $match: {} };
            }
        }

        var sort = { "$sort": {} };
        sort["$sort"][sort_field] = parseInt(sort_order);

        var count = { $group: { _id: null, total: { $sum: 1 } } };

        var skip = {};
        skip["$skip"] = page * number_of_rec;

        var limit = {};
        limit["$limit"] = number_of_rec;

        var condition = { $match: { referred_user_count: { $gt: 0 } } };

        Provider.aggregate([lookup, unwind, group, condition, search, count]).then((array) => {
            if (!array || array.length == 0) {
                res.render('provider_referral_report', {
                    provider_list: [],
                    provider_id: req.body.provider_id,
                    filter_start_date,
                    filter_end_date,
                    current_page: 1,
                    pages: 0,
                    next: 1,
                    pre: 0,
                    sort_field,
                    sort_order,
                    search_item,
                    search_value
                });
            } else {
                Provider.aggregate([lookup, unwind, group, condition, search, sort, skip, limit]).then((provider_list) => {
                    var pages = Math.ceil(array[0].total / number_of_rec);
                    res.render('provider_referral_report', {
                        provider_list: provider_list,
                        provider_id: req.body.provider_id,
                        moment: moment,
                        timezone_for_display_date: setting_detail.timezone_for_display_date,
                        filter_start_date,
                        filter_end_date,
                        current_page: page,
                        pages: pages,
                        next: next,
                        pre: pre,
                        sort_field,
                        sort_order,
                        search_item,
                        search_value
                    });
                });
            }
        });
    } else {
        res.redirect('/admin');
    }
};

exports.referral_history = function (req, res) {
    if (typeof req.session.userid != 'undefined') {

        var start_date = req.body.start_date;
        var end_date = req.body.end_date;
        var filter_start_date;
        var filter_end_date;
        

        if (end_date == '' || end_date == undefined) {
            end_date = new Date();
        } else {
            filter_end_date = end_date;
            end_date = new Date(end_date);
            end_date = end_date.setHours(23, 59, 59, 999);
            end_date = new Date(end_date);
        }
        if (start_date == '' || start_date == undefined) {
            start_date = new Date(0);
            start_date = start_date.setHours(0, 0, 0, 0);
            start_date = new Date(start_date);
        } else {
            filter_start_date = start_date;
            start_date = new Date(start_date);
            start_date = start_date.setHours(0, 0, 0, 0);
            start_date = new Date(start_date);
        }

        var condition = {$match: {referred_by: Schema(req.body.provider_id)}};
        var query1 = {};
        query1['created_at'] = {$gte: start_date, $lt: end_date};
        var filter = {"$match": query1};
        console.log(condition)
        Provider.aggregate([condition, filter], function(error, provider_list){
            if(error){
                res.render('provider_referral_history', { provider_list: [], filter_start_date, filter_end_date });
            } else {
                res.render('provider_referral_history', { provider_list: provider_list, provider_id: req.body.provider_id, moment: moment, timezone_for_display_date: setting_detail.timezone_for_display_date, filter_start_date, filter_end_date });
            }
        });

    } else {
        res.redirect('/admin');
    }
};

exports.list = async function (req, res) {
    if (typeof req.session.userid != 'undefined') {
        const response_code = req.flash('response_code');
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
        sort = {};
        array = [];
        var query1 = {};
        var query2 = {};
        var query3 = {};
        var query4 = {};
        var query5 = {};
        var query6 = {};
        var search = [];
        if (req.body.provider_page_type == undefined) {
            provider_page_type = req.path.split('/')[1];
            sort['_id'] = -1;

            search_item = 'first_name';
            search_value = '';
            sort_order = -1;
            sort_field = 'Id';
            filter_start_date = '';
            filter_end_date = '';

            var start_date = '';
            var end_state = '';
        } else {
            provider_page_type = req.body.provider_page_type;

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

        if (provider_page_type == 'online_providers') {
            query['is_active'] = 1;
            query['is_approved'] = 1;
        } else if (provider_page_type == 'approved_providers') {
            query['is_approved'] = 1;
        } else if (provider_page_type == 'pending_for_approvel') {
            query['is_approved'] = 0;
        }

        if (item == 'first_name') {
            value = value.replace(/^\s+|\s+$/g, '');
            value = value.replace(/ +(?= )/g, '');

            var full_name = value.split(' ');
            if (typeof full_name[0] == 'undefined' || typeof full_name[1] == 'undefined') {

                query1[item] = new RegExp(value, 'i');
                query2['last_name'] = new RegExp(value, 'i');
                search.push(query1);
                search.push(query2);
            } else {
                query1[item] = new RegExp(value, 'i');
                query2['last_name'] = new RegExp(value, 'i');
                query3[item] = new RegExp(full_name[0], 'i');
                query4['last_name'] = new RegExp(full_name[0], 'i');
                query5[item] = new RegExp(full_name[1], 'i');
                query6['last_name'] = new RegExp(full_name[1], 'i');
                search.push(query1);
                search.push(query2);
                search.push(query3);
                search.push(query4);
                search.push(query5);
                search.push(query6);
            }
        } else if (item == 'unique_id')
        {
            if (value !== "" && !isNaN(value))
            {
                value = Number(value);
                query[item] = value
            }else if(value !== "") {
                query["item"] = value
            }
        } else {
            if (value !== "") {
                if (item != undefined) {
                    query[item] = new RegExp(value, 'i');
                }
            }
        }
        
        if (search.length == 0) {
            search = [{}];
        }
        var all_type_data = await Type.find({}).select({ _id: 1, typename: 1 }).lean();
        Providers.count({ $and: [{ $or: search }, query] }).then((provider_count) => { 

            if (provider_count != 0) {
                var provider_count = provider_count / 10;
                provider_count = Math.ceil(provider_count);


                if (req.body.page == undefined) {
                    page = 1;
                    next = parseInt(page) + 1;
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
                    var sort = {};
                    sort[field] = order

                    var options = {
                        sort: sort,
                        page: page,
                        limit: 10
                    };
                }

                Providers.paginate({ $and: [{ $or: search }, query] }, options).then((providers) => { 


                    if (providers.docs.length <= 0) {
                        res.render('pending_for_approval_provider_list', {moment: moment,
                            detail: [], currentpage: providers.page, provider_page_type: provider_page_type, pages: providers.pages,
                            next: next, pre: pre,sort_order,search_item,search_value,filter_start_date,filter_end_date,sort_field,
                            response_code
                        });
                    } else {
                        
                        var is_public_demo = setting_detail.is_public_demo;
                        var timezone_for_display_date = setting_detail.timezone_for_display_date;

                        if (provider_page_type == "pending_for_approvel") {
                            res.render('pending_for_approval_provider_list', {
                                is_public_demo: is_public_demo, timezone_for_display_date: timezone_for_display_date, moment: moment,
                                detail: providers.docs, currentpage: providers.page, provider_page_type: provider_page_type, pages: providers.pages,
                                next: next, pre: pre,sort_order,search_item,search_value,filter_start_date,filter_end_date,sort_field,
                                response_code
                            });
                            delete message;
                        } else {
                            var j = 1;
                            providers.docs.forEach(function (data) {

                                if (data.service_type == null) {
                                    if (j == providers.docs.length) {
                                        data.service_type = null;
                                        res.render('providers_list', {
                                            is_public_demo: is_public_demo, moment: moment, timezone_for_display_date: timezone_for_display_date,
                                            detail: providers.docs, provider_page_type: provider_page_type, currentpage: providers.page, pages: providers.pages,
                                            next: next, pre: pre,sort_order,search_item,search_value,filter_start_date,filter_end_date,sort_field,
                                            response_code
                                        });
                                        delete message;
                                    } else {
                                        data.service_type = null;
                                        j++;
                                    }
                                } else {
                                    var i = all_type_data.findIndex(i => String(i._id) == String(data.admintypeid));
                                    var type_data = all_type_data[i];
                                    if (j == providers.docs.length) {
                                        if (type_data) {
                                            data.service_type_name = type_data.typename;
                                        } else {
                                            data.service_type_name = ""
                                        }
                                        res.render('providers_list', {
                                            is_public_demo: is_public_demo, moment: moment, timezone_for_display_date: timezone_for_display_date,
                                            detail: providers.docs, provider_page_type: provider_page_type, currentpage: providers.page, pages: providers.pages,
                                            next: next, pre: pre,sort_order,search_item,search_value,filter_start_date,filter_end_date,sort_field,
                                            response_code
                                        });
                                        delete message;
                                    } else {
                                        if (type_data) {
                                            data.service_type_name = type_data.typename;
                                        } else {
                                            data.service_type_name = ""
                                        }
                                        j++;
                                    }
                                }
                            });
                        }
                    }

                });

            } else {
                var is_public_demo = setting_detail.is_public_demo;
                var timezone_for_display_date = setting_detail.timezone_for_display_date;
                if (provider_page_type == "pending_for_approvel") {

                    res.render('pending_for_approval_provider_list', {
                        is_public_demo: is_public_demo, moment: moment, timezone_for_display_date: timezone_for_display_date,
                        detail: array, provider_page_type: provider_page_type, currentpage: '', pages: '',
                        next: '', pre: '',sort_order,search_item,search_value,filter_start_date,filter_end_date,sort_field,
                        response_code
                    });
                    delete message;
                } else {

                    res.render('providers_list', {
                        is_public_demo: is_public_demo, moment: moment, timezone_for_display_date: timezone_for_display_date,
                        detail: array, provider_page_type: provider_page_type, currentpage: '', pages: '',
                        next: '', pre: '',sort_order,search_item,search_value,filter_start_date,filter_end_date,sort_field,
                        response_code
                    });
                    delete message;
                }
            }
        });
    } else {
        res.redirect('/admin');
    }
}

exports.generate_provider_excel = async function (req, res) {

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

        provider_page_type = req.body.provider_page_type;

        var field = req.body.sort_item[0];
        var order = req.body.sort_item[1];
        var item = req.body.search_item;
        var value = req.body.search_value;

        sort_order = req.body.sort_item[1];
        sort_field = req.body.sort_item[0];
        search_item = item
        search_value = value;
        filter_start_date = req.body.start_date;
        filter_end_date = req.body.end_date;

        var start_date = req.body.start_date;
        var end_state = req.body.end_date;

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

        if (provider_page_type == 'online_providers') {
            query['is_active'] = 1;
            query['is_approved'] = 1;
        } else if (provider_page_type == 'approved_providers') {
            query['is_approved'] = 1;
        } else if (provider_page_type == 'pending_for_approvel') {
            query['is_approved'] = 0;
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
        } else if (item == 'unique_id')
        {
            if (value !== "")
            {
                value = Number(value);
                query[item] = value

            }
        } else {

            if (item != undefined) {
                query[item] = new RegExp(value, 'i');
            }
        }

        var sort = {};
        sort[field] = order;

        
        var all_type_data = await Type.find({}).select({ _id: 1, typename: 1 }).lean();
        Providers.find({$and: [{$or: [query1, query2, query3, query4, query5, query6]}, query]}).then((providers) => { 

            var timezone_for_display_date = setting_detail.timezone_for_display_date;

            var j = 1;
            providers.forEach(function (data) {

                if (data.service_type == null) {
                    if (j == providers.length) {
                        data.service_type = null;
                        generate_excel(req, res, providers, timezone_for_display_date)
                    } else {
                        data.service_type = null;
                        j++;
                    }
                } else {
                    var i = all_type_data.findIndex(i => String(i._id) == String(data.admintypeid));
                    var type_data = all_type_data[i];
                    if (j == providers.length) {
                        data.service_type_name = type_data.typename;

                        generate_excel(req, res, providers, timezone_for_display_date)
                    } else {
                        data.service_type_name = type_data.typename;
                        j++;
                    }
                }

            });

        })


    } else {
        res.redirect('/admin');
    }
}

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
    ws.cell(1, col++).string(req.__('title_cancelled_request'));
    ws.cell(1, col++).string(req.__('title_accepted_request'));
    ws.cell(1, col++).string(req.__('title_city'));
    ws.cell(1, col++).string(req.__('title_car'));
    ws.cell(1, col++).string(req.__('title_app_version'));
    ws.cell(1, col++).string(req.__('title_registered_date'));

    array.forEach(function (data, index) {
        col = 1;
        ws.cell(index + 2, col++).number(data.unique_id);
        ws.cell(index + 2, col++).string(data.first_name + ' ' + data.last_name);
        ws.cell(index + 2, col++).string(data.email);
        ws.cell(index + 2, col++).string(data.country_phone_code + data.phone);
        ws.cell(index + 2, col++).number(data.total_request);
        ws.cell(index + 2, col++).number(data.completed_request);
        ws.cell(index + 2, col++).number(data.cancelled_request);
        ws.cell(index + 2, col++).number(data.accepted_request);
        ws.cell(index + 2, col++).string(data.city);
        ws.cell(index + 2, col++).string(data.service_type_name);
        ws.cell(index + 2, col++).string(data.device_type + '-' + data.app_version);
        ws.cell(index + 2, col++).string(moment(data.created_at).tz(timezone).format("DD MMM 'YY") + ' ' + moment(data.created_at).tz(timezone).format("hh:mm a"));

        if (index == array.length - 1) {
            wb.write('data/xlsheet/' + time + '_provider.xlsx', function (err) {
                if (err) {
                    console.error(err);
                } else {
                    var url = req.protocol + "://" + req.get('host') + "/xlsheet/" + time + "_provider.xlsx";
                    res.json(url);
                    setTimeout(function () {
                        fs.unlink('data/xlsheet/' + time + '_provider.xlsx', function () {
                        });
                    }, 10000)
                }
            });
        }

    })
};


exports.edit = function (req, res) {
    if (typeof req.session.userid != 'undefined') {
        var id = req.body.id;
        var provider_page_type = req.body.provider_page_type;
        Providers.findById(id).then((providers) => { 
            
            var is_public_demo = setting_detail.is_public_demo;
            var timezone_for_display_date = setting_detail.timezone_for_display_date;

            var lookup = {
                $lookup:
                        {
                            from: "types",
                            localField: "typeid",
                            foreignField: "_id",
                            as: "type_detail"
                        }
            };
            var unwind = {$unwind: "$type_detail"};
            Country.findOne({"countryname": providers.country}).then((country_detail) => { 
                City.find({"countryname": providers.country, isBusiness: constant_json.YES}).then((city_list) => { 

                    var mongoose = require('mongoose');
                    var Schema = mongoose.Types.ObjectId;
                    var cityid_condition = {$match: {'cityid': {$eq: Schema(providers.cityid)}}};

                    Citytype.aggregate([cityid_condition, lookup, unwind]).then((type_available) => { 

                        res.render('provider_detail_edit', {city_list: city_list, timezone_for_display_date: timezone_for_display_date, phone_number_min_length: country_detail.phone_number_min_length, phone_number_length: country_detail.phone_number_length, is_public_demo: is_public_demo, data: providers, provider_page_type: provider_page_type, service_type: type_available, 'moment': moment});
                        delete message;
                    }, (err) => {
                        utils.error_response(err, res)
                    });

                });
            });
        });
    } else {
        res.redirect('/admin');
    }
}

// start CHANGED BY BHARTI 29 march //
exports.update = function (req, res) {
    if (typeof req.session.userid != 'undefined') {

        var id = req.body.id;
        var gender = req.body.gender;
        if (gender != undefined) {
            req.body.gender = ((gender).trim()).toLowerCase();
        }
        var files_details = req.files;

        if(req.body.password){
            var crypto = require('crypto');
            var hash = crypto.createHash('md5').update(req.body.password).digest('hex');
            req.body.password = hash;
        } else {
            delete req.body.password;
        }

        City.findOne({cityname: req.body.city, countryname: req.body.country}).then((city) => { 
            if (city)
            {
                req.body.cityid = city._id;
            }

            Provider.findOne({email: req.body.email, _id: {$ne: id}}, function(error, provider_detail){
                if(!provider_detail){
                    Provider.findOne({phone: req.body.phone, country_phone_code: req.body.country_phone_code, _id: {$ne: id}}, function(error, provider_detail){
                        if(!provider_detail){
                            if (files_details == '' || files_details == 'undefined') {
                                Providers.findByIdAndUpdate(id, req.body).then(() => { 
                                    message = admin_messages.success_message_provider_update;
                                    req.flash('response_code', admin_messages.success_message_provider_update);
                                    res.redirect(req.body.provider_page_type);
                                });
                            } else {
                                Providers.findById(id).then((provider) => { 
                                    utils.deleteImageFromFolder(provider.picture, 2);
                                    var image_name = provider._id + utils.tokenGenerator(4);
                                    var url = utils.getImageFolderPath(req, 2) + image_name + '.jpg';
                                    utils.saveImageFromBrowser(req.files[0].path, image_name + '.jpg', 2);
                                    req.body.picture = url;
                                    Providers.findByIdAndUpdate(id, req.body).then(() => { 
                                        message = admin_messages.success_message_provider_update;
                                        req.flash('response_code', admin_messages.success_message_provider_update);
                                        res.redirect(req.body.provider_page_type);
                                    });
                                });
                            }
                        } else {
                            res.json({ success: false, message: req.__(admin_messages.error_message_mobile_no_already_used)  });
                        }
                    });
                } else {
                    res.json({ success: false, message: req.__(admin_messages.error_message_email_already_used) });
                }
            })
            
        });

    } else {
        res.redirect('/admin');
    }
};
// end CHANGED BY BHARTI 29 march //

exports.profile_is_approved = function (req, res) {
    if (typeof req.session.userid != 'undefined') {
        var id = req.body.id;
        var is_approved = req.body.is_approved;
        var is_document_uploaded = req.body.is_document_uploaded;
        var provider_list = {};
        provider_list['is_approved'] = 0;
        var service_type = req.body.service_type;
        Citytype.findOne({_id: req.body.service_type}).then((citytype) => { 
           
                var admintypeid = citytype.typeid;
                var provider_page_type = req.body.provider_page_type;
                
                if (is_approved == 0) {
                    var change = 1;
                } else {
                    var change = 0;
                }
                if (change == 1) { // Approved
                    if (is_document_uploaded == 1) {
                        Providers.findByIdAndUpdate(id, {is_approved: change}, {new : true}).then((providers) => { 
                            if (req.body.vehicle_id !== '') {
                                var index = providers.vehicle_detail.findIndex(x => (x._id).toString() == (req.body.vehicle_id).toString());
                                providers.vehicle_detail[index].service_type = citytype._id;
                                providers.vehicle_detail[index].admin_type_id = admintypeid;
                                providers.vehicle_detail[index].is_selected = true;
                                providers.is_vehicle_document_uploaded = providers.vehicle_detail[index].is_document_uploaded;
                                Providers.findByIdAndUpdate(id, {vehicle_detail: providers.vehicle_detail, is_vehicle_document_uploaded: providers.vehicle_detail[index].is_document_uploaded, service_type: service_type, admintypeid: admintypeid}, function () {

                                });
                            }
                            var device_token = providers.device_token;
                            var device_type = providers.device_type;
                            if (providers.provider_type != 0) {

                                if (providers.is_partner_approved_by_admin == 1) {
                                    var email_notification = setting_detail.email_notification;
                                    if (email_notification == true) {
                                        allemails.sendProviderApprovedEmail(req, providers);
                                    }
                                    utils.sendPushNotification(constant_json.PROVIDER_UNIQUE_NUMBER, device_type, device_token, push_messages.PUSH_CODE_FOR_PROVIDER_APPROVED, constant_json.PUSH_NOTIFICATION_SOUND_FILE_IN_IOS);
                                }
                            } else {
                                var email_notification = setting_detail.email_notification;
                                if (email_notification == true) {
                                    allemails.sendProviderApprovedEmail(req, providers);
                                }
                                utils.sendPushNotification(constant_json.PROVIDER_UNIQUE_NUMBER, device_type, device_token, push_messages.PUSH_CODE_FOR_PROVIDER_APPROVED, constant_json.PUSH_NOTIFICATION_SOUND_FILE_IN_IOS);
                            }
                            
                            if (is_approved == 0) {
                                message = admin_messages.success_message_provider_approved;
                                var provider_type_id = encodeURIComponent(providers.provider_type_id);
                                req.flash('response_code', admin_messages.success_message_provider_approved);
                                res.redirect(provider_page_type+"?provider_type_id="+provider_type_id);
                            } else {
                                message = admin_messages.success_message_provider_declined;
                                req.flash('response_code', admin_messages.success_message_provider_declined);
                                var provider_type_id = encodeURIComponent(providers.provider_type_id);
                                res.redirect(provider_page_type+"?provider_type_id="+provider_type_id);
                            }
                        });
                    } else {
                        message = admin_messages.error_message_document_not_uploaded;
                        req.flash('response_code', admin_messages.error_message_document_not_uploaded);
                        res.redirect(provider_page_type);
                    }

                } else { // Decline
                    Providers.findById(id).then((providers) => { 

                        if (providers.is_trip.length == 0)
                        {
                            providers.is_approved = change;
                            utils.remove_from_zone_queue_new(providers);
                            var device_token = providers.device_token;
                            var device_type = providers.device_type;
                            if (providers.provider_type != 0) {
                                if (providers.is_partner_approved_by_admin != 0) {
                                    providers.is_active = constant_json.NO;
                                    allemails.sendProviderDeclineEmail(req, providers);
                                    utils.sendPushNotification(constant_json.PROVIDER_UNIQUE_NUMBER, device_type, device_token, push_messages.PUSH_CODE_FOR_PROVIDER_DECLINED, constant_json.PUSH_NOTIFICATION_SOUND_FILE_IN_IOS);
                                }
                            } else {
                                providers.is_active = constant_json.NO;
                                allemails.sendProviderDeclineEmail(req, providers);
                                utils.sendPushNotification(constant_json.PROVIDER_UNIQUE_NUMBER, device_type, device_token, push_messages.PUSH_CODE_FOR_PROVIDER_DECLINED, constant_json.PUSH_NOTIFICATION_SOUND_FILE_IN_IOS);

                            }
                            providers.save().then(() => {
                                message = admin_messages.success_message_provider_declined;
                                var provider_type_id = encodeURIComponent(providers.provider_type_id);
                                req.flash('response_code', admin_messages.success_message_provider_declined);
                                res.redirect(provider_page_type + "?provider_type_id=" + provider_type_id);
                            }, (err) => {
                                console.log(err);
                            });
                        } else
                        {
                            message = admin_messages.error_message_provider_in_trip;
                            var provider_type_id = encodeURIComponent(providers.provider_type_id);
                            req.flash('response_code', admin_messages.error_message_provider_in_trip);
                            res.redirect(provider_page_type+"?provider_type_id="+provider_type_id);
                        }
                    });
                }
        });
    } else {
        res.redirect('/admin');
    }
}

exports.available_type = function (req, res) {
    var lookup = {
        $lookup:
                {
                    from: "types",
                    localField: "typeid",
                    foreignField: "_id",
                    as: "type_detail"
                }
    };
    var mongoose = require('mongoose');
    var Schema = mongoose.Types.ObjectId;
    var unwind = {$unwind: "$type_detail"};
    var cityid_condition = {$match: {'cityid': {$eq: Schema(req.body.city)}}};
    var buiesness_condotion = {$match: {'is_business': {$eq: 1}}};

    City_type.aggregate([cityid_condition, buiesness_condotion, lookup, unwind]).then((type_available) => { 
        res.json(type_available);
    }, (err) => {
            utils.error_response(err, res)
    });
};

exports.history = function (req, res, next) {

    if (typeof req.session.userid != 'undefined') {
        var id = req.body.id;
        var page;
        var next;
        var pre;
        var search_item;
        var search_value;
        var sort_order;
        var sort_field;
        var filter_start_date;
        var filter_end_date;
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
            search_item = 'user_detail.first_name';
            search_value = '';
            sort_order = -1;
            sort_field = 'unique_id';
            filter_start_date = '';
            filter_end_date = '';
        } else {
            search_item = req.body.search_item;
            search_value = req.body.search_value;
            sort_order = req.body.sort_item[1];
            sort_field = req.body.sort_item[0];
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
                        localField: "current_provider",
                        foreignField: "_id",
                        as: "provider_detail"
                    }
        };

        var unwind1 = {$unwind: "$provider_detail"};

        value = search_value;
        value = value.replace(/^\s+|\s+$/g, '');
        value = value.replace(/ +(?= )/g, '');

        if (search_item == "user_detail.first_name") {
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
        } else {
            var search = {"$match": {search_item: {$regex: new RegExp(value, 'i')}}};
        }

        query1['provider_trip_end_time'] = {$gte: start_date, $lt: end_date};
        var filter = {"$match": query1};

        var sort = {"$sort": {}};
        sort["$sort"][sort_field] = parseInt(sort_order);

        var count = {$group: {_id: null, total: {$sum: 1}, data: {$push: '$data'}}};

        var skip = {};
        skip["$skip"] = page * number_of_rec;

        var limit = {};
        limit["$limit"] = number_of_rec;

        var mongoose = require('mongoose');
        var Schema = mongoose.Types.ObjectId;
        var condition = {"$match": {'provider_id': {$eq: Schema(id)}}};
        var trip_condition = {"$match": {$or: [{is_trip_completed: 1}, {is_trip_cancelled: 1}, {is_trip_cancelled_by_provider: 1}]}};

        Trip_history.aggregate([condition, trip_condition, lookup, unwind, lookup1, unwind1, search, filter, count]).then((array) => { 
            if (array.length == 0) {
                res.render('providers_history', { detail: array, 'current_page': 1, 'pages': 0, 'next': 1, 'pre': 0, moment: moment, id: id, sort_order, search_item, search_value, filter_start_date, filter_end_date, sort_field });
            } else {
                var pages = Math.ceil(array[0].total / number_of_rec);
                Trip_history.aggregate([condition, trip_condition, lookup, unwind, lookup1, unwind1, search, filter, sort, skip, limit]).then((array) => { 

                    res.render('providers_history', { detail: array, 'current_page': page, 'pages': pages, 'next': next, 'pre': pre, moment: moment, id: id, sort_order, search_item, search_value, filter_start_date, filter_end_date, sort_field });
                }, (err) => {
                    utils.error_response(err, res)
                });
            }
        }, (err) => {
            utils.error_response(err, res)
        });
    } else {
        res.redirect("/admin");
    }

};

exports.documents = function (req, res) {
    if (typeof req.session.userid != 'undefined') {
        var id = req.body.id;
        query = {};
        query['provider_id'] = id;

        Provider_Document.find(query).then((array) => { 
                res.render('provider_documents', {detail: array, moment: moment, id: id});
        });
    } else {
        res.redirect('/admin');
    }
};

exports.provider_documents_edit = function (req, res) {

    if (typeof req.session.userid != 'undefined') {
        Provider_Document.findById(req.body.id).then((provider_document) => { 
            
                res.render('admin_provider_documents_edit', {detail: provider_document, moment: moment});

        });
    } else {
        res.redirect('/admin');
    }
};

exports.provider_documents_update = function (req, res, next) {
    // exports.provider_documents_edit(req, res, next)
    if (typeof req.session.userid != 'undefined') {
        Provider_Document.findById(req.body.id).then((provider_document) => { 
            Provider.findOne({_id: provider_document.provider_id}).then((provider_detail) => {
                provider_document.expired_date = req.body.expired_date;
                provider_document.unique_code = req.body.unique_code;
                if (req.files.length > 0)
                {
                    var image_name = provider_document.provider_id + utils.tokenGenerator(4);
                    var url = utils.getImageFolderPath(req, 3) + image_name + '.jpg';
                    utils.saveImageFromBrowser(req.files[0].path, image_name + '.jpg', 3);
                    provider_document.document_picture = url;
                    provider_document.is_uploaded = 1;
                    provider_document.save(function () {
                        req.url = '/proivder_documents';
                        req.body = {id: provider_document.provider_id}

                        Provider_Document.find({
                            provider_id: req.body.provider_id,
                            option: 1,
                            is_uploaded: 0
                        }).then((document_list) => {

                            Provider_Document.find({
                                provider_id: req.body.provider_id,
                                option: 1,
                                is_document_expired: true
                            }).then((expired_document_list) => {

                                if (expired_document_list.length == 0) {
                                    provider_detail.is_documents_expired = false;
                                } else {
                                    provider_detail.is_documents_expired = true;
                                }
                                if (document_list.length == 0) {
                                    provider_detail.is_document_uploaded = 1;
                                } else {
                                    provider_detail.is_document_uploaded = 0;
                                }
                                provider_detail.save().then(() => {
                                    exports.documents(req, res, next)
                                });
                            });
                        });
                    });
                } else {
                    provider_document.save().then(() => {
                        req.url = '/proivder_documents';
                        req.body = {id: provider_document.provider_id}
                        exports.documents(req, res, next)
                    }, (err) => {
                        console.log(err);
                    });
                }
            });
        });
    } else {
        res.redirect('/admin');
    }
};


exports.provider_documents_delete = function (req, res, next) {

    if (typeof req.session.userid != 'undefined') {
        Provider_Document.findById(req.body.id).then((provider_document) => { 

            if (provider_document)
            {
                provider_document.is_uploaded = 0;
                provider_document.document_picture = "";
                provider_document.is_document_expired = false;
                provider_document.expired_date = "";
                provider_document.unique_code = "";
                provider_document.save().then(()=>{
                    if (provider_document.option == 1)
                    {
                        Provider.findById(provider_document.provider_id).then((provider_data) => { 
    
                            provider_data.is_document_uploaded = 0;
                            provider_data.save();
                            var device_type = provider_data.device_type;
                            var device_token = provider_data.device_token;
    
                            utils.sendPushNotification(constant_json.PROVIDER_UNIQUE_NUMBER, device_type, device_token, push_messages.PUSH_CODE_FOR_DOCUMENT_UPLOAD, constant_json.PUSH_NOTIFICATION_SOUND_FILE_IN_IOS);
                            message = admin_messages.success_message_provider_document_delete;
                            req.body = {id: provider_document.provider_id}
                            exports.documents(req, res, next)
                        })
                    } else
                    {
                        message = admin_messages.success_message_provider_document_delete;
                        req.body = {id: provider_document.provider_id}
                        exports.documents(req, res, next)
                    }
                }) 
            } else
            {
                message = admin_messages.success_message_provider_document_delete;
                exports.documents(req, res, next)
            }
        })
    } else {
        res.redirect('/admin');
    }
};

exports.provider_vehicle_list = function (req, res) {
    if (typeof req.session.userid != 'undefined') {

        if (!req.body.provider_id) {
            req.body.provider_id = req.query.provider_id;
        }
        var condition = {$match: {"_id": Schema(req.body.provider_id)}};
        var vunwind = {$unwind: "$vehicle_detail"}

        var lookup = {
            $lookup:
                    {
                        from: "types",
                        localField: "vehicle_detail.admin_type_id",
                        foreignField: "_id",
                        as: "type_detail"
                    }
        };
        var unwind = {$unwind: {
                path: "$type_detail",
                preserveNullAndEmptyArrays: true
            }
        };
        var group = {$group: {
                _id: null,
                "vehicle_detail": {$push: {
                        is_selected: "$vehicle_detail.is_selected",
                        passing_year: "$vehicle_detail.passing_year",
                        color: "$vehicle_detail.color",
                        model: "$vehicle_detail.model",
                        plate_no: "$vehicle_detail.plate_no",
                        name: "$vehicle_detail.name",
                        accessibility: "$vehicle_detail.accessibility",
                        _id: "$vehicle_detail._id",
                        provider_id: "$_id",
                        type_image_url: '$type_detail.type_image_url',
                        typename: '$type_detail.typename'
                    }}
            }
        }
        Provider.aggregate([condition, vunwind, lookup, unwind, group]).then((provider) => { 
            if (provider.length == 0) {
                res.render('provider_vehicle_list', {provider_id: req.body.provider_id, vehicle_list: [], type: req.body.type})
            } else {
                res.render('provider_vehicle_list', {provider_id: req.body.provider_id, vehicle_list: provider[0].vehicle_detail, type: req.body.type})

            }
        }, (err) => {
            utils.error_response(err, res)
        })
    } else {
        res.redirect('/admin');
    }
};

exports.add_provider_vehicle = function (req, res) {
    if (typeof req.session.userid != 'undefined' || typeof req.session.partner != 'undefined') {
        var vehicle_accesibility = VEHICLE_ACCESIBILITY;
        Provider.findOne({_id: req.body.provider_id}, function (err, provider) {
            var lookup = {
                $lookup:
                        {
                            from: "types",
                            localField: "typeid",
                            foreignField: "_id",
                            as: "type_detail"
                        }
            };
            var unwind = {$unwind: "$type_detail"};

            var cityid_condition = {$match: {'cityid': {$eq: Schema(provider.cityid)}}};

            Citytype.aggregate([cityid_condition, lookup, unwind], function (err, type_available) {

                res.render('edit_vehicle_detail', {type_available: type_available, vehicle_accesibility: vehicle_accesibility, type: req.body.type, provider_id: req.body.provider_id})
            });
        });
    } else {
        res.redirect('/admin');
    }
};

exports.add_provider_vehicle_data = function (req, res) {
    if (typeof req.session.userid != 'undefined' || typeof req.session.partner != 'undefined') {
         Provider.findOne({_id: req.body.provider_id}, function (err, provider) {
            Citytype.findOne({_id: req.body.service_type}, function (err, citytype) {
                var is_selected = false;
                if(provider.vehicle_detail.length==0){
                    is_selected = true;
                }
                if(provider.vehicle_detail.length == 0){
                    provider.service_type = null;
                    provider.admintypeid = null;
                }
                var mongoose = require('mongoose');
                var ObjectId = mongoose.Types.ObjectId;
                var x = new ObjectId();
                var vehicel_json = {
                    _id: x,
                    name: req.body.name,
                    plate_no: req.body.plate_no,
                    model: req.body.model,
                    color: req.body.color,
                    passing_year: req.body.passing_year,
                    service_type: citytype._id,
                    admin_type_id: citytype.typeid,
                    is_selected: is_selected,
                    is_document_uploaded: false,
                    is_selected: false,
                    is_document_expired: false,
                    accessibility: req.body.accessibility
                }
                

                Country.findOne({countryname: provider.country}, function (err, country) {

                    Document.find({countryid: country._id, type: 2}, function (err, document) {

                        var is_document_uploaded = false;
                        var document_size = document.length;

                        if (document_size !== 0) {

                            var count = 0;
                            for (var i = 0; i < document_size; i++) {

                                if (document[i].option == 0) {
                                    count++;
                                } else {
                                    break;
                                }
                                if (count == document_size) {
                                    is_document_uploaded = true;
                                }
                            }

                            document.forEach(function (entry , index) {
                                var providervehicledocument = new Provider_Vehicle_Document({

                                    vehicle_id:x,
                                    provider_id: provider._id,
                                    document_id: entry._id,
                                    name: entry.title,
                                    option: entry.option,
                                    document_picture: "",
                                    unique_code: entry.unique_code,
                                    is_show_expiry_date: entry.is_show_expiry_date,
                                    expired_date: "",
                                    is_unique_code: entry.is_unique_code,
                                    is_expired_date: entry.is_expired_date,
                                    is_expired_time: entry.is_expired_time,
                                    is_document_expired: false,
                                    is_uploaded: 0

                                });
                                providervehicledocument.save(function (err) {
                                    if (err) {
                                        console.log(err);
                                    } else {
                                        if(index == document.length-1){
                                            message = process.env.success_add_vehicle_detail;
                                            res.redirect("provider_vehicle_list?provider_id=" + provider._id);
                                        }
                                    }
                                    
                                });
                            });
                            vehicel_json.is_document_uploaded = is_document_uploaded;
                            provider.vehicle_detail.unshift(vehicel_json);
                            provider.save();
                        } else {
                            vehicel_json.is_document_uploaded = true;
                            provider.vehicle_detail.unshift(vehicel_json);
                            provider.save().then(()=>{
                                res.redirect("provider_vehicle_list?provider_id=" + provider._id);
                            })
                        }
                    }); 
                });
            });
        });
    } else {
        res.redirect('/admin');
    }
};

exports.delete_vehicle_detail = function (req, res) {
    Provider.findOne({_id: req.body.provider_id}, function (err, provider) {
        var index = provider.vehicle_detail.findIndex(x => (x._id).toString() == req.body.vehicle_id);
        if(index != -1){
            if (provider.vehicle_detail[index].is_selected == true) {
                provider.service_type = null;
                provider.admintypeid = null;
                if (provider.vehicle_detail.length == 1) {
                    provider.is_vehicle_document_uploaded = false;
                }
            }
            provider.vehicle_detail.splice(index, 1);
        }
        provider.markModified('vehicle_detail');
        provider.save(function(){
            res.redirect("provider_vehicle_list?provider_id=" + provider._id);
        });
    });
}

exports.edit_vehicle_detail = function (req, res) {
    var vehicle_accesibility = VEHICLE_ACCESIBILITY;

    if (typeof req.session.userid != 'undefined') {

        Provider.findOne({_id: req.body.provider_id}).then((provider) => { 
            var index = provider.vehicle_detail.findIndex(x => (x._id).toString() == req.body.vehicle_id);
            Provider_Vehicle_Document.find({provider_id: req.body.provider_id, vehicle_id: req.body.vehicle_id}).then((provider_vehicle_document) => { 

                var lookup = {
                    $lookup:
                            {
                                from: "types",
                                localField: "typeid",
                                foreignField: "_id",
                                as: "type_detail"
                            }
                };
                var unwind = {$unwind: "$type_detail"};
                var cityid_condition = {$match: {'cityid': {$eq: Schema(provider.cityid)}}};

                Citytype.aggregate([cityid_condition, lookup, unwind]).then((type_available) => { 

                    res.render('edit_vehicle_detail', {provider_id: req.body.provider_id, type: 'admin', type_available: type_available, vehicle_accesibility: vehicle_accesibility, provider_vehicle_document: provider_vehicle_document, vehicle_detail: provider.vehicle_detail[index]})
                }, (err) => {
                    utils.error_response(err, res)
                });

            })
        })

    } else {
        res.redirect('/admin');
    }
};

exports.update_vehicle_detail = function (req, res) {
    if (typeof req.session.userid != 'undefined') {

        Provider.findOne({_id: req.body.provider_id}).then((provider) => { 

            var index = provider.vehicle_detail.findIndex(x => (x._id).toString() == req.body.vehicle_id);

            Citytype.findOne({_id: req.body.service_type}).then((citytype) => { 

                provider.vehicle_detail[index].service_type = citytype._id;
                provider.vehicle_detail[index].admin_type_id = citytype.typeid;
                provider.vehicle_detail[index].name = req.body.name;
                provider.vehicle_detail[index].plate_no = req.body.plate_no;
                provider.vehicle_detail[index].model = req.body.model;
                provider.vehicle_detail[index].color = req.body.color;
                provider.vehicle_detail[index].accessibility = req.body.accessibility;

                provider.vehicle_detail[index].passing_year = req.body.passing_year;

                if(provider.vehicle_detail[index].is_selected == true){
                    provider.service_type=citytype._id;
                    provider.admintypeid=citytype.typeid;
                }
                provider.markModified('vehicle_detail');
                provider.save().then(() => { 
                    res.redirect("provider_vehicle_list?provider_id=" + provider._id);
                });
            });
        });
    } else {
        res.redirect('/admin');
    }
};


exports.vehicle_document_list = function (req, res) {
    if (typeof req.session.userid != 'undefined') {
        Provider_Vehicle_Document.find({provider_id: req.body.provider_id, vehicle_id: req.body.vehicle_id}).then((provider_vehicle_document) => { 

            res.render('vehicle_document_list', {provider_id: req.body.provider_id, vehicle_id: req.body.vehicle_id, moment: moment, detail: provider_vehicle_document})

        });
    } else {
        res.redirect('/admin');
    }
};


exports.provider_vehicle_documents_edit = function (req, res) {

    if (typeof req.session.userid != 'undefined') {

        Provider_Vehicle_Document.findById(req.body.id).then((provider_document) => { 
                res.render('admin_provider_vehicle_documents_edit', {detail: provider_document, moment: moment});
        });
    } else {
        res.redirect('/admin');
    }
};

exports.provider_vehicle_documents_update = function (req, res) {

    if (typeof req.session.userid != 'undefined') {
        Provider_Vehicle_Document.findById(req.body.id).then((provider_document) => { 
            
                provider_document.expired_date = req.body.expired_date;
                provider_document.unique_code = req.body.unique_code;

                if (req.files.length > 0)
                {
                    var image_name = provider_document.provider_id + utils.tokenGenerator(4);
                    var url = utils.getImageFolderPath(req, 3) + image_name + '.jpg';
                    utils.saveImageFromBrowser(req.files[0].path, image_name + '.jpg', 3);
                    provider_document.document_picture = url;
                    provider_document.is_uploaded = 1;
                }
                provider_document.save().then(() => { 
                    req.body = {provider_id: provider_document.provider_id, vehicle_id: provider_document.vehicle_id}
                    myProviders.vehicle_document_list(req, res);
                    Provider_Vehicle_Document.find({
                        vehicle_id: provider_document.vehicle_id,
                        option: 1,
                        provider_id: provider_document.provider_id,
                        is_uploaded: 0
                    }).then((providervehicledocumentuploaded) => {
                        Provider.findOne({_id: provider_document.provider_id}).then((provider) => {
                            var index = provider.vehicle_detail.findIndex((x) => (x._id).toString() == (provider_document.vehicle_id)).toString();

                            if (providervehicledocumentuploaded.length == 0) {
                                provider.vehicle_detail[index].is_document_uploaded = true;
                            } else {
                                provider.vehicle_detail[index].is_document_uploaded = false;
                            }
                            provider.markModified('vehicle_detail');
                            if(provider.vehicle_detail[index].is_selected){
                                if (providervehicledocumentuploaded.length == 0) {
                                    provider.is_vehicle_document_uploaded = true;
                                } else {
                                    provider.is_vehicle_document_uploaded = false;
                                }
                            }
                            provider.save();
                        });
                    });
                });
        });
    } else {
        res.redirect('/admin');
    }
};

// admin_add_provider_wallet
exports.admin_add_provider_wallet = function (req, res) {

    if (typeof req.session.userid != 'undefined') {

        Provider.findById(req.body.provider_id).then((provider_data) => { 
            if (provider_data)
            {
                var wallet = utils.precisionRoundTwo(Number(req.body.wallet));
                var status = constant_json.DEDUCT_WALLET_AMOUNT
                if(wallet > 0){
                    status = constant_json.ADD_WALLET_AMOUNT
                }
                
                if(wallet != 0){
                    var total_wallet_amount = utils.addWalletHistory(constant_json.PROVIDER_UNIQUE_NUMBER, provider_data.unique_id, provider_data._id, provider_data.country_id, provider_data.wallet_currency_code, provider_data.wallet_currency_code,
                            1, Math.abs(wallet), provider_data.wallet, status, constant_json.ADDED_BY_ADMIN, "By Admin")

                    provider_data.wallet = total_wallet_amount;
                }
                //provider_data.wallet = provider_data.wallet + Number(req.body.wallet);
                provider_data.save().then(() => { 
                    res.json({success: true, wallet: provider_data.wallet, message: req.__(admin_messages.success_message_add_wallet)});
                });
            } else
            {
                res.json({success: false, error_code: req.__(admin_messages.errpr_message_add_wallet_failed)});
            }
        })
    } else
    {
        res.json({success: false, error_code: req.__(admin_messages.errpr_message_add_wallet_failed)});
    }
}

// generate_provider_history_excel
exports.generate_provider_history_excel = function (req, res) {

    if (typeof req.session.userid != 'undefined') {
        var id = req.body.id;
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
            search_item = 'user_detail.first_name';
            search_value = '';
            sort_order = -1;
            sort_field = 'unique_id';
            filter_start_date = '';
            filter_end_date = '';
        } else {
            search_item = req.body.search_item;
            search_value = req.body.search_value;
            sort_order = req.body.sort_item[1];
            sort_field = req.body.sort_item[0];
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


        value = search_value;
        value = value.replace(/^\s+|\s+$/g, '');
        value = value.replace(/ +(?= )/g, '');

        if (search_item == "user_detail.first_name") {
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
        } else {

            var search = {"$match": {search_item: {$regex: new RegExp(value, 'i')}}};
        }

        query1['provider_trip_end_time'] = {$gte: start_date, $lt: end_date};
        var filter = {"$match": query1};

        var sort = {"$sort": {}};
        sort["$sort"][sort_field] = parseInt(sort_order);
        
        var mongoose = require('mongoose');
        var Schema = mongoose.Types.ObjectId;
        var condition = {"$match": {'provider_id': {$eq: Schema(id)}}};
        var trip_condition = {"$match": {$or: [{is_trip_completed: 1}, {is_trip_cancelled: 1}, {is_trip_cancelled_by_provider: 1}]}};

        Trip_history.aggregate([condition, trip_condition, lookup, unwind, lookup1, search, filter, sort]).then((array) => {

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
                ws.cell(index + 2, col++).string(moment(data.created_at).format("DD MMM 'YY") + ' ' + moment(data.created_at).format("hh:mm a"));

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
                    wb.write('data/xlsheet/' + time + '_provider_history.xlsx', function (err) {
                        if (err) {
                            console.error(err);
                        } else {
                            var url = req.protocol + "://" + req.get('host') + "/xlsheet/" + time + "_provider_history.xlsx";
                            res.json(url);
                            setTimeout(function () {
                                fs.unlink('data/xlsheet/' + time + '_provider_history.xlsx', function () {
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

};

exports.update_profile_approve_status = function (req, res) {
    var id = req.body.id;
    var is_approved = req.body.is_approved;
    var is_document_uploaded = req.body.is_document_uploaded;
    var provider_list = {};
    provider_list['is_approved'] = 0;
    var service_type = req.body.service_type;
    Citytype.findOne({ _id: req.body.service_type }).then((citytype) => {

        var admintypeid = citytype.typeid;

        if (is_approved == 0) {
            var change = 1;
        } else {
            var change = 0;
        }
        if (change == 1) { // Approved
            if (is_document_uploaded == 1) {
                Providers.findByIdAndUpdate(id, { is_approved: change }, { new: true }).then((providers) => {
                    console.log(providers)
                    if (req.body.vehicle_id !== '') {
                        var index = providers.vehicle_detail.findIndex(x => (x._id).toString() == (req.body.vehicle_id).toString());
                        providers.vehicle_detail[index].service_type = citytype._id;
                        providers.vehicle_detail[index].admin_type_id = admintypeid;
                        providers.vehicle_detail[index].is_selected = true;
                        providers.is_vehicle_document_uploaded = providers.vehicle_detail[index].is_document_uploaded;
                        Providers.findByIdAndUpdate(id, { vehicle_detail: providers.vehicle_detail, is_vehicle_document_uploaded: providers.vehicle_detail[index].is_document_uploaded, service_type: service_type, admintypeid: admintypeid }, function () {

                        });
                    }
                    var device_token = providers.device_token;
                    var device_type = providers.device_type;
                    if (providers.provider_type != 0) {

                        if (providers.is_partner_approved_by_admin == 1) {
                            var email_notification = setting_detail.email_notification;
                            if (email_notification == true) {
                                allemails.sendProviderApprovedEmail(req, providers);
                            }
                            utils.sendPushNotification(constant_json.PROVIDER_UNIQUE_NUMBER, device_type, device_token, push_messages.PUSH_CODE_FOR_PROVIDER_APPROVED, constant_json.PUSH_NOTIFICATION_SOUND_FILE_IN_IOS);
                        }
                    } else {
                        var email_notification = setting_detail.email_notification;
                        if (email_notification == true) {
                            allemails.sendProviderApprovedEmail(req, providers);
                        }
                        utils.sendPushNotification(constant_json.PROVIDER_UNIQUE_NUMBER, device_type, device_token, push_messages.PUSH_CODE_FOR_PROVIDER_APPROVED, constant_json.PUSH_NOTIFICATION_SOUND_FILE_IN_IOS);
                    }

                    if (is_approved == 0) {
                        res.send({ success: true })
                    } else {
                        res.send({ success: true })
                    }
                });
            } else {
                res.send({ success: false })
            }
        } else { // Decline
            Providers.findById(id).then((providers) => {

                if (providers.is_trip.length == 0) {
                    providers.is_approved = change;
                    providers.save().then(() => {
                    }, (err) => {
                        console.log(err);
                    });
                    utils.remove_from_zone_queue_new(providers);
                    var device_token = providers.device_token;
                    var device_type = providers.device_type;
                    if (providers.provider_type != 0) {
                        if (providers.is_partner_approved_by_admin != 0) {

                            providers.is_active = constant_json.NO;
                            providers.save().then(() => {
                            }, (err) => {
                                console.log(err);
                            });
                            allemails.sendProviderDeclineEmail(req, providers);
                            utils.sendPushNotification(constant_json.PROVIDER_UNIQUE_NUMBER, device_type, device_token, push_messages.PUSH_CODE_FOR_PROVIDER_DECLINED, constant_json.PUSH_NOTIFICATION_SOUND_FILE_IN_IOS);
                        }
                    } else {
                        providers.is_active = constant_json.NO;
                        providers.save().then(() => {
                        }, (err) => {
                            console.log(err);
                        });
                        allemails.sendProviderDeclineEmail(req, providers);
                        utils.sendPushNotification(constant_json.PROVIDER_UNIQUE_NUMBER, device_type, device_token, push_messages.PUSH_CODE_FOR_PROVIDER_DECLINED, constant_json.PUSH_NOTIFICATION_SOUND_FILE_IN_IOS);

                    }
                    res.send({ success: true })
                } else {
                    res.send({ success: false })

                }
            });
        }
    });
}

exports.update_provider_vehicle_type = async function (req, res) {
    if (typeof req.session.userid != 'undefined') {
        delete req.body.is_vehicle_saved;
        let provider_id = req.body.provider_id;
        delete req.body.provider_id;
        let total_vehicle = Object.keys(req.body).length;
        let provider_details = await Providers.findById(provider_id)
        let vehicle;
        for (let index = 0; index < total_vehicle; index++) {
            vehicle = JSON.parse(req.body["vehicle" + index])
            let i = provider_details.vehicle_detail.findIndex(i => String(i._id) == vehicle.vehicle_id)
            if (i != -1) {
                provider_details.vehicle_detail[i].admin_type_id = Schema(vehicle.admin_type_id);
                provider_details.vehicle_detail[i].service_type = Schema(vehicle.service_type);
                if (provider_details.vehicle_detail[i].is_selected) {
                    provider_details.service_type = Schema(vehicle.service_type);
                    provider_details.admintypeid = Schema(vehicle.admin_type_id);
                }
            }
        }
        provider_details.markModified('vehicle_detail');
        provider_details.save().then(() => {
            res.json({ success: true })
        }).catch(() => {
            res.json({ success: false })
        })
    } else {
        res.redirect('/admin');
    }
}

exports.unfreeze_provider = async function (req, res) {
    if (typeof req.session.userid == 'undefined') {
        return res.redirect('/admin');
    }
    let id = req.body.id;
    let provider_page_type = req.body.provider_page_type;
    let trip = await Trip.findById(req.body.trip_id);
    if (!trip) {
        trip = await Trip_history.findById(req.body.trip_id);
    }
    if (!trip) {
        message = admin_messages.trip_not_found;
        return res.redirect(provider_page_type);
    }
    if (trip.is_trip_end == 0) {
        message = admin_messages.error_trip_already_running;
        return res.redirect(provider_page_type);
    }
    Providers.findByIdAndUpdate(id, { is_trip: [], is_available: 1 }, { new: true }).then(() => {
        message = admin_messages.success_message_provider_unfreeze;
        return res.redirect(provider_page_type);
    })
    
}