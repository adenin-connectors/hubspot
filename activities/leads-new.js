'use strict';
const api = require('./common/api');

module.exports = async (activity) => {
  try {
    api.initialize(activity);
    const currentUser = await api.getCurrentUser();

    if ($.isErrorResponse(activity, currentUser)) return;

    const newLeads = await api('/contacts/v1/lists/all/contacts/recent');

    if ($.isErrorResponse(activity, newLeads)) return;

    var dateRange = $.dateRange(activity, "today");
    let filteredLeads = api.filterLeadsByDateRange(newLeads.body.contacts, dateRange);

    let leadsStatus = {
      title: T(activity, 'New Leads'),
      link: `https://app.hubspot.com/contacts/${currentUser.body.portalId}/contacts/list/view/all`,
      linkLabel: T(activity, 'All Leads')
    };

    let leadCount = filteredLeads.length;

    if (leadCount != 0) {
      leadsStatus = {
        ...leadsStatus,
        description: leadCount > 1 ? T(activity, "You have {0} new leads.", leadCount) : T(activity, "You have 1 new lead."),
        color: 'blue',
        value: leadCount,
        actionable: true
      };
    } else {
      leadsStatus = {
        ...leadsStatus,
        description: T(activity, `You have no new leads.`),
        actionable: false
      };
    }

    activity.Response.Data = leadsStatus;
  } catch (error) {
    $.handleError(activity, error);
  }
};