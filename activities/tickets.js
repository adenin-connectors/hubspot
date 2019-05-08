'use strict';
const api = require('./common/api');

module.exports = async function (activity) {
  try {
    api.initialize(activity);
    const currentUser = await api.getCurrentUser();
    if ($.isErrorResponse(activity, currentUser)) return;

    const pagination = $.pagination(activity);
    let url = `/crm-objects/v1/objects/tickets/paged?properties=subject&properties=content&properties=createdate&properties=hs_pipeline_stage`;
    if (pagination.nextpage) {
      url += `&offset=${pagination.nextpage}`;
    }
    const response = await api(url);
    if ($.isErrorResponse(activity, response)) return;

    let tickets = api.filterOpenTickets(response.body.objects);
    const dateRange = $.dateRange(activity, "today");
    tickets = api.filterTicketsByDateRange(tickets, dateRange);

    activity.Response.Data.items = api.mapTicketsToItems(tickets);
    let value = activity.Response.Data.items.items.length;
    activity.Response.Data.title = T(activity, 'Open Tickets');
    activity.Response.Data.link = `https://app.hubspot.com/contacts/${currentUser.body.portalId}/tickets/list/view/all/`;
    activity.Response.Data.linkLabel = T(activity, 'All Tickets');
    activity.Response.Data.actionable = value > 0;

    if (value > 0) {
      activity.Response.Data.value = value;
      activity.Response.Data.color = 'blue';
      activity.Response.Data.description = value > 1 ? T(activity, "You have {0} tickets.", value)
        : T(activity, "You have 1 ticket.");
    } else {
      activity.Response.Data.description = T(activity, `You have no tickets.`);
    }

    if (response.body.hasMore) {
      activity.Response.Data._nextpage = response.body.offset;
    }
  } catch (error) {
    $.handleError(activity, error);
  }
};