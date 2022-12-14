var trip = require('../../app/controllers/trip'); // include trip controller ////

module.exports = function (app) {
    
    app.route('/createtrip').post(trip.create);
    app.route('/provider_createtrip').post(trip.provider_create);
    app.route('/send_request').post(trip.send_request_from_dispatcher);
    
    app.route('/gettrips').post(trip.provider_get_trips);
    app.route('/usergettripstatus').post(trip.user_get_trip_status);
    app.route('/respondstrip').post(trip.responds_trip);
    app.route('/canceltrip').post(trip.trip_cancel_by_user);
    app.route('/tripcancelbyprovider').post(trip.trip_cancel_by_provider);
    app.route('/tripcancelbyadmin').post(trip.trip_cancel_by_admin);
    app.route('/scheduledtripcancelbyadmin').post(trip.scheduled_trip_cancel_by_admin);
    app.route('/settripstatus').post(trip.provider_set_trip_status);
    app.route('/completetrip').post(trip.provider_complete_trip);
    


    app.route('/pay_payment').post(trip.pay_payment);
    app.route('/pay_tip_payment').post(trip.pay_tip_payment);
    app.route('/pay_stripe_intent_payment').post(trip.pay_stripe_intent_payment);
    app.route('/fail_stripe_intent_payment').post(trip.fail_stripe_intent_payment);
    app.route('/userhistory').post(trip.user_history);
    app.route('/usertripdetail').post(trip.user_tripdetail);
    app.route('/providertripdetail').post(trip.provider_tripdetail);
    app.route('/providergettripstatus').post(trip.providergettripstatus);

    app.route('/providerhistory').post(trip.provider_history);
    app.route('/usergiverating').post(trip.user_rating);
    app.route('/providergiverating').post(trip.provider_rating);
    app.route('/getuserinvoice').post(trip.user_invoice);

    app.route('/getproviderinvoice').post(trip.provider_invoice);
    app.route('/usersetdestination').post(trip.user_setdestination);
    app.route('/getgooglemappath').post(trip.getgooglemappath);
    app.route('/setgooglemappath').post(trip.setgooglemappath);

    app.route('/check_destination').post(trip.check_destination);

    app.route('/user_submit_invoice').post(trip.user_submit_invoice);
    app.route('/provider_submit_invoice').post(trip.provider_submit_invoice);
    
    app.route('/getnearbyprovider').post(trip.get_near_by_provider);
    app.route('/twilio_voice_call').post(trip.twilio_voice_call);

    app.route('/refund_amount_in_wallet').post(trip.refund_amount_in_wallet);
    app.route('/refund_amount_in_card').post(trip.refund_amount_in_card);
    
    app.route('/pay_by_other_payment_mode').post(trip.pay_by_other_payment_mode);

};



