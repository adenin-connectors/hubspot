'use strict';
const api = require('./common/api');

module.exports = async (activity) => {
  try {
    const currentUser = await api.getCurrentUser();

    if (Activity.isErrorResponse(currentUser)) return;

    const leads = await api('/contacts/v1/lists/all/contacts/all');

    if (Activity.isErrorResponse(leads)) return;

    let leadsStatus = {
      title: T('Leads'),
      url: `https://app.hubspot.com/contacts/${currentUser.body.portalId}/contacts/list/view/all`,
      urlLabel: T('All Leads'),
    };

    let leadCount = leads.body.contacts.length;

    if (leadCount != 0) {
      leadsStatus = {
        ...leadsStatus,
        description: leadCount > 1 ? T("You have {0} leads.", leadCount) : T("You have 1 lead."),
        color: 'blue',
        value: leadCount,
        actionable: true
      };
    } else {
      leadsStatus = {
        ...leadsStatus,
        description: T(`You have no leads.`),
        actionable: false
      };
    }
    activity.Response.Data = leadsStatus;

  } catch (error) {
    Activity.handleError(error);
  }
};
