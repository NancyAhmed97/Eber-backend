var admin = require('../admin_controllers/review');

module.exports = function (app) {
    app.route('/reviews').get(admin.review);
    app.route('/reviews').post(admin.review);

    app.route('/generate_review_excel').post(admin.generate_review_excel);
    app.route('/review_detail').post(admin.review_detail);
    app.route('/cancelation_reasons').get(admin.cancellation_reason);
    app.route('/cancelation_reasons').post(admin.cancellation_reason);
    
    app.route('/generate_cancelation_reason_excel').post(admin.generate_cancelation_reason_excel);
};