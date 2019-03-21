'use strict';
const cfActivity = require('@adenin/cf-activity');
const api = require('./common/api');

module.exports = async function (activity) {

  try {
    api.initialize(activity);

    let pagination = cfActivity.pagination(activity);
    let url = `/contacts/v1/lists/all/contacts/all?count=${pagination.pageSize}`;
    if (pagination.nextpage) {
      url += `&vidOffset=${pagination.nextpage}`;
    }

    const response = await api(url);

    if (!cfActivity.isResponseOk(activity, response)) {
      return;
    }

    activity.Response.Data = api.mapLeadsToItems(response);
    if (response.body['has-more']) {
      activity.Response.Data._nextpage = response.body['vid-offset'];
    }
  } catch (error) {
    cfActivity.handleError(activity, error);
  }
};