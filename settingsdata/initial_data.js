process.env.NODE_ENV = process.env.NODE_ENV || 'development';
var mongoose = require('mongoose');
mongoose = require('../config/mongoose')
db = mongoose()

var Settings = require('mongoose').model('Settings');
var settingdata = require('./settings.json')

Settings.findOne().then(setting => {
    if (!setting) {
        var settings = new Settings(settingdata)
        settings.save()
    }
})

var SmsDetail = require('mongoose').model('sms_detail');
var smsdata = require('./sms.json')

SmsDetail.findOne().then(smsdetail => {
    if (!smsdetail) {
        SmsDetail.create(smsdata, function (err, jellybean, snickers) { })
    }
})

var Email = require('mongoose').model('email_detail');
var emaildata = require('./email.json')

Email.findOne().then(emaildetail => {
    if (!emaildetail) {
        Email.create(emaildata, function (err, jellybean, snickers) { })
    }
})