'use strict';
const api = require('./common/api');

module.exports = async (activity) => {
  try {
    api.initialize(activity);
    const currentUser = await api.getCurrentUser();
    if ($.isErrorResponse(activity, currentUser)) return;

    const tickets = await api('/crm-objects/v1/objects/tickets/paged?properties=subject&properties=content&properties=createdate&properties=hs_pipeline_stage');
    if ($.isErrorResponse(activity, tickets)) return;

    const dateRange = $.dateRange(activity, "today");
    const recentTickets = api.filterTicketsByDateRange(tickets.body.objects, dateRange);

    activity.Response.Data.items = api.mapTicketsToItems(recentTickets);
    activity.Response.Data.title = T(activity, 'Recent Tickets');
    activity.Response.Data.link = `https://app.hubspot.com/contacts/${currentUser.body.portalId}/tickets/list/view/all/`;
    activity.Response.Data.linkLabel = T(activity, 'All Tickets');
  } catch (error) {
    $.handleError(activity, error);
  }
};