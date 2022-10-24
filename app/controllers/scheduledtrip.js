var utils = require('./utils');
var Trip = require('mongoose').model('Trip');
var User = require('mongoose').model('User');
var utils = require('./utils');

/////////////GET FUTURE TRIP///////////
exports.getfuturetrip = function (req, res) {
    User.findOne({_id: req.body.user_id}, function (err, user) {
        if (user)
        {
            if (req.body.token != null && user.token != req.body.token) {
                res.json({success: false, error_code: error_message.ERROR_CODE_INVALID_TOKEN});
            } else
            {
                Trip.find({user_id: req.body.user_id, is_schedule_trip: true, is_trip_cancelled: 0, is_trip_completed: 0, is_trip_end: 0, provider_id: null, current_provider: null}, function (err, scheduledtrip) {

                    if (err || scheduledtrip.length === 0) {
                        res.json({success: false, error_code: error_message.ERROR_CODE_NO_SCHEDULED_TRIP_FOUND});

                    } else {
                        res.json({success: true, message: success_messages.MESSAGE_CODE_GET_YOUR_FUTURE_TRIP_SUCCESSFULLY, scheduledtrip: scheduledtrip});
                    }
                });
            }
        } else
        {
            res.json({success: false, error_code: error_message.ERROR_CODE_USER_DETAIL_NOT_FOUND});

        }
    });
};


//////////// cancelScheduledtrip////////////

exports.cancelScheduledtrip = function (req, res) {

    utils.check_request_params(req.body, [], function (response) {
        if (response.success) {
            ScheduledTrip.findOneAndUpdate({_id: req.body.scheduledtrip_id}, req.body, {new: true}, function (err, scheduledtrip) {

                if (scheduledtrip) {
                    if (scheduledtrip.is_schedule_trip_cancelled == 0 && scheduledtrip.is_trip_created == 0) {
                        scheduledtrip.is_schedule_trip_cancelled = 1;
                        scheduledtrip.save();
                        res.json({
                            success: true,
                            message: success_messages.MESSAGE_CODE_YOUR_FUTURE_TRIP_CANCELLED_SUCCESSFULLY,
                            is_schedule_trip_cancelled: scheduledtrip.is_schedule_trip_cancelled
                        });
                    } else {
                        res.json({
                            success: false,
                            error_code: error_message.ERROR_CODE_MIS_MATCH_SCHEDULETRIP_ID
                        });
                    }
                } else {
                    res.json({
                        success: false,
                        error_code: error_message.ERROR_CODE_MIS_MATCH_SCHEDULETRIP_ID
                    });
                }
            });
        } else {
            res.json({
                success: false,
                error_code: response.error_code,
                error_description: response.error_description
            });
        }
    });
};


