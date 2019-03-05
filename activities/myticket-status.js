'use strict';

const cfActivity = require('@adenin/cf-activity');
const api = require('./common/api');

module.exports = async (activity) => {
  try {
    api.initialize(activity);
    const currentUser = await api('/integrations/v1/me');

    if (!cfActivity.isResponseOk(activity, currentUser)) {
      return;
    }

    const tickets = await api('/crm-objects/v1/objects/tickets/paged?properties=subject&properties=content');

    if (!cfActivity.isResponseOk(activity, tickets)) {
      return;
    }

    let ticketStatus = {
      title: 'Open Tickets',
      url: `https://app.hubspot.com/contacts/${currentUser.body.portalId}/tickets/list/view/all/`,
      urlLabel: 'All tickets',
    };

    let ticketCount = tickets.body.objects.length;

    if (ticketCount != 0) {
      ticketStatus = {
        ...ticketStatus,
        description: `You have ${ticketCount > 1 ? ticketCount + " tickets" : ticketCount + " ticket"} assigned`,
        color: 'blue',
        value: ticketCount,
        actionable: true
      };
    } else {
      ticketStatus = {
        ...ticketStatus,
        description: `You have no tickets assigned`,
        actionable: false
      };
    }
    activity.Response.Data = ticketStatus;

  } catch (error) {
    cfActivity.handleError(activity, error);
  }
};
