'use strict';

const api = require('./common/api');

module.exports = async function (activity) {
  try {
    api.initialize(activity);

    let url = '/crm-objects/v1/objects/tickets/paged?properties=subject&properties=content&properties=createdate&properties=hs_pipeline_stage&properties=status&count=100';

    const promises = [];

    promises.push(api.getCurrentUser());
    promises.push(api(url));

    const initialResponses = await Promise.all(promises);

    for (let i = 0; i < initialResponses.length; i++) {
      if ($.isErrorResponse(activity, initialResponses[i])) return;
    }

    const currentUser = initialResponses[0];
    let ticketsResponse = initialResponses[1];

    const allTickets = [];

    allTickets.push(...ticketsResponse.body.objects);

    let offset;

    if (ticketsResponse.body.hasMore) offset = ticketsResponse.body.offset;

    while (offset) {
      url = `/crm-objects/v1/objects/tickets/paged?properties=subject&properties=content&properties=createdate&properties=status&count=100&offset=${offset}`;

      ticketsResponse = await api(url);

      if ($.isErrorResponse(activity, ticketsResponse)) return;

      allTickets.push(...ticketsResponse.body.objects);

      offset = null;

      if (ticketsResponse.body.hasMore) offset = ticketsResponse.body.offset;
    }

    const dateRange = $.dateRange(activity);

    let tickets = api.filterOpenTickets(allTickets);

    tickets = api.filterTicketsByDateRange(tickets, dateRange);
    tickets = api.mapTicketsToItems(tickets);

    tickets.sort($.compare.dateDescending);

    const value = tickets.length;
    const pagination = $.pagination(activity);

    tickets = api.paginateItems(tickets, pagination);

    activity.Response.Data.items = tickets;

    if (parseInt(pagination.page) === 1) {
      activity.Response.Data.title = T(activity, 'Open Tickets');
      activity.Response.Data.link = `https://app.hubspot.com/contacts/${currentUser.body.portalId}/tickets/list/view/all/`;
      activity.Response.Data.linkLabel = T(activity, 'All Tickets');
      activity.Response.Data.actionable = value > 0;
      activity.Response.Data.thumbnail = 'https://www.adenin.com/assets/images/wp-images/logo/hubspot.svg';

      if (value > 0) {
        activity.Response.Data.value = value;
        activity.Response.Data.date = tickets[0].date;
        activity.Response.Data.description = value > 1 ? T(activity, 'You have {0} open tickets.', value) : T(activity, 'You have 1 open ticket.');

        // we use default briefing message for now, because tickets API alone is not returning any company or user info
        activity.Response.Data.briefing = activity.Response.Data.description + ` The latest is <b>${tickets[0].title}</b>`;
      } else {
        activity.Response.Data.description = T(activity, 'You have no open tickets.');
      }
    }
  } catch (error) {
    $.handleError(activity, error);
  }
};
