'use strict';
const api = require('./common/api');

module.exports = async (activity) => {
  try {
    const currentUser = await api.getCurrentUser();

    if (Activity.isErrorResponse(currentUser)) return;

    const tickets = await api('/crm-objects/v1/objects/tickets/paged?properties=subject&properties=content');

    if (Activity.isErrorResponse(tickets)) return;

    var dateRange = Activity.dateRange("today");
    let filteredTickets = filterTicketsByDateRange(tickets.body.objects, dateRange);

    let ticketStatus = {
      title: T('New Tickets'),
      url: `https://app.hubspot.com/contacts/${currentUser.body.portalId}/tickets/list/view/all/`,
      urlLabel: T('All tickets'),
    };

    let ticketCount = filteredTickets.length;
    
    if (ticketCount != 0) {
      ticketStatus = {
        ...ticketStatus,
        description: ticketCount > 1 ? T("You have {0} new tickets.", ticketCount) : T("You have 1 new ticket."),
        color: 'blue',
        value: ticketCount,
        actionable: true
      };
    } else {
      ticketStatus = {
        ...ticketStatus,
        description: T(`You have no new tickets.`),
        actionable: false
      };
    }

    activity.Response.Data = ticketStatus;
  } catch (error) {
    Activity.handleError(error);
  }
};

//**filters tickets based on provided dateRange */
function filterTicketsByDateRange(tickets, dateRange) {
  let filteredTickets = [];
  let timeMin = new Date(dateRange.startDate).valueOf();
  let timeMax = new Date(dateRange.endDate).valueOf();

  for (let i = 0; i < tickets.length; i++) {
    const ticket = tickets[i];
    let createTime = ticket.properties.subject.timestamp;

    if (createTime > timeMin && createTime < timeMax) {
      filteredTickets.push(ticket);
    }
  }

  return filteredTickets;
}