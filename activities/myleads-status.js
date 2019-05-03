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

    if (currentOwner.body.length < 1) {
      //mail that we provided does not match any account on hubspot
      return;
    }
    const currentOwnerId = currentOwner.body[0].ownerId;

    const leads = await api('/contacts/v1/lists/all/contacts/all?property=hubspot_owner_id&property=firstname&property=lastname&property=lastmodifieddate');
    if ($.isErrorResponse(activity, leads)) return;

    let myLeads = api.filterMyLeads(currentOwnerId, leads.body.contacts);

    let status = {
      title: T(activity, 'Leads'),
      link: `https://app.hubspot.com/contacts/${currentUser.body.portalId}/contacts/list/view/all`,
      linkLabel: T(activity, 'All Leads')
    };

    const value = myLeads.length;

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
