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
    var port = 8000;
    var config = require('./config/config'),
    mongoose = require('./config/mongoose'),
    // prometheus = require('./config/prometheus'),
    express = require('./config/express_cron')
    db = mongoose(),
    app = express();
    // app.listen(port);

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
      
      io.adapter(createAdapter(pubClient, subClient));

      io.on('connection', socket => {
      });
    });

    require('./app/controllers/constant');
    // app.use('/metrics', prometheus.metricsHandler)

    app.get('*', function (req, res) {
      res.render('errorPage');
    });

    // app.use(prometheus.errorsHandler)

    var Settings = require('mongoose').model('Settings');
    Settings.findOne({}, function (error, setting) {
        setting_detail = setting
        console.log('Magic happens on port ' + port);
    });

    module.exports = app;
}



