'use strict';
const api = require('./common/api');

module.exports = async (activity) => {
  try {
    api.initialize(activity);

    const promises = [];
    promises.push(api.getCurrentUser());
    promises.push(api.getOwner());
    const responses = await Promise.all(promises);

    for (let i = 0; i < responses.length; i++) {
      if ($.isErrorResponse(activity, responses[i])) return;
    }

    const currentUser = responses[0];
    const currentOwner = responses[1];

    if (currentOwner.body.length < 1) {
      //mail that we provided does not match any account on hubspot
      return;
    }
    const currentOwnerId = currentOwner.body[0].ownerId;

    const response = await api('/contacts/v1/lists/all/contacts/recent?property=hubspot_owner_id&property=firstname&property=lastname&property=lastmodifieddate');
    if ($.isErrorResponse(activity, response)) return;

    let leads = api.filterMyLeads(currentOwnerId, response.body.contacts)
    const dateRange = $.dateRange(activity, "today");
    leads = api.filterLeadsByDateRange(leads, dateRange);

    activity.Response.Data.items = api.mapLeadsToItems(leads);
    activity.Response.Data.title = T(activity, 'Recent Leads');
    activity.Response.Data.link = `https://app.hubspot.com/contacts/${currentUser.body.portalId}/contacts/list/view/all`;
    activity.Response.Data.linkLabel = T(activity, 'All Leads');
  } catch (error) {
    $.handleError(activity, error);
  }
};