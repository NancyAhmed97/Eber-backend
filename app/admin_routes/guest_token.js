var guest_token = require('../admin_controllers/guest_token');
module.exports = function (app) {
    app.route('/guest_token').get(guest_token.guest_token_list);
    app.route('/guest_token').post(guest_token.guest_token_list);
    app.route('/generate_guest_token_excel').post(guest_token.generate_guest_token_excel);
    app.route('/guest_token_edit').post(guest_token.edit);
    app.route('/guest_token_update').post(guest_token.update);
    app.route('/add_guest_token_form').post(guest_token.add_guest_token_form);
    app.route('/add_guest_token').post(guest_token.add_guest_token);
    app.route('/guest_token_toggle_act').post(guest_token.act);
};