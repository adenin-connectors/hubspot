'use strict';
const api = require('./common/api');

module.exports = async (activity) => {
  try {
    api.initialize(activity);
    const currentUser = await api.getCurrentUser();
    if ($.isErrorResponse(activity, currentUser)) return;

    const leads = await api('/contacts/v1/lists/all/contacts/all');
    if ($.isErrorResponse(activity, leads)) return;

    let status = {
      title: T(activity,'Leads'),
      link: `https://app.hubspot.com/contacts/${currentUser.body.portalId}/contacts/list/view/all`,
      linkLabel: T(activity,'All Leads')
    };

    let value = leads.body.contacts.length;

    if (value != 0) {
      status = {
        ...status,
        description: value > 1 ? T(activity, "You have {0} leads.", value) : T(activity, "You have 1 lead."),
        color: 'blue',
        value: value,
        actionable: true
      };
    } else {
      status = {
        ...status,
        description: T(activity, `You have no leads.`),
        actionable: false
      };
    }
    activity.Response.Data = status;

  } catch (error) {
    $.handleError(activity, error);
  }
};
