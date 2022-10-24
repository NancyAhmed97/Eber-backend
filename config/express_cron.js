var config = require('./config');
var express = require('express');
var bodyParser = require('body-parser');
var multer = require('multer');
var cons = require('consolidate');
var session = require("express-session");
var moment = require('moment');
var twilio = require('twilio');
var nodemailer = require('nodemailer');
var dotenv = require('dotenv');
var path = require("path");
var compression = require('compression');
var async = require("async");
var cookieParser = require('cookie-parser')
var app = express();
var morgan = require('morgan');

function parallel(middlewares) {
    return function (req, res, next) {
        async.each(middlewares, function (mw, cb) {
            mw(req, res, cb);
        }, next);
    };
}

module.exports = function (prometheusMiddleware) {

    if (process.env.NODE_ENV == 'development') {
        ///// FOR SESSION SET /////
        app.use(session({resave: true, saveUninitialized: true, secret: 'SOMERANDOMSECRETHERE', maxAge: '1h'}));

    } else if (process.env.NODE_ENV == 'production') {
        var RedisStore = require('connect-redis')(session);
        var { createClient } = require("redis")
        var client = createClient({ legacyMode: true })
        client.connect().catch(console.error)

        ///// FOR SESSION SET /////
        app.use(session({resave: true, saveUninitialized: true, secret: 'SOMERANDOMSECRETHERE', maxAge: '1h', store: new RedisStore({host: 'localhost', port: 6379, client: client, ttl: 1440})}));
    }

    app.use(parallel([
        express.static('./public', {maxAge: '1y'}),
        express.static('./data', {maxAge: '1d'}),
        compression(),
        bodyParser.json({limit: '50mb'}),
        bodyParser.urlencoded({limit: "50mb",extended: true, parameterLimit: 1000000}),
        multer({dest: __dirname + '/data/'}).any()
    ]));

    // app.use(morgan('tiny'));
    app.use(cookieParser());
    // app.use(i18n.init);
    ///////////////////////////

    ///// FOR E-mail ANd SMS purpose //////
    //dotenv.config({path: 'installation_settings_config.env', silent: true});
    // dotenv.config({path: 'admin_panel_string.env', silent: true});
    // dotenv.config({path: 'tooltip.env', silent: true});
    //dotenv.config({path: 'settings.env', silent: true});
    // dotenv.config({path: 'partner_panel_string.env', silent: true});
    // dotenv.config({path: 'constants.env', silent: true});
    // dotenv.config({path: 'pushMessages.env', silent: true});
    // dotenv.config({path: 'errorMessages.env', silent: true});
    // dotenv.config({path: 'successMessages.env', silent: true});
    // dotenv.config({path: 'admin_panel_message.env', silent: true});
    //////////////////////////////
    
    
    app.set('views', ['./app/views', './app/views/new_design_user','./app/views/user', './app/views/provider','./app/views/partner','./app/views/new_design_dispatcher','./app/views/dispatcher', './app/views/corporate']);///This line defines where our HTML files are placed so that Server can locate and render them ! Easy enough.
    app.engine('html', require('ejs').renderFile, cons.swig);
    app.set('view engine', 'html');//This line set the view engine or simply presentation factor to EJS which is responsible for HTML rendering.

    // Prometheus metrics
    // prometheusMiddleware(app)

    require('../app/routes/cron')(app);
    return app;
};
