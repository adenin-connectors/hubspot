'use strict';
const api = require('./common/api');

module.exports = async function (activity) {
  try {
    api.initialize(activity);
    const currentUser = await api.getCurrentUser();
    if ($.isErrorResponse(activity, currentUser)) return;

    let allTickets = [];

    let url = `/crm-objects/v1/objects/tickets/paged?properties=subject&properties=content&properties=createdate&properties=hs_pipeline_stage&count=100`;
    let response = await api(url);
    if ($.isErrorResponse(activity, response)) return;
    allTickets.push(...response.body.objects);

    let nextPageToken = null;
    if (response.body['has-more']) {
      nextPageToken = response.body['vid-offset'];
    }

    while (nextPageToken) {
      url = `/crm-objects/v1/objects/tickets/paged?properties=subject&properties=content&properties=createdate` +
        `&properties=hs_pipeline_stage&count=100&vidOffset=${nextPageToken}`;
      response = await api(url);
      if ($.isErrorResponse(activity, response)) return;
      allTickets.push(...response.body.objects);
      nextPageToken = null;
      if (response.body['has-more']) {
        nextPageToken = response.body['vid-offset'];
      }
    }

    const dateRange = $.dateRange(activity);
    let tickets = api.filterTicketsByDateRange(allTickets, dateRange);
    tickets = api.mapTicketsToItems(tickets);

    tickets.sort((a, b) => {
      return new Date(b.date) - new Date(a.date); //descending
    });
    let dateToAssign = tickets.length > 0 ? tickets[0].date : null;
    let value = tickets.length;

    const pagination = $.pagination(activity);
    tickets = api.paginateItems(tickets, pagination);

    activity.Response.Data.items = tickets;

    if (parseInt(pagination.page) == 1) {
      activity.Response.Data.title = T(activity, 'All Tickets');
      activity.Response.Data.link = `https://app.hubspot.com/contacts/${currentUser.body.portalId}/tickets/list/view/all/`;
      activity.Response.Data.linkLabel = T(activity, 'All Tickets');
      activity.Response.Data.actionable = value > 0;
      activity.Response.Data.thumbnail = 'https://www.adenin.com/assets/images/wp-images/logo/hubspot.svg';

      if (value > 0) {
        activity.Response.Data.value = value;
        activity.Response.Data.date = dateToAssign;
        activity.Response.Data.color = 'blue';
        activity.Response.Data.description = value > 1 ? T(activity, "You have {0} tickets.", value)
          : T(activity, "You have 1 ticket.");
        activity.Response.Data.briefing = activity.Response.Data.description + ' The latest is <b>' + tickets[0].title + '</b>';
      } else {
        activity.Response.Data.description = T(activity, `You have no tickets.`);
      }
    }
  } catch (error) {
    $.handleError(activity, error);
  }
};