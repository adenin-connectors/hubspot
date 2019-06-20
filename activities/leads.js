'use strict';
const api = require('./common/api');

module.exports = async function (activity) {
  try {
    api.initialize(activity);
    const currentUser = await api.getCurrentUser();
    if ($.isErrorResponse(activity, currentUser)) return;

    let allLeads = [];

    let url = `/contacts/v1/lists/all/contacts/all?property=hubspot_owner_id&property=firstname&property=lastname` +
      `&property=lastmodifieddate&count=100`;
    let response = await api(url);
    if ($.isErrorResponse(activity, response)) return;
    allLeads.push(...response.body.contacts);

    let nextPageToken = null;
    if (response.body['has-more']) {
      nextPageToken = response.body['vid-offset'];
    }

    while (nextPageToken) {
      url = `/contacts/v1/lists/all/contacts/all?property=hubspot_owner_id&property=firstname&property=lastname` +
        `&property=lastmodifieddate&count=100&vidOffset=${nextPageToken}`;
      response = await api(url);
      if ($.isErrorResponse(activity, response)) return;
      allLeads.push(...response.body.contacts);
      nextPageToken = null;
      if (response.body['has-more']) {
        nextPageToken = response.body['vid-offset'];
      }
    }

    const dateRange = $.dateRange(activity);
    let leads = api.filterLeadsByDateRange(allLeads, dateRange);
    leads = api.mapLeadsToItems(leads);

    leads.sort((a, b) => {
      return new Date(b.date) - new Date(a.date); //descending
    });

    let dateToAssign = leads[0].date;
    let value = leads.length;
    const pagination = $.pagination(activity);
    leads = api.paginateItems(leads, pagination);

    activity.Response.Data.items = leads;
    if (parseInt(pagination.page) == 1) {
      activity.Response.Data.title = T(activity, 'Leads');
      activity.Response.Data.link = `https://app.hubspot.com/contacts/${currentUser.body.portalId}/contacts/list/view/all`;
      activity.Response.Data.linkLabel = T(activity, 'All Leads');
      activity.Response.Data.actionable = value > 0;

      if (value > 0) {
        activity.Response.Data.value = value;
        activity.Response.Data.date = dateToAssign;
        activity.Response.Data.color = 'blue';
        activity.Response.Data.description = value > 1 ? T(activity, "You have {0} leads.", value) :
          T(activity, "You have 1 lead.");
      } else {
        activity.Response.Data.description = T(activity, `You have no leads.`);
      }
    }
  } catch (error) {
    $.handleError(activity, error);
  }
};