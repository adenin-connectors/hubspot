'use strict';

const api = require('./common/api');

module.exports = async (activity) => {
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

    // mail that we provided does not match any account on hubspot
    if (currentOwner.body.length < 1) return;

    const allLeads = [];

    let url = '/contacts/v1/lists/all/contacts/recent?property=createdate&property=firstname&property=lastname&property=company&property=requested&count=100';

    let response = await api(url);

    if ($.isErrorResponse(activity, response)) return;

    allLeads.push(...response.body.contacts);

    let vidOffset = null;
    let timeOffset = null;

    if (response.body['has-more']) {
      vidOffset = response.body['vid-offset'];
      timeOffset = response.body['time-offset'];
    }

    while (vidOffset && timeOffset) {
      url = `/contacts/v1/lists/all/contacts/recent?property=createdate&property=firstname&property=lastname&property=company&property=requested&count=100&vidOffset=${vidOffset}&timeOffset=${timeOffset}`;

      response = await api(url);

      if ($.isErrorResponse(activity, response)) return;

      allLeads.push(...response.body.contacts);

      vidOffset = null;
      timeOffset = null;

      if (response.body['has-more']) {
        vidOffset = response.body['vid-offset'];
        timeOffset = response.body['time-offset'];
      }
    }

    const dateRange = $.dateRange(activity);

    let leads = api.filterLeadsByDateRange(allLeads, dateRange);

    leads = api.mapLeadsToItems(allLeads);
    leads.sort($.compare.dateDescending); // descending

    const dateToAssign = leads.length > 0 ? leads[0].date : null;

    let count = 0;
    let readDate = (new Date(new Date().setDate(new Date().getDate() - 30))).toISOString(); // default read date 30 days in the past

    if (activity.Request.Query.readDate) readDate = activity.Request.Query.readDate;

    for (let i = 0; i < leads.length; i++) {
      if (leads[i].date > readDate) count++;
    }

    const pagination = $.pagination(activity);

    leads = api.paginateItems(leads, pagination);

    activity.Response.Data.items = leads;

    if (parseInt(pagination.page) === 1) {
      activity.Response.Data.title = T(activity, 'New Leads');
      activity.Response.Data.link = `https://app.hubspot.com/contacts/${currentUser.body.portalId}/contacts/list/view/all`;
      activity.Response.Data.linkLabel = T(activity, 'All Leads');
      activity.Response.Data.actionable = count > 0;
      activity.Response.Data.thumbnail = 'https://www.adenin.com/assets/images/wp-images/logo/hubspot.svg';

      if (count > 0) {
        activity.Response.Data.value = count;
        activity.Response.Data.color = 'blue';
        activity.Response.Data.date = dateToAssign;
        activity.Response.Data.description = count > 1 ? T(activity, 'You have {0} new leads.', count) : T(activity, 'You have 1 new lead.');
      } else {
        activity.Response.Data.description = T(activity, 'You have no new leads.');
      }
    }
  } catch (error) {
    $.handleError(activity, error);
  }
};
