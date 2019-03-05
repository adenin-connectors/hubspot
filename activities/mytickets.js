'use strict';

const cfActivity = require('@adenin/cf-activity');
const api = require('./common/api');


module.exports = async function (activity) {

  try {
    api.initialize(activity);
    const response = await api('/crm-objects/v1/objects/tickets/paged?properties=subject&properties=content');

    if (!cfActivity.isResponseOk(activity, response)) {
      return;
    }

    activity.Response.Data = api.convertResponse(response);
  } catch (error) {
    cfActivity.handleError(activity, error);
  }
};