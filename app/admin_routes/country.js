var admin = require('../admin_controllers/country');

module.exports = function (app) {

    app.route('/country').get(admin.country_type);
    app.route('/country').post(admin.country_type);
    app.route('/add_country_form').post(admin.add_country_form);
    app.route('/add_country_detail').post(admin.add_country_detail);
    app.route('/edit_country_form').post(admin.edit_country_form);
    app.route('/update_country_detail').post(admin.update_country_detail);
    app.route('/check_country_available').post(admin.check_country_available);
    app.route('/fetch_country_detail').post(admin.fetch_country_detail);
    app.route('/fetch_added_country_detail').post(admin.fetch_added_country_detail);
    
    app.route('/get_country_list').get(admin.get_country_list);

    app.route('/getcountryphonelength').post(admin.getcountryphonelength);
    app.route('/check_country_exists').post(admin.check_country_exists);
    app.route('/get_country_timezone').post(admin.get_country_timezone);
    app.route('/check_city').post(admin.check_city);
    app.route('/check_service_type').post(admin.check_service_type);


};