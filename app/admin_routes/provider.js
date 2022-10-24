var providers = require('../admin_controllers/provider'); // include Provider 




module.exports = function (app) {

    app.route('/provider_referral_history').get(providers.referral_history);
    app.route('/provider_referral_history').post(providers.referral_history);
    
    app.route('/provider_referral_report').get(providers.referral_report);
    app.route('/provider_referral_report').post(providers.referral_report);

    app.route('/generate_provider_excel').post(providers.generate_provider_excel);
  
    app.route('/online_providers').get(providers.list);
    app.route('/approved_providers').get(providers.list);
    app.route('/pending_for_approvel').get(providers.list);
    
    app.route('/generate_provider_history_excel').post(providers.generate_provider_history_excel);
        app.route('/delete_vehicle_detail').post(providers.delete_vehicle_detail);
    app.route('/add_provider_vehicle').post(providers.add_provider_vehicle);
    app.route('/add_provider_vehicle_data').post(providers.add_provider_vehicle_data);
    
    app.route('/online_providers').post(providers.list);
    app.route('/approved_providers').post(providers.list);
    app.route('/pending_for_approvel').post(providers.list);
    

    ///// provider detail update in admin panel /////
    app.route('/profile_detail_edit').post(providers.edit);
    app.route('/providerupdate').post(providers.update);
    /////////////////////////////////////////////////

    ///// provider approved/disapproved //////
    app.route('/profile_is_approved').post(providers.profile_is_approved);
    app.route('/available_type').post(providers.available_type);
    app.route('/unfreeze_provider').post(providers.unfreeze_provider);

     ///// History /////
    app.route('/history_pr').post(providers.history);
    app.route('/provider_vehicle_list').get(providers.provider_vehicle_list);
    app.route('/provider_vehicle_list').post(providers.provider_vehicle_list);
    app.route('/edit_vehicle_detail').post(providers.edit_vehicle_detail);
    app.route('/update_vehicle_detail').post(providers.update_vehicle_detail);
    app.route('/vehicle_document_list').post(providers.vehicle_document_list);

    app.route('/provider_vehicle_documents_edit').post(providers.provider_vehicle_documents_edit);
    app.route('/provider_vehicle_documents_update').post(providers.provider_vehicle_documents_update);
    
    /////////////////////////////////////////

    ///// Documents /////
    app.route('/proivder_documents').post(providers.documents);
    app.route('/provider_documents_edit').post(providers.provider_documents_edit);
    app.route('/provider_documents_delete').post(providers.provider_documents_delete);
    app.route('/provider_documents_update').post(providers.provider_documents_update);
    
    app.route('/admin_add_provider_wallet').post(providers.admin_add_provider_wallet);
    app.route('/update_profile_approve_status').post(providers.update_profile_approve_status);
    
    app.route('/update_provider_vehicle_type').post(providers.update_provider_vehicle_type);
    /////////////////////////////////////////
};