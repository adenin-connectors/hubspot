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

    const leads = await api('/contacts/v1/lists/all/contacts/all');

    if (!cfActivity.isResponseOk(activity, leads)) {
      return;
    }

    let leadsStatus = {
      title: 'Leads',
      url: `https://app.hubspot.com/contacts/${currentUser.body.portalId}/contacts/list/view/all`,
      urlLabel: 'All Leads',
    };

    let leadCount = leads.body.contacts.length;

    if (leadCount != 0) {
      leadsStatus = {
        ...leadsStatus,
        description: `You have ${leadCount > 1 ? leadCount + " leads" : leadCount + " lead"}.`,
        color: 'blue',
        value: leadCount,
        actionable: true
      };
    } else {
      leadsStatus = {
        ...leadsStatus,
        description: `You have no leads.`,
        actionable: false
      };
    }
    activity.Response.Data = leadsStatus;

  } catch (error) {
    cfActivity.handleError(activity, error);
  }
};
