'use strict';
const api = require('./common/api');

module.exports = async (activity) => {
  try {
    api.initialize(activity);
    const currentUser = await api.getCurrentUser();

    if ($.isErrorResponse(activity, currentUser)) return;

    const leads = await api('/contacts/v1/lists/all/contacts/all');

    if ($.isErrorResponse(activity, leads)) return;

    let leadsStatus = {
      title: T(activity,'Leads'),
      link: `https://app.hubspot.com/contacts/${currentUser.body.portalId}/contacts/list/view/all`,
      linkLabel: T(activity,'All Leads')
    };

    let leadCount = leads.body.contacts.length;

    if (leadCount != 0) {
      leadsStatus = {
        ...leadsStatus,
        description: leadCount > 1 ? T(activity, "You have {0} leads.", leadCount) : T(activity, "You have 1 lead."),
        color: 'blue',
        value: leadCount,
        actionable: true
      };
    } else {
      leadsStatus = {
        ...leadsStatus,
        description: T(activity, `You have no leads.`),
        actionable: false
      };
    }
    activity.Response.Data = leadsStatus;

  } catch (error) {
    $.handleError(activity, error);
  }
};
