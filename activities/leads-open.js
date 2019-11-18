'use strict';

const api = require('./common/api');

module.exports = async (activity) => {
  try {
    api.initialize(activity);

    const promises = [];

    promises.push(api.getCurrentUser());
    promises.push(api('/contacts/v1/lists?count=250'));

    const initialResponses = await Promise.all(promises);

    for (let i = 0; i < initialResponses.length; i++) {
      if ($.isErrorResponse(activity, initialResponses[i])) return;
    }

    const currentUser = initialResponses[0];
    let listResponse = initialResponses[1];

    if ($.isErrorResponse(activity, listResponse)) return;

    const lists = listResponse.body.lists;

    // default response values
    activity.Response.Data.title = T(activity, 'Open Leads');
    activity.Response.Data.thumbnail = 'https://www.adenin.com/assets/images/wp-images/logo/hubspot.svg';
    activity.Response.Data.link = `https://app.hubspot.com/contacts/${currentUser.body.portalId}/contacts/list/view/all`;
    activity.Response.Data.linkLabel = T(activity, 'All Leads');
    activity.Response.Data.actionable = false;
    activity.Response.Data.items = [];

    if (!lists || lists.length === 0) {
      activity.Response.Data.description = T(activity, 'You have no HubSpot contact lists defined');
      return;
    }

    let offset = null;

    if (listResponse.body['has-more']) offset = listResponse.body.offset;

    while (offset) {
      listResponse = await api(`/contacts/v1/lists?count=250&offset=${offset}`);

      if ($.isErrorResponse(activity, listResponse)) return;

      lists.push(...listResponse.body.lists);
      offset = null;

      if (listResponse.body['has-more']) offset = listResponse.body.offset;
    }

    let openLeadsListId;

    for (let i = 0; i < lists.length; i++) {
      const listName = lists[i].name.toLowerCase();

      if (listName === 'open' || listName === 'open leads') {
        openLeadsListId = lists[i].listId;
        break;
      }
    }

    if (!openLeadsListId) {
      activity.Response.Data.description = T(activity, 'You have no HubSpot contact list for open leads');
      return;
    }

    let contactsResponse = await api(`/contacts/v1/lists/${openLeadsListId}/contacts/recent?count=100`);

    const contacts = contactsResponse.body.contacts;

    if (!contacts || !contacts.length) {
      activity.Response.Data.description = T(activity, 'You have no open leads');
      return;
    }

    let vidOffset = null;

    if (contactsResponse.body['has-more']) vidOffset = contactsResponse.body['vid-offset'];

    while (vidOffset) {
      contactsResponse = await api(`/contacts/v1/lists/${openLeadsListId}/contacts/recent?count=100&vidOffset=${vidOffset}`);

      if ($.isErrorResponse(activity, contactsResponse)) return;

      contacts.push(...contactsResponse.body.contacts);
      vidOffset = null;

      if (contactsResponse.body['has-more']) vidOffset = contactsResponse.body['vid-offset'];
    }

    const dateRange = $.dateRange(activity);

    let items = api.filterLeadsByDateRange(contacts, dateRange);

    items = api.mapLeadsToItems(items);

    items.sort((a, b) => new Date(b.date) - new Date(a.date)); // descending

    const dateToAssign = items.length > 0 ? items[0].date : null;

    let count = 0;
    let readDate = (new Date(new Date().setDate(new Date().getDate() - 30))).toISOString(); // default read date 30 days in the past

    if (activity.Request.Query.readDate) readDate = activity.Request.Query.readDate;

    for (let i = 0; i < items.length; i++) {
      if (items[i].date > readDate) count++;
    }

    const pagination = $.pagination(activity);

    items = api.paginateItems(items, pagination);

    activity.Response.Data.items = items;

    if (parseInt(pagination.page) === 1) {
      activity.Response.Data.link = `https://app.hubspot.com/contacts/${currentUser.body.portalId}/lists/${openLeadsListId}`;
      activity.Response.Data.linkLabel = T(activity, 'All Open Leads');
      activity.Response.Data.actionable = count > 0;

      if (count > 0) {
        activity.Response.Data.value = count;
        activity.Response.Data.color = 'blue';
        activity.Response.Data.date = dateToAssign;
        activity.Response.Data.description = count > 1 ? T(activity, 'You have {0} open leads.', count) : T(activity, 'You have 1 open lead.');
      } else {
        activity.Response.Data.description = T(activity, 'You have no open leads.');
      }
    }
  } catch (error) {
    $.handleError(activity, error);
  }
};
