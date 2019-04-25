'use strict';
const api = require('./common/api');

module.exports = async (activity) => {
  try {
    api.initialize(activity);
    const currentUser = await api.getCurrentUser();

    if ($.isErrorResponse(activity, currentUser)) return;

    const tickets = await api('/crm-objects/v1/objects/tickets/paged?properties=subject&properties=content');

    if ($.isErrorResponse(activity, tickets)) return;

    let ticketStatus = {
      title: T(activity, 'Open Tickets'),
      link: `https://app.hubspot.com/contacts/${currentUser.body.portalId}/tickets/list/view/all/`,
      linkLabel: T(activity, 'All Tickets')
    };

    let ticketCount = tickets.body.objects.length;

    if (ticketCount != 0) {
      ticketStatus = {
        ...ticketStatus,
        description: ticketCount > 1 ? T(activity, "You have {0} tickets.", ticketCount) : T(activity, "You have 1 ticket."),
        color: 'blue',
        value: ticketCount,
        actionable: true
      };
    } else {
      ticketStatus = {
        ...ticketStatus,
        description: T(activity, `You have no tickets.`),
        actionable: false
      };
    }

    activity.Response.Data = ticketStatus;
  } catch (error) {
    $.handleError(activity, error);
  }
};
