'use strict';

const cfActivity = require('@adenin/cf-activity');
const api = require('./common/api');


module.exports = async function (activity) {

  try {
    api.initialize(activity);

    let pagination = cfActivity.pagination(activity);
    let url = `/crm-objects/v1/objects/tickets/paged?properties=subject&properties=content`;
    if (pagination.nextpage) {
      url += `&offset=${pagination.nextpage}`;
    }

    const response = await api(url);

    if (!cfActivity.isResponseOk(activity, response)) {
      return;
    }

    activity.Response.Data = mapResponseToItems(response);
    if (response.body.hasMore) {
      activity.Response.Data._nextpage = response.body.offset;
    }
  } catch (error) {
    cfActivity.handleError(activity, error);
  }
};
//**maps response to items */
function mapResponseToItems(response) {
  let items = [];
  let tickets = response.body.objects;

  for (let i = 0; i < tickets.length; i++) {
    let raw = tickets[i];
    let ticketProps = raw.properties;
    let ticketSubj = ticketProps.subject;
    let ticketContent = ticketProps.content;

    let item = {
      id: raw.objectId,
      title: ticketSubj == null ? null : ticketSubj.value,
      description: ticketContent == null ? null : ticketContent.value,
      link: `https://app.hubspot.com/contacts/${raw.portalId}/ticket/${raw.objectId}`,
      raw: raw
    };
    items.push(item);
  }

  return { items: items };
}