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

    let allLeads = [];

    let url = `/contacts/v1/lists/all/contacts/all?property=hubspot_owner_id&property=firstname&property=lastname&property=email` +
      `&property=lastmodifieddate&count=100`;
    let response = await api(url);
    if ($.isErrorResponse(activity, response)) return;
    allLeads.push(...response.body.contacts);

    let nextPageToken = null;
    if (response.body['has-more']) {
      nextPageToken = response.body['vid-offset'];
    }

    while (nextPageToken) {
      url = `/contacts/v1/lists/all/contacts/all?property=hubspot_owner_id&property=firstname&property=lastname&property=email` +
        `&property=lastmodifieddate&count=100&vidOffset=${nextPageToken}`;
      response = await api(url);
      if ($.isErrorResponse(activity, response)) return;
      allLeads.push(...response.body.contacts);
      nextPageToken = null;
      if (response.body['has-more']) {
        nextPageToken = response.body['vid-offset'];
      }
    }

    let leads = api.filterMyLeads(currentOwnerId, allLeads);
    const dateRange = $.dateRange(activity);
    leads = api.filterLeadsByDateRange(leads, dateRange);
    leads = api.mapLeadsToItems(leads);

    leads.sort((a, b) => {
      return new Date(b.date) - new Date(a.date); //descending
    });

    let dateToAssign = leads.length > 0 ? leads[0].date : null;
    let value = leads.length;

    const pagination = $.pagination(activity);
    leads = api.paginateItems(leads, pagination);

    activity.Response.Data.items = leads;
    if (parseInt(pagination.page) == 1) {
      activity.Response.Data.title = T(activity, 'Leads');
      activity.Response.Data.link = `https://app.hubspot.com/contacts/${currentUser.body.portalId}/contacts/list/view/all`;
      activity.Response.Data.linkLabel = T(activity, 'All Leads');
      activity.Response.Data.actionable = value > 0;
      activity.Response.Data.thumbnail = "https://www.adenin.com/assets/images/wp-images/logo/hubspot.svg";

      if (value > 0) {
        activity.Response.Data.value = value;
        activity.Response.Data.date = dateToAssign;
        activity.Response.Data.description = value > 1 ? T(activity, "You have {0} leads.", value) :
          T(activity, "You have 1 lead.");
        activity.Response.Data.briefing = activity.Response.Data.description + ' The latest is <b>' + leads[0].title + '</b>';
      } else {
        activity.Response.Data.description = T(activity, `You have no leads.`);
      }
    }
  } catch (error) {
    $.handleError(activity, error);
  }
};
