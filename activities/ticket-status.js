'use strict';
const api = require('./common/api');

module.exports = async (activity) => {
  try {
    api.initialize(activity);
    const currentUser = await api.getCurrentUser();
    if ($.isErrorResponse(activity, currentUser)) return;

    const tickets = await api('/crm-objects/v1/objects/tickets/paged?properties=subject&properties=content&properties=hs_pipeline_stage');
    if ($.isErrorResponse(activity, tickets)) return;

    let status = {
      title: T(activity, 'Open Tickets'),
      link: `https://app.hubspot.com/contacts/${currentUser.body.portalId}/tickets/list/view/all/`,
      linkLabel: T(activity, 'All Tickets')
    };

    let value = api.filterOpenTickets(tickets.body.objects).length;

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