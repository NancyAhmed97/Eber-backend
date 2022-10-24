let Guest_Token = require('mongoose').model('guest_token');
let moment = require('moment');
let utils = require('../controllers/utils');
let console = require('../controllers/console');
let xl = require('excel4node');
var fs = require("fs");

exports.guest_token_list = async function (req, res) {
    if (typeof req.session.userid == 'undefined') {
        res.redirect('/admin');
        return;
    }
    let page;
    let next;
    let pre;
    let search_item;
    let search_value;
    let sort_order;
    let sort_field;
    let filter_start_date;
    let filter_end_date;
    let array = [];
    let value;
    let start_date;
    let end_date;

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
        search_item = '';
        search_value = '';
        sort_order = -1;
        sort_field = 'unique_id';
        filter_start_date = '';
        filter_end_date = '';
    } else {
        sort_order = req.body.sort_item[1];
        sort_field = req.body.sort_item[0];
        search_item = req.body.search_item
        search_value = req.body.search_value;
        filter_start_date = req.body.start_date;
        filter_end_date = req.body.end_date;
    }
    let filter = { "$match": {} };

    if (req.body.start_date == '' || req.body.end_date == '') {
        if (req.body.start_date == '' && req.body.end_date == '') {
            start_date = new Date(0);
            filter["$match"]['created_at'] = { $gte: start_date };
        } else if (req.body.start_date == '') {
            start_date = new Date(0);
            end_date = req.body.end_date;
            end_date = new Date(end_date);
            end_date = end_date.setHours(23, 59, 59, 999);
            end_date = new Date(end_date);
            filter["$match"]['created_at'] = { $gte: start_date, $lt: end_date };
        } else {
            start_date = req.body.start_date;
            start_date = new Date(start_date);
            start_date = start_date.setHours(0, 0, 0, 0);
            start_date = new Date(start_date);
            end_date = new Date(Date.now());
            filter["$match"]['created_at'] = { $gte: start_date, $lt: end_date };
        }
    } else if (req.body.start_date == undefined || req.body.end_date == undefined) {
        start_date = new Date(0);
        filter["$match"]['created_at'] = { $gte: start_date };
    } else {
        start_date = req.body.start_date;
        end_date = req.body.end_date;
        start_date = new Date(start_date);
        start_date = start_date.setHours(0, 0, 0, 0);
        start_date = new Date(start_date);
        end_date = new Date(end_date);
        end_date = end_date.setHours(23, 59, 59, 999);
        end_date = new Date(end_date);
        filter["$match"]['created_at'] = { $gte: start_date, $lt: end_date };
    }

    let number_of_rec = 10;

    value = search_value;
    value = value.replace(/^\s+|\s+$/g, '');
    value = value.replace(/ +(?= )/g, '');

    let search = { "$match": {} };

    if (value.length != 0) {
        if (search_item == "unique_id") {
            search["$match"][search_item] = { $eq: Number(value) };
        } else {
            search["$match"][search_item] = { $regex: new RegExp(value, 'i') };
        }
    }

    let sort = { "$sort": {} };
    sort["$sort"][sort_field] = parseInt(sort_order);

    let count = { $group: { _id: null, total: { $sum: 1 } } };

    let skip = {};
    skip["$skip"] = page * number_of_rec;

    let limit = {};
    limit["$limit"] = number_of_rec;


    array = await Guest_Token.aggregate([search, filter, count]);
    if (!array || array.length == 0) {
        array = [];
        res.render('guest_token', {
            detail: array,
            current_page: 1,
            pages: 0,
            next: 1,
            pre: 0,
            moment: moment,
            sort_field,
            sort_order,
            search_item,
            search_value,
            filter_start_date,
            filter_end_date
        });
        delete message;
        return;
    }

    let pages = Math.ceil(array[0].total / number_of_rec);
    array = await Guest_Token.aggregate([search, filter, sort, skip, limit])
    res.render('guest_token', {
        detail: array,
        timezone_for_display_date: setting_detail.timezone_for_display_date,
        current_page: page,
        pages: pages,
        next: next,
        pre: pre,
        moment: moment,
        sort_field,
        sort_order,
        search_item,
        search_value,
        filter_start_date,
        filter_end_date
    });
    delete message;
    return;
};

exports.generate_guest_token_excel = async function (req, res) {
    if (typeof req.session.userid == 'undefined') {
        res.redirect('/admin');
        return;
    }
    let search_item;
    let search_value;
    let sort_order;
    let sort_field;
    let array = [];
    let value;
    let start_date;
    let end_date;

    if (req.body.search_item == undefined) {
        search_item = '';
        search_value = '';
        sort_order = -1;
        sort_field = 'unique_id';
        filter_start_date = '';
        filter_end_date = '';
    } else {
        sort_order = req.body.sort_item[1];
        sort_field = req.body.sort_item[0];
        search_item = req.body.search_item
        search_value = req.body.search_value;
        filter_start_date = req.body.start_date;
        filter_end_date = req.body.end_date;
    }
    let filter = { "$match": {} };

    if (req.body.start_date == '' || req.body.end_date == '') {
        if (req.body.start_date == '' && req.body.end_date == '') {
            start_date = new Date(0);
            filter["$match"]['created_at'] = { $gte: start_date };
        } else if (req.body.start_date == '') {
            start_date = new Date(0);
            end_date = req.body.end_date;
            end_date = new Date(end_date);
            end_date = end_date.setHours(23, 59, 59, 999);
            end_date = new Date(end_date);
            filter["$match"]['created_at'] = { $gte: start_date, $lt: end_date };
        } else {
            start_date = req.body.start_date;
            start_date = new Date(start_date);
            start_date = start_date.setHours(0, 0, 0, 0);
            start_date = new Date(start_date);
            end_date = new Date(Date.now());
            filter["$match"]['created_at'] = { $gte: start_date, $lt: end_date };
        }
    } else if (req.body.start_date == undefined || req.body.end_date == undefined) {
        start_date = new Date(0);
        filter["$match"]['created_at'] = { $gte: start_date };
    } else {
        start_date = req.body.start_date;
        end_date = req.body.end_date;
        start_date = new Date(start_date);
        start_date = start_date.setHours(0, 0, 0, 0);
        start_date = new Date(start_date);
        end_date = new Date(end_date);
        end_date = end_date.setHours(23, 59, 59, 999);
        end_date = new Date(end_date);
        filter["$match"]['created_at'] = { $gte: start_date, $lt: end_date };
    }

    value = search_value;
    value = value.replace(/^\s+|\s+$/g, '');
    value = value.replace(/ +(?= )/g, '');

    let search = { "$match": {} };

    if (value.length != 0) {
        if (search_item == "unique_id") {
            search["$match"][search_item] = { $eq: Number(value) };
        } else {
            search["$match"][search_item] = { $regex: new RegExp(value, 'i') };
        }
    }

    let sort = { "$sort": {} };
    sort["$sort"][sort_field] = parseInt(sort_order);

    array = await Guest_Token.aggregate([search, filter, sort])
    let date = new Date()
    let time = date.getTime()
    let wb = new xl.Workbook();
    let ws = wb.addWorksheet('sheet1');
    let col = 1;
    let exp_date;

    ws.cell(1, col++).string(req.__('title_id'));
    ws.cell(1, col++).string(req.__('title_token_name'));
    ws.cell(1, col++).string(req.__('title_token_value'));
    ws.cell(1, col++).string(req.__('title_state'));
    ws.cell(1, col++).string(req.__('title_is_expired'));

    array.forEach(function (data, index) {
        col = 1;
        ws.cell(index + 2, col++).number(data.unique_id);
        ws.cell(index + 2, col++).string(data.token_name);
        ws.cell(index + 2, col++).string(data.token_value);
        if (data.state == 1) {
            ws.cell(index + 2, col++).string(req.__('title_active'));
        } else {
            ws.cell(index + 2, col++).string(req.__('title_inactive'));
        }

        exp_date = new Date(data.code_expiry);
        if (exp_date.getTime() < date.getTime()) {
            ws.cell(index + 2, col++).string("EXPIRED");
        } else {
            ws.cell(index + 2, col++).string(moment(data.code_expiry).tz(setting_detail.timezone_for_display_date).format("DD MMM YY"));
        }

        if (index == array.length - 1) {
            wb.write('data/xlsheet/' + time + '_guest_token.xlsx', function (err, stats) {
                if (err) {
                    console.error(err);
                } else {
                    let url = req.protocol + "://" + req.get('host') + "/xlsheet/" + time + "_guest_token.xlsx";
                    res.json(url);
                    setTimeout(function () {
                        fs.unlink('data/xlsheet/' + time + '_guest_token.xlsx', function (err, file) {
                        });
                    }, 10000)
                    return;
                }
            });
        }
    })
};


exports.edit = async function (req, res) {
    if (typeof req.session.userid == 'undefined') {
        res.redirect('/admin');
        return;
    }
    let id = req.body.id;
    let guest_token = await Guest_Token.findById(id);
    res.render('guest_token_detail_edit', { data: guest_token, moment: moment, timezone_for_display_date: setting_detail.timezone_for_display_date });
    return;
};

exports.update = async function (req, res) {
    if (typeof req.session.userid == 'undefined') {
        res.redirect('/admin');
        return;
    }
    let id = req.body.id;
    await Guest_Token.findByIdAndUpdate(id, req.body)
    res.redirect('/guest_token');
    return;
};

exports.act = async function (req, res) {
    if (typeof req.session.userid == 'undefined') {
        res.redirect('/admin');
        return;
    }
    let id = req.body.id;
    let state = req.body.state;
    let change;
    if (state == "false") {
        change = true;
    } else {
        change = false;
    }
    await Guest_Token.findByIdAndUpdate(id, { state: change });
    res.redirect('/guest_token');
    return;
};


exports.add_guest_token_form = function (req, res) {
    if (typeof req.session.userid == "undefined") {
        res.redirect('/admin');
        return;
    }
    res.render('guest_token_detail_edit');
    return;
};

exports.add_guest_token = async function (req, res) {
    if (typeof req.session.userid == "undefined") {
        res.redirect('/admin');
        return;
    }
    var add_guest_token = new Guest_Token({
        token_name: req.body.token_name,
        token_value: utils.tokenGenerator(20),
        state: true,
        start_date: req.body.start_date,
        code_expiry: req.body.code_expiry
    });

    await add_guest_token.save()
    res.redirect("/guest_token");
    return;
};