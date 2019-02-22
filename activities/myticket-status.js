'use strict';

const logger = require('@adenin/cf-logger');
const handleError = require('@adenin/cf-activity').handleError;
const api = require('./common/api');

module.exports = async (activity) => {
  try {
    api.initialize(activity);
    const currentUser = await api('/integrations/v1/me');

    const tickets = await api('/crm-objects/v1/objects/tickets/paged?properties=subject&properties=content');

    let ticketStatus = {
      title: 'Open Tickets',
      url: `https://app.hubspot.com/contacts/${currentUser.body.portalId}/tickets/list/view/all/`,
      urlLabel: 'All tickets',
    };

    if (tickets.body.objects.length != 0) {
      ticketStatus = {
        ...ticketStatus,
        description: `You have ${tickets.body.objects.length} tickets assigned`,
        color: 'blue',
        value: tickets.body.objects.length,
        actionable: true
      }
    } else {
      ticketStatus = {
        ...ticketStatus,
        description: `You have no tickets assigned`,
        actionable: false
      }
    }
    activity.Response.Data = ticketStatus;

  } catch (error) {
    handleError(error, activity);
  }
};
