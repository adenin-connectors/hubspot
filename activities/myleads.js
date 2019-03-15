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

    activity.Response.Data = mapResponseToItems(response);
    if (response.body['has-more']) {
      activity.Response.Data._nextpage = response.body['vid-offset'];
    }
  } catch (error) {
    cfActivity.handleError(activity, error);
  }
};

//**maps response to items */
function mapResponseToItems(response) {
  let items = [];
  let leads = response.body.contacts;

  for (let i = 0; i < leads.length; i++) {
    let raw = leads[i];
    let firstname = raw.properties.firstname;
    let lastname = raw.properties.lastname;

    let item = {
      id: raw.vid,
      title: firstname == null ? null : firstname.value,
      description: lastname == null ? null : lastname.value,
      link: raw["profile-url"],
      raw: raw
    };
    items.push(item);
  }

  return { items: items };
}