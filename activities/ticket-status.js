'use strict';
const api = require('./common/api');

module.exports = async (activity) => {
  try {
    const currentUser = await api.getCurrentUser();

    if (Activity.isErrorResponse(currentUser)) return;

    const tickets = await api('/crm-objects/v1/objects/tickets/paged?properties=subject&properties=content');

    if (Activity.isErrorResponse(tickets)) return;

    let ticketStatus = {
      title: T('Open Tickets'),
      url: `https://app.hubspot.com/contacts/${currentUser.body.portalId}/tickets/list/view/all/`,
      urlLabel: T('All tickets'),
    };

    let ticketCount = tickets.body.objects.length;
    
    if (ticketCount != 0) {
      ticketStatus = {
        ...ticketStatus,
        description: ticketCount > 1 ? T("You have {0} tickets.", ticketCount) : T("You have 1 ticket."),
        color: 'blue',
        value: ticketCount,
        actionable: true
      };
    } else {
      ticketStatus = {
        ...ticketStatus,
        description: T(`You have no tickets.`),
        actionable: false
      };
    }

    activity.Response.Data = ticketStatus;
  } catch (error) {
    Activity.handleError(error);
  }
};
