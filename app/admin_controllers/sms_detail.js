var sms_detail = require('mongoose').model('sms_detail');

exports.sms = function (req, res) {

    if (typeof req.session.userid != 'undefined') {

        sms_detail.find({}).then((sms_data) => { 
            res.render('sms', {sms_data: sms_data});
            delete message;
        });
    } else {
        res.redirect('/admin');
    }
}

exports.get_sms_data = function (req, res) {

    if (typeof req.session.userid != 'undefined') {
        sms_detail.findById(req.body.id).then((sms_data) => { 
            res.json(sms_data);
        });
    } else {
        res.redirect('/admin');
    }
}

exports.update_sms_detail = function (req, res) {

    if (typeof req.session.userid != 'undefined') {
        delete req.body.smsUniqueTitle;

        sms_detail.findByIdAndUpdate(req.body.id, req.body).then(() => { 
            message = "Sms Data Update Successfully";
            res.redirect('/sms');
        });
    } else {
        res.redirect('/admin');
    }
}
