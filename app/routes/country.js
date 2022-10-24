var country = require('../controllers/country');
module.exports = function (app) {
    app.route('/country_list').get(country.countries_list);    
    app.route('/country_list').post(country.countries_list);
    app.route('/get_country_city_list').post(country.get_country_city_list);
};