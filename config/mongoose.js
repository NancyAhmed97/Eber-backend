var config = require('./config'),
        mongoose = require('mongoose');
mongoose.Promise = global.Promise;
var autoIncrement = require('mongoose-auto-increment');


module.exports = function () {
    var db;
    if(config.db){
        db = mongoose.connect(config.db,{
            useUnifiedTopology: true,
            useNewUrlParser: true
        });
        
    } else {
        let keyconfig = {
            // "username": "ubuntu",
            "username": "root", // vultr
            // "host": "13.235.13.124", // eber staging
            // "host": "13.126.218.155", // eber dev
            // "host": "139.180.140.243", // vultr dev
            // "host": "13.126.148.249", // live
            "host": "45.76.155.149 ", // vultr live
            "port": 22,
            "dstHost": "127.0.0.1",
            "dstPort": 27017,
            "localHost": "127.0.0.1",
            "localPort": 27000,
            "keepAlive":true,
            // "keyPath": "/home/elluminati-sagar/Desktop/Sagar/Work/000_Credentials/Eber Credentails/Eber Staging/EBER_DEMO_KEYS/EBER_DEMO.ppk", // eber staging
            // "keyPath": "/home/elluminati-sagar/Desktop/Sagar/Work/000_Credentials/Edelivery Developer Credentials/DEVELOPER_SERVER.ppk", // eber dev
            // "keyPath": "/home/elluminati-sagar/Desktop/Sagar/Work/000_Credentials/Vultr/EBER/DEVELOPER/eber_dev.ppk", // vultr dev
            // "keyPath": "/home/elluminati-sagar/Desktop/Sagar/Work/000_Credentials/Eber Credentails/EBER_LIVE_APP_PRIVATE.ppk", // eber live
        }
        const tunnel = require('tunnel-ssh');
        const fs = require('fs');
        // var server = tunnel({ ...keyconfig, privateKey: fs.readFileSync(keyconfig.keyPath) }, function (error, server) {
        var server = tunnel({ ...keyconfig }, function (error, server) {
            // db = mongoose.connect('mongodb://localhost:27000/staging', {}) //eber staging
            // db = mongoose.connect('mongodb://localhost:27000/EBER_LOCAL', {}) // eber dev
            db = mongoose.connect('mongodb://localhost:27000/EBER', {}) // eber live 
        });

        server.on('error', function(err){
            console.error('Something bad happened:', err);
        });
    }
    autoIncrement.initialize(mongoose.connection);

    require('../app/models/user');
    require('../app/models/provider');
    require('../app/models/country');
    require('../app/models/city');
    require('../app/models/type');
    require('../app/models/citytype');
    require('../app/models/trip');
    require('../app/models/card');
    require('../app/models/trip_service');
    require('../app/models/trip_history');
    require('../app/models/reviews');
    require('../app/models/trip_location');
    require('../app/models/promo_code');
    require('../app/models/user_promo_used');
    require('../app/models/documents');
    require('../app/models/provider_document');
    require('../app/models/provider_vehicle_document');
    require('../app/models/user_document');
    require('../app/models/admin');
    require('../app/models/admin_settings');
    require('../app/models/information');
    require('../app/models/payment_transaction');
    //require('../app/models/provider_earning');
    require('../app/models/sms_detail');
    require('../app/models/email_detail');
    require('../app/models/emergency_contact_detail');
    require('../app/models/provider_daily_earning');
    require('../app/models/provider_weekly_earning');
    //require('../app/models/provider_trip_detail');
    require('../app/models/partner_weekly_earning');
    require('../app/models/partner');
    require('../app/models/dispatcher');
    require('../app/models/bank_detail');
    require('../app/models/hotel');
    require('../app/models/citytocity');
    require('../app/models/airport');
    require('../app/models/airporttocity');
    require('../app/models/cityzone');
    require('../app/models/redzone_area');
    require('../app/models/zonevalue');
    require('../app/models/wallet_history');
    require('../app/models/provider_daily_analytic');
    require('../app/models/languages');
    require('../app/models/corporate');

    // 28 May //
    
    require('../app/models/partner_vehicle_document');
    require('../app/models/transfer_history');
    require('../app/models/guest_token');

    return db;
};