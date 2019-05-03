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

    const tickets = await api('/crm-objects/v1/objects/tickets/paged?properties=subject&properties=content&properties=createdate&properties=hs_pipeline_stage&properties=hubspot_owner_id');
    if ($.isErrorResponse(activity, tickets)) return;

    const dateRange = $.dateRange(activity, "today");
    let recentTickets = api.filterTicketsByDateRange(tickets.body.objects, dateRange);
    recentTickets = api.filterMyTickets(currentOwnerId,recentTickets);

    activity.Response.Data.items = api.mapTicketsToItems(recentTickets);
    activity.Response.Data.title = T(activity, 'Recent Tickets');
    activity.Response.Data.link = `https://app.hubspot.com/contacts/${currentUser.body.portalId}/tickets/list/view/all/`;
    activity.Response.Data.linkLabel = T(activity, 'All Tickets');
  } catch (error) {
    $.handleError(activity, error);
  }
};