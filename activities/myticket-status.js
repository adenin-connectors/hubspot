'use strict';
const api = require('./common/api');

module.exports = async (activity) => {
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

    const tickets = await api('/crm-objects/v1/objects/tickets/paged?properties=subject&properties=content&properties=hs_pipeline_stage&properties=hubspot_owner_id');
    if ($.isErrorResponse(activity, tickets)) return;

    let status = {
      title: T(activity, 'Open Tickets'),
      link: `https://app.hubspot.com/contacts/${currentUser.body.portalId}/tickets/list/view/all/`,
      linkLabel: T(activity, 'All Tickets')
    };

    const openTickets = api.filterOpenTickets(tickets.body.objects);
    const value = api.filterMyTickets(currentOwnerId, openTickets).length;

    if (value != 0) {
      status = {
        ...status,
        description: value > 1 ? T(activity, "You have {0} tickets.", value) : T(activity, "You have 1 ticket."),
        color: 'blue',
        value: value,
        actionable: true
      };
    } else {
      status = {
        ...status,
        description: T(activity, `You have no tickets.`),
        actionable: false
      };
    }

    activity.Response.Data = status;
  } catch (error) {
    $.handleError(activity, error);
  }
};