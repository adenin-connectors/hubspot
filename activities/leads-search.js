'use strict';
const api = require('./common/api');

module.exports = async function (activity) {

  try {
    let pagination = Activity.pagination();

    let url = `/contacts/v1/search/query?q=${activity.Request.Query.query || ""}&count=${pagination.pageSize}`;
    if (pagination.nextpage) {
      url += `&vidOffset=${pagination.nextpage}`;
    }

    const response = await api(url);

    if (Activity.isErrorResponse(response)) return;

    activity.Response.Data = api.mapLeadsToItems(response);
    if (response.body['has-more']) {
      activity.Response.Data._nextpage = response.body['vid-offset'];
    }
  } catch (error) {
    Activity.handleError(error);
  }
};