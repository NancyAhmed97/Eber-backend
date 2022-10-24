var admin = require('../admin_controllers/email_detail');

module.exports = function (app) {
    app.route('/email').get(admin.email);
    app.route('/get_email_data').post(admin.get_email_data);
    app.route('/update_email_detail').post(admin.update_email_detail);
    
}