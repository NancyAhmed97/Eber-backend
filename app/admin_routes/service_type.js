var admin = require('../admin_controllers/service_type');

module.exports = function(app){

	app.route('/service_types').get(admin.service_types);
	app.route('/service_types').post(admin.service_types);
	app.route('/add_service_form').post(admin.add_service_form);
	app.route('/add_service_detail').post(admin.add_service_detail);
	app.route('/edit_service_form').post(admin.edit_service_form);
	app.route('/update_service_detail').post(admin.update_service_detail);
	app.route('/check_type_available').post(admin.check_type_available);
	app.route('/fetch_servicetype_list').post(admin.fetch_servicetype_list);
	app.route('/type_list').post(admin.type_list);
	app.route('/check_type_priority_available').post(admin.check_type_priority_available);
}