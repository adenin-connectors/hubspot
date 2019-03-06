'use strict';

const cfActivity = require('@adenin/cf-activity');
const api = require('./common/api');

module.exports = async (activity) => {
  try {
    api.initialize(activity);
    const currentUser = await api.getCurrentUser();

    if (!cfActivity.isResponseOk(activity, currentUser)) {
      return;
    }

    const tickets = await api('/crm-objects/v1/objects/tickets/paged?properties=subject&properties=content');

    if (!cfActivity.isResponseOk(activity, tickets)) {
      return;
    }
    var dateRange = cfActivity.dateRange(activity, "today");
    let filteredTickets = filterTicketsByDateRange(tickets.body.objects, dateRange);

    let ticketStatus = {
      title: 'New Tickets',
      url: `https://app.hubspot.com/contacts/${currentUser.body.portalId}/tickets/list/view/all/`,
      urlLabel: 'All tickets',
    };

    let ticketCount = filteredTickets.length;

    if (ticketCount != 0) {
      ticketStatus = {
        ...ticketStatus,
        description: `You have ${ticketCount > 1 ? ticketCount + " new tickets" : ticketCount + " new ticket"} assigned`,
        color: 'blue',
        value: ticketCount,
        actionable: true
      };
    } else {
      ticketStatus = {
        ...ticketStatus,
        description: `You have no new tickets assigned`,
        actionable: false
      };
    }
    
    activity.Response.Data = ticketStatus;
  } catch (error) {
    cfActivity.handleError(activity, error);
  }
};

//**filters tickets based on provided dateRange */
function filterTicketsByDateRange(tickets, dateRange) {
  let filteredLeads = [];
  let timeMin = new Date(dateRange.startDate).valueOf();
  let timeMax = new Date(dateRange.endDate).valueOf();

  for (let i = 0; i < tickets.length; i++) {
    const ticket = tickets[i];
    let createTime = ticket.properties.content.timestamp;

    if (createTime > timeMin && createTime < timeMax) {
      filteredLeads.push(ticket);
    }
  }

  return filteredLeads;
}