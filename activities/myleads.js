'use strict';
const api = require('./common/api');

module.exports = async function (activity) {
  try {
    api.initialize(activity);

    const promises = [];
    promises.push(api.getCurrentUser());
    promises.push(api.getOwner());
    const responses = await Promise.all(promises);

    for (let i = 0; i < responses.length; i++) {
      if ($.isErrorResponse(activity, responses[i])) return;
    }

    const currentUser = responses[0];
    const currentOwner = responses[1];

    if (currentOwner.body.length < 1) {
      //mail that we provided does not match any account on hubspot
      return;
    }
    const currentOwnerId = currentOwner.body[0].ownerId;

    const pagination = $.pagination(activity);
    let url = `/contacts/v1/lists/all/contacts/all?property=hubspot_owner_id&property=firstname&property=lastname&property=lastmodifieddate&count=${pagination.pageSize}`;
    if (pagination.nextpage) {
      url += `&vidOffset=${pagination.nextpage}`;
    }
  // url = '/properties/v1/contacts/properties';
    const response = await api(url);
    if ($.isErrorResponse(activity, response)) return;

    let leads = api.filterMyLeads(currentOwnerId, response.body.contacts);

    activity.Response.Data.items = api.mapLeadsToItems(leads);
    activity.Response.Data.title = T(activity, 'Leads');
    activity.Response.Data.link = `https://app.hubspot.com/contacts/${currentUser.body.portalId}/contacts/list/view/all`;
    activity.Response.Data.linkLabel = T(activity, 'All Leads');

    if (response.body['has-more']) {
      activity.Response.Data._nextpage = response.body['vid-offset'];
    }
  } catch (error) {
    $.handleError(activity, error);
  }
};