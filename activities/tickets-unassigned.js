'use strict';
const api = require('./common/api');

module.exports = async function (activity) {
  try {
    api.initialize(activity);
    const currentUser = await api.getCurrentUser();
    if ($.isErrorResponse(activity, currentUser)) return;

    let url = `/crm-objects/v1/objects/tickets/paged?properties=subject&properties=content&properties=hubspot_owner_id&properties=createdate&properties=hs_pipeline_stage`;
    const response = await api(url);
    if ($.isErrorResponse(activity, response)) return;

    activity.Response.Data.items = filterUnassignedTickets(response.body.objects);
    activity.Response.Data.title = T(activity, 'Unassigned Tickets');
    activity.Response.Data.link = `https://app.hubspot.com/contacts/${currentUser.body.portalId}/tickets/list/view/all/`;
    activity.Response.Data.linkLabel = T(activity, 'All Tickets');
  } catch (error) {
    $.handleError(activity, error);
  }
};
//**maps response to items */
function filterUnassignedTickets(tickets) {
  let items = [];
  tickets = api.filterOpenTickets(tickets);

  for (let i = 0; i < tickets.length; i++) {
    let raw = tickets[i];
    let ticketProps = raw.properties;

    if (!raw.properties.hubspot_owner_id) {
      let ticketSubj = ticketProps.subject;
      let ticketContent = ticketProps.content;

      let item = {
        id: raw.objectId.toString(),
        title: ticketSubj == null ? null : ticketSubj.value,
        description: ticketContent == null ? null : ticketContent.value,
        date: new Date(parseInt(ticketProps.createdate.value)).toISOString(),
        link: `https://app.hubspot.com/contacts/${raw.portalId}/ticket/${raw.objectId}`,
        raw: raw
      };
      items.push(item);
    }
  }

  return { items };
}