'use strict';
const api = require('./common/api');

module.exports = async function (activity) {
  try {
    api.initialize(activity);
    const currentUser = await api.getCurrentUser();
    if ($.isErrorResponse(activity, currentUser)) return;

    const url = `/crm-objects/v1/objects/tickets/paged?properties=subject&properties=content&properties=hubspot_owner_id&properties=createdate&properties=hs_pipeline_stage`;
    const response = await api(url);
    if ($.isErrorResponse(activity, response)) return;

    let tickets = api.filterOpenTickets(response.body.objects);
    tickets = filterUnassignedTickets(tickets);

    activity.Response.Data.items = api.mapTicketsToItems(tickets);
    activity.Response.Data.title = T(activity, 'Unassigned Tickets');
    activity.Response.Data.link = `https://app.hubspot.com/contacts/${currentUser.body.portalId}/tickets/list/view/all/`;
    activity.Response.Data.linkLabel = T(activity, 'All Tickets');
  } catch (error) {
    $.handleError(activity, error);
  }
};
//** filters unassigned tickets from response */
function filterUnassignedTickets(tickets) {
  let unassignedTickets = [];

  for (let i = 0; i < tickets.length; i++) {
    if (!tickets[i].properties.hubspot_owner_id) {
      unassignedTickets.push(tickets[i]);
    }
  }

  return unassignedTickets;
}