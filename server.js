setting_detail = {};
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
if (process.env.NODE_ENV == 'production') {
  var cluster = require('cluster');
  if (cluster.isMaster) {
    // Count the machine's CPUs
    var cpuCount = require('os').cpus().length;

    // Create a worker for each CPU
    for (var i = 0; i < cpuCount; i += 1) {
      cluster.fork();
    }
    // Code to run if we're in a worker process
  } else {
    init();
  }
} else {
  init();
}



function init() {
    var port = 5000;
    var config = require('./config/config'),
    mongoose = require('./config/mongoose'),
    express = require('./config/express')
    db = mongoose(),
    app = express();

    config_json = require('./admin_panel_string.json');
    admin_messages = require('./admin_panel_message.json');
    constant_json = require('./constants.json');
    push_messages = require('./pushMessages.json');
    error_message = require('./errorMessages.json');
    success_messages = require('./successMessages.json');


    // require('./config/socket');

    const http = require('http');
    const socketIO = require('socket.io');
    const server = http.Server(app);

    server.listen(port + (process.env.NODE_APP_INSTANCE ? parseInt(process.env.NODE_APP_INSTANCE) : 0), async () => {
  
      const io = socketIO(server);
      socket_object = io;
      
      const { createClient } = require("redis");
      const { createAdapter } = require("@socket.io/redis-adapter");
      const pubClient = createClient({ url: "redis://localhost:6379" });
      pubClient.on('error', (err) => console.log('Redis Client Error', err));
      await pubClient.connect();

      const subClient = pubClient.duplicate();

      var Providers = require('./app/controllers/providers');
      io.adapter(createAdapter(pubClient, subClient));

      io.on('connection', socket => {
        socket.on('update_location', function (data, ackFn) {
          var trip_id ="'"+data.trip_id+"'";
          var provider_id ="'"+data.provider_id+"'";
          Providers.update_location_socket({body: data}, function(response){
            if(typeof ackFn == "function"){
              ackFn(response);
            }
            if(data.trip_id && response.success){
              io.emit(trip_id , {is_trip_updated: false, trip_id: trip_id, "bearing": data.bearing, "location": response.providerLocation, "total_time": response.total_time, "total_distance": response.total_distance});
            } else {
              io.emit(provider_id , {"bearing": data.bearing, "location": response.providerLocation, provider_id: data.provider_id});
            }
          });
        });
      });
    });

    app.post('/check_language', function (req, res) {
      res.json({success:true});        
    });


    app.post('/change_language', function (req, res) {
      require('./app/controllers/constant');

      var cookieOptions = {
       httpOnly: true,
        expires:new Date(new Date().getTime()+86409000),
        maxAge:86409000
      }
      res.cookie('language', req.body.language, cookieOptions);
      res.json({ success: true });
    });

    var Settings = require('mongoose').model('Settings');
    Settings.findOne({}, function (error, setting) {
        setting_detail = setting
        try {
          var admin = require("firebase-admin");
          var serviceAccount = {
            "type": setting_detail.type,
            "project_id": setting_detail.firebase_projectId,
            "private_key_id": setting_detail.private_key_id,
            "private_key": setting_detail.private_key,
            "client_email": setting_detail.client_email,
            "client_id": setting_detail.client_id,
            "auth_uri": setting_detail.auth_uri,
            "token_uri": setting_detail.token_uri,
            "auth_provider_x509_cert_url": setting_detail.auth_provider_x509_cert_url,
            "client_x509_cert_url": setting_detail.client_x509_cert_url
          };

          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: setting_detail.firebase_databaseURL
          });

          fireUser = admin.auth();
          fireDB = admin.database(); 
        } catch (error) {
          console.log("firebase security configs remainings")
        }
        
        console.log('Magic happens on port ' + port);
    });

    module.exports = app;
}



