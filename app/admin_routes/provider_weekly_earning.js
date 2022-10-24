var provider_weekly_earning = require('../admin_controllers/provider_weekly_earning');
module.exports = function (app) {
    app.route('/provider_weekly_earning').get(provider_weekly_earning.provider_weekly_earning);
    app.route('/provider_weekly_earning').post(provider_weekly_earning.provider_weekly_earning);
    app.route('/provider_weekly_earning_export_excel').post(provider_weekly_earning.provider_weekly_earning_export_excel);
}