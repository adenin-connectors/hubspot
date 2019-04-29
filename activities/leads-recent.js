'use strict';
const api = require('./common/api');

module.exports = async (activity) => {
  try {
    api.initialize(activity);
    const currentUser = await api.getCurrentUser();
    if ($.isErrorResponse(activity, currentUser)) return;

    const newLeads = await api('/contacts/v1/lists/all/contacts/recent');
    if ($.isErrorResponse(activity, newLeads)) return;

    var dateRange = $.dateRange(activity, "today");
    let filteredLeads = api.filterLeadsByDateRange(newLeads.body.contacts, dateRange);

    activity.Response.Data.items = api.mapLeadsToItems(filteredLeads);
    activity.Response.Data.title = T(activity, 'Recent Leads');
    activity.Response.Data.link = `https://app.hubspot.com/contacts/${currentUser.body.portalId}/contacts/list/view/all`;
    activity.Response.Data.linkLabel = T(activity, 'All Leads');
  } catch (error) {
    $.handleError(activity, error);
  }
};