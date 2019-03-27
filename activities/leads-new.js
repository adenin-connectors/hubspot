'use strict';
const api = require('./common/api');

module.exports = async (activity) => {
  try {
    const currentUser = await api.getCurrentUser();

    if (Activity.isErrorResponse(currentUser)) return;

    const newLeads = await api('/contacts/v1/lists/all/contacts/recent');

    if (Activity.isErrorResponse(newLeads)) return;

    var dateRange = Activity.dateRange("today");
    let filteredLeads = api.filterLeadsByDateRange(newLeads.body.contacts, dateRange);

    let leadsStatus = {
      title: T('New Leads'),
      link: `https://app.hubspot.com/contacts/${currentUser.body.portalId}/contacts/list/view/all`,
      linkLabel: T('All Leads')
    };

    let leadCount = filteredLeads.length;
    
    if (leadCount != 0) {
      leadsStatus = {
        ...leadsStatus,
        description: leadCount > 1 ? T("You have {0} new leads.", leadCount) : T("You have 1 new lead."),
        color: 'blue',
        value: leadCount,
        actionable: true
      };
    } else {
      leadsStatus = {
        ...leadsStatus,
        description: T(`You have no new leads.`),
        actionable: false
      };
    }

    activity.Response.Data = leadsStatus;
  } catch (error) {
    Activity.handleError(error);
  }
};