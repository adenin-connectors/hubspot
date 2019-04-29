'use strict';
const api = require('./common/api');

module.exports = async function (activity) {
  try {
    api.initialize(activity);

    const messagePromises = [];
    messagePromises.push(api.getCurrentUser());
    messagePromises.push(api.getOwner());
    const messagesResponses = await Promise.all(messagePromises);

    for (let i = 0; i < messagesResponses.length; i++) {
      if ($.isErrorResponse(activity, messagesResponses[i])) return;
    }

    const currentUser = messagesResponses[0];
    const currentOwner = messagesResponses[1];

    if (currentOwner.body.length < 1) {
      //mail that we provided does not match any account on hubspot
      return;
    }
    const currentOwnerId = currentOwner.body[0].ownerId;

    const pagination = $.pagination(activity);
    let url = `/crm-objects/v1/objects/tickets/paged?properties=subject&properties=content&properties=createdate&properties=hs_pipeline_stage&properties=hubspot_owner_id`;
    if (pagination.nextpage) {
      url += `&offset=${pagination.nextpage}`;
    }
    const response = await api(url);
    if ($.isErrorResponse(activity, response)) return;

    let tickets = api.filterOpenTickets(response.body.objects);
    tickets = api.filterMyTickets(currentOwnerId, tickets);

    activity.Response.Data.items = api.mapTicketsToItems(tickets);
    activity.Response.Data.title = T(activity, 'Open Tickets');
    activity.Response.Data.link = `https://app.hubspot.com/contacts/${currentUser.body.portalId}/tickets/list/view/all/`;
    activity.Response.Data.linkLabel = T(activity, 'All Tickets');

    if (response.body.hasMore) {
      activity.Response.Data._nextpage = response.body.offset;
    }
  } catch (error) {
    $.handleError(activity, error);
  }
};