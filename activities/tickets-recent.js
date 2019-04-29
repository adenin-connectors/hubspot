'use strict';
const api = require('./common/api');

module.exports = async (activity) => {
  try {
    api.initialize(activity);
    const currentUser = await api.getCurrentUser();
    if ($.isErrorResponse(activity, currentUser)) return;

    const tickets = await api('/crm-objects/v1/objects/tickets/paged?properties=subject&properties=content&properties=createdate&properties=hs_pipeline_stage');
    if ($.isErrorResponse(activity, tickets)) return;

    var dateRange = $.dateRange(activity, "today");
    activity.Response.Data = filterTicketsByDateRange(tickets.body.objects, dateRange);
    activity.Response.Data.title = T(activity, 'Recent Tickets');
    activity.Response.Data.link = `https://app.hubspot.com/contacts/${currentUser.body.portalId}/tickets/list/view/all/`;
    activity.Response.Data.linkLabel = T(activity, 'All Tickets');
  } catch (error) {
    $.handleError(activity, error);
  }
};

//**filters tickets based on provided dateRange */
function filterTicketsByDateRange(tickets, dateRange) {
  let filteredTickets = [];
  let timeMin = new Date(dateRange.startDate).valueOf();
  let timeMax = new Date(dateRange.endDate).valueOf();

  tickets = api.filterOpenTickets(tickets);

  for (let i = 0; i < tickets.length; i++) {
    const raw = tickets[i];
    let createTime = raw.properties.createdate.value;
    if (createTime > timeMin && createTime < timeMax) {
      let ticketProps = raw.properties;
      let ticketSubj = ticketProps.subject;
      let ticketContent = ticketProps.content;

      let item = {
        id: raw.objectId.toString(),
        title: ticketSubj == null ? null : ticketSubj.value,
        description: ticketContent == null ? null : ticketContent.value,
        date: new Date(parseInt(createTime)).toISOString(),
        link: `https://app.hubspot.com/contacts/${raw.portalId}/ticket/${raw.objectId}`,
        raw: raw
      };
      filteredTickets.push(item);
    }
  }

  return filteredTickets;
}