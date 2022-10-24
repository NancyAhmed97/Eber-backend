var admin = require('../admin_controllers/dashboard');

module.exports = function (app) {

    app.route('/dashboard').get(admin.index);
    app.route('/monthly_registration_chart').post(admin.monthly_registration_chart);
    app.route('/app_version_chart').post(admin.app_version_chart);

};