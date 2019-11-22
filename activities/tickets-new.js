'use strict';

const api = require('./common/api');

module.exports = async function (activity) {
  try {
    api.initialize(activity);

    let url = '/crm-objects/v1/objects/tickets/paged?properties=subject&properties=content&properties=createdate&properties=hs_pipeline_stage&count=100';

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
      url = `/crm-objects/v1/objects/tickets/paged?properties=subject&properties=content&properties=createdate&properties=hs_pipeline_stage&count=100&offset=${offset}`;

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

    let count = 0;
    let readDate = (new Date(new Date().setDate(new Date().getDate() - 30))).toISOString(); // default read date 30 days in the past

    if (activity.Request.Query.readDate) readDate = activity.Request.Query.readDate;

    for (let i = 0; i < tickets.length; i++) {
      if (tickets[i].date > readDate) count++;
    }

    const pagination = $.pagination(activity);

    tickets = api.paginateItems(tickets, pagination);

    activity.Response.Data.items = tickets;

    if (parseInt(pagination.page) === 1) {
      activity.Response.Data.title = T(activity, 'New Tickets');
      activity.Response.Data.link = `https://app.hubspot.com/contacts/${currentUser.body.portalId}/tickets/list/view/all/`;
      activity.Response.Data.linkLabel = T(activity, 'All Tickets');
      activity.Response.Data.actionable = count > 0;
      activity.Response.Data.thumbnail = 'https://www.adenin.com/assets/images/wp-images/logo/hubspot.svg';

      if (count > 0) {
        activity.Response.Data.value = count;
        activity.Response.Data.date = tickets[0].date;
        activity.Response.Data.description = count > 1 ? T(activity, 'You have {0} new tickets.', count) : T(activity, 'You have 1 new ticket.');
        activity.Response.Data.briefing = activity.Response.Data.description + ' The latest is <b>' + tickets[0].title + '</b>';
      } else {
        activity.Response.Data.description = T(activity, 'You have no new tickets.');
      }
    }
  } catch (error) {
    $.handleError(activity, error);
  }
};
