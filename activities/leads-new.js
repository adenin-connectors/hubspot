'use strict';

const cfActivity = require('@adenin/cf-activity');
const api = require('./common/api');

module.exports = async (activity) => {
  try {
    api.initialize(activity);
    const currentUser = await api.getCurrentUser();

    if (!cfActivity.isResponseOk(activity, currentUser)) {
      return;
    }

    const newLeads = await api('/contacts/v1/lists/all/contacts/recent');

    if (!cfActivity.isResponseOk(activity, newLeads)) {
      return;
    }

    var dateRange = cfActivity.dateRange(activity, "today");
    let filteredLeads = filterLeadsByDateRange(newLeads.body.contacts, dateRange);

    let leadsStatus = {
      title: 'New Leads',
      url: `https://app.hubspot.com/contacts/${currentUser.body.portalId}/contacts/list/view/all`,
      urlLabel: 'All Leads',
    };

    let leadCount = filteredLeads.length;

    if (leadCount != 0) {
      leadsStatus = {
        ...leadsStatus,
        description: `You have ${leadCount > 1 ? leadCount + " new leads" : leadCount + " new lead"}.`,
        color: 'blue',
        value: leadCount,
        actionable: true
      };
    } else {
      leadsStatus = {
        ...leadsStatus,
        description: `You have no new leads.`,
        actionable: false
      };
    }

    activity.Response.Data = leadsStatus;
  } catch (error) {
    cfActivity.handleError(activity, error);
  }
};

//**filters leads based on provided dateRange */
function filterLeadsByDateRange(leads, dateRange) {
  let filteredLeads = [];
  let timeMin = new Date(dateRange.startDate).valueOf();
  let timeMax = new Date(dateRange.endDate).valueOf();

  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];

    if (lead.addedAt > timeMin && lead.addedAt < timeMax) {
      filteredLeads.push(lead);
    }
  }

  return filteredLeads;
}