'use strict';
const api = require('./common/api');

module.exports = async function (activity) {
  try {
    api.initialize(activity);
    const currentUser = await api.getCurrentUser();
    if ($.isErrorResponse(activity, currentUser)) return;

    const pagination = $.pagination(activity);
    let url = `/contacts/v1/lists/all/contacts/all?count=${pagination.pageSize}`;
    if (pagination.nextpage) {
      url += `&vidOffset=${pagination.nextpage}`;
    }
    const response = await api(url);
    if ($.isErrorResponse(activity, response)) return;

    activity.Response.Data.items = api.mapLeadsToItems(response.body.contacts);
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