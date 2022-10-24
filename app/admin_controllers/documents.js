var Document = require('mongoose').model('Document');
var Country = require('mongoose').model('Country');
var Provider = require('mongoose').model('Provider');
var Provider_Document = require('mongoose').model('Provider_Document');
var User = require('mongoose').model('User');
var User_Document = require('mongoose').model('User_Document');
var xl = require('excel4node');
var fs = require("fs");
var console = require('../controllers/console');
exports.list = function (req, res, next) {
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
        search_item = 'title';
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

    if (typeof req.session.userid != 'undefined') {

        var number_of_rec = 10;
        value = search_value;
        value = value.replace(/^\s+|\s+$/g, '');
        value = value.replace(/ +(?= )/g, '');
        value = new RegExp(value, 'i');

        var lookup = {
            $lookup:
            {
                from: "countries",
                localField: "countryid",
                foreignField: "_id",
                as: "country_detail"
            }
        };

        var unwind = {$unwind: "$country_detail"};
        ///// For search string /////
        var search = {"$match": {}};
        search["$match"][search_item] = {$regex: value};
        ////////////////////////////

        ///// For date filter /////
        var filter = {"$match": {}};
        filter["$match"]['created_at'] = {$gte: start_date, $lt: end_date};
        ///////////////////////////

        ///// For sort by field /////
        var sort = {"$sort": {}};
        sort["$sort"][sort_field] = parseInt(sort_order);


        ///// For Count number of result /////
        var count = {$group: {_id: null, total: {$sum: 1}, data: {$push: '$data'}}};
        /////////////////////////////////////

        //// For skip number of result /////
        var skip = {};
        skip["$skip"] = page * number_of_rec


        ///// For limitation on result /////
        var limit = {};
        limit["$limit"] = number_of_rec


        Document.aggregate([lookup, unwind, search, filter, count]).then((array) => { 
            if (!array || array.length == 0) {
                array = [];
                res.render('documents_provider', { detail: array, 'current_page': 1, 'pages': 0, 'next': 1, 'pre': 0, sort_field, sort_order, search_item, search_value, filter_start_date, filter_end_date });
                delete message;
            } else {
                var pages = Math.ceil(array[0].total / number_of_rec);

                Document.aggregate([lookup, unwind, search, filter, sort, skip, limit]).then((array) => { 

                    res.render('documents_provider', { detail: array, 'current_page': page, 'pages': pages, 'next': next, 'pre': pre, sort_field, sort_order, search_item, search_value, filter_start_date, filter_end_date });
                    delete message;
                });
            }

        });

    } else {
        res.redirect('/admin');
    }
};


exports.generate_document_excel = function (req, res, next) {
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
        search_item = 'title';
        search_value = '';
        sort_order = 1;
        sort_field = 'type';
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

    if (typeof req.session.userid != 'undefined') {

        var number_of_rec = 10;
        value = search_value;
        value = value.replace(/^\s+|\s+$/g, '');
        value = value.replace(/ +(?= )/g, '');
        value = new RegExp(value, 'i');

        var lookup = {
            $lookup:
            {
                from: "countries",
                localField: "countryid",
                foreignField: "_id",
                as: "country_detail"
            }
        };

        var unwind = {$unwind: "$country_detail"};
        ///// For search string /////
        var search = {"$match": {}};
        search["$match"][search_item] = {$regex: value};

        ///// For date filter /////
        var filter = {"$match": {}};
        filter["$match"]['created_at'] = {$gte: start_date, $lt: end_date};


        ///// For sort by field /////
        var sort = {"$sort": {}};
        sort["$sort"][sort_field] = parseInt(sort_order);


        ///// For Count number of result /////
        /////////////////////////////////////

        //// For skip number of result /////
        var skip = {};
        skip["$skip"] = page * number_of_rec;


        ///// For limitation on result /////
        var limit = {};
        limit["$limit"] = number_of_rec;

        Document.aggregate([lookup, unwind, search, filter, sort]).then((array) => { 
            var date = new Date()
            var time = date.getTime()
            var wb = new xl.Workbook();
            var ws = wb.addWorksheet('sheet1');
            var col = 1;

            ws.cell(1, col++).string(req.__('title_id'));
            ws.cell(1, col++).string(req.__('title_name'));
            ws.cell(1, col++).string(req.__('title_country'));
            ws.cell(1, col++).string(req.__('title_type'));
            ws.cell(1, col++).string(req.__('title_option'));

            array.forEach(function (data, index) {
                col = 1;
                ws.cell(index + 2, col++).number(data.unique_id);
                ws.cell(index + 2, col++).string(data.title);
                ws.cell(index + 2, col++).string(data.country_detail.countryname);

                if (data.type == 0) {
                    ws.cell(index + 2, col++).string(req.__('title_user'));
                } else if (data.type == 1) {
                    ws.cell(index + 2, col++).string(req.__('title_provider'));
                } else if (data.type == 2) {
                    ws.cell(index + 2, col++).string(req.__('title_provider_vehicle'));
                }

                if (data.option == 1) {
                    ws.cell(index + 2, col++).string(req.__('title_mandatory'));
                } else if (data.option == 0) {
                    ws.cell(index + 2, col++).string(req.__('title_optional'));
                }

                if (index == array.length - 1) {
                    wb.write('data/xlsheet/' + time + '_document.xlsx', function (err) {
                        if (err) {
                            console.error(err);
                        } else {
                            var url = req.protocol + "://" + req.get('host') + "/xlsheet/" + time + "_document.xlsx";
                            res.json(url);
                            setTimeout(function () {
                                fs.unlink('data/xlsheet/' + time + '_document.xlsx', function () {
                                });
                            }, 10000)
                        }
                    });
                }
            })
        });

    } else {
        res.redirect('/admin');
    }
};


//////////////////////////////

//////////////////// FOR ADD DOCUMENT ////////////////////////

exports.add_document_form = function (req, res) {
    Document.find({}).then(() => {
        Country.find({}).then((Country) => {
            res.render('add_document_form', {country_data: Country});
        });
    });
};


//// ADD DOCUMENT //// 
exports.add_document_detail = async function (req, res) {
    let documentCount = 1;
    let document_count = await Document.findOne({}).lean().select({ unique_id: 1 }).sort({ _id: -1 });
    if (document_count) {
        documentCount = document_count.unique_id + 1;
    }

    req.body.is_unique_code = req.body.is_unique_code || 0;
    req.body.is_expired_date = req.body.is_expired_date || 0;

    let document = new Document({
        unique_id: documentCount,
        countryid: req.body.country,
        title: (req.body.title).trim(),
        type: req.body.type,
        option: req.body.option,
        is_unique_code: req.body.is_unique_code,
        is_expired_date: req.body.is_expired_date
    });
    await document.save();

    let country_data = await Country.findOne({ _id: document.countryid });
    if (!country_data) {
        message = admin_messages.country_not_found;
        return res.redirect('/documents');
    }

    let countryname = (country_data.countryname).trim();
    if (req.body.type == 1) {
        let providers = await Provider.find({ country: countryname }).select({ _id: 1 }).lean();
        let providers_documents = [];
        providers.forEach((provider) => {
            providers_documents.push({
                provider_id: provider._id,
                document_id: document._id,
                name: document.title,
                option: document.option,
                document_picture: "",
                unique_code: "",
                expired_date: null,
                is_unique_code: document.is_unique_code,
                is_expired_date: document.is_expired_date,
                is_uploaded: 0
            });
        });
        await Provider_Document.insertMany(providers_documents);
    } else if (req.body.type == 0) {
        let users = await User.find({ country: countryname }).select({ _id: 1 }).lean();
        let users_documents = [];
        users.forEach((user) => {
            users_documents.push({
                user_id: user._id,
                document_id: document._id,
                name: document.title,
                option: document.option,
                document_picture: "",
                unique_code: "",
                expired_date: null,
                is_unique_code: document.is_unique_code,
                is_expired_date: document.is_expired_date,
                is_uploaded: 0
            });
        });
        await User_Document.insertMany(users_documents);
    }
    return res.redirect('/documents');
};

//////////////////////////////////////////////////////////////

//////////////// FOR EDIT DOCUMENT /////////////////

exports.edit_document_form = function (req, res) {
    var id = req.body.id;
    Document.findById(id).then((document) => {
        
        Country.findById(document.countryid).then((Country) => {
            
            res.render('add_document_form', {country_data: Country, detail: document});
            
        });
        
    });
};

exports.update_document_detail = function (req, res) {
    var id = req.body.id;
    if (typeof req.body.is_unique_code == 'undefined') {
        req.body.is_unique_code = 'false';
    }
    if (typeof req.body.is_expired_date == 'undefined') {
        req.body.is_expired_date = 'false';
    }
    Document.findByIdAndUpdate(id, req.body).then((document) => {
     
        if (document.type == 1) {
        }
        User_Document.updateMany({'document_id': id}, {name: req.body.title, is_expired_date: req.body.is_expired_date, is_unique_code: req.body.is_unique_code}, {multi: true}).then(() => { 

            Provider_Document.updateMany({'document_id': id}, {name: req.body.title, is_expired_date: req.body.is_expired_date, is_unique_code: req.body.is_unique_code}, {multi: true}).then(() => { 

                res.redirect('/documents');
            });
        });
        
    });
};

//////////////////////////////////////////////////

exports.find_document_by_country = function (req, res) {
    Document.findOne({ countryid: req.body.country, title: (req.body.title).trim(), type: req.body.type, _id: { $ne: req.body.id } }).then((document) => {
        if (!document) {
            res.json({ success: true });
        } else {
            res.json({ success: false, message: req.__(admin_messages.error_message_document_already_added_for_country) });
        }
    });
};