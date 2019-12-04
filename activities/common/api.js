'use strict';
const got = require('got');
const HttpAgent = require('agentkeepalive');
const HttpsAgent = HttpAgent.HttpsAgent;

const crypto = require('crypto');

let _activity = null;
let ownerId = null;

function api(path, opts) {
  if (typeof path !== 'string') {
    return Promise.reject(new TypeError(`Expected \`path\` to be a string, got ${typeof path}`));
  }

  opts = Object.assign({
    json: true,
    token: _activity.Context.connector.token,
    endpoint: 'https://api.hubapi.com',
    agent: {
      http: new HttpAgent(),
      https: new HttpsAgent()
    }
  }, opts);

  opts.headers = Object.assign({
    accept: 'application/json',
    'user-agent': 'adenin Digital Assistant Connector, https://www.adenin.com/digital-assistant'
  }, opts.headers);

  if (opts.token) opts.headers.Authorization = `Bearer ${opts.token}`;

  const url = /^http(s)\:\/\/?/.test(path) && opts.endpoint ? path : opts.endpoint + path;

  if (opts.stream) return got.stream(url, opts);

  return got(url, opts).catch(err => {
    throw err;
  });
}

const helpers = [
  'get',
  'post',
  'put',
  'patch',
  'head',
  'delete'
];

api.initialize = (activity) => {
  _activity = activity;
};

api.stream = (url, opts) => apigot(url, Object.assign({}, opts, {
  json: false,
  stream: true
}));

api.getCurrentUser = function () {
  return api('/integrations/v1/me');
};

api.getOwner = function () {
  return api(`/owners/v2/owners?email=${_activity.Context.UserEmail}`);
};

for (const x of helpers) {
  const method = x.toUpperCase();
  api[x] = (url, opts) => api(url, Object.assign({}, opts, { method }));
  api.stream[x] = (url, opts) => api.stream(url, Object.assign({}, opts, { method }));
}

//**maps response to items */
api.mapLeadsToItems = function (leads) {
  const items = [];

  for (let i = 0; i < leads.length; i++) {
    const raw = leads[i];
    const firstname = raw.properties.firstname;
    const lastname = raw.properties.lastname;
    const company = raw.properties.company;

    let createTime;

    if (raw.properties.createdate) {
      createTime = raw.properties.createdate.value;
    } else if (raw.properties.lastmodifieddate) {
      createTime = raw.properties.lastmodifieddate.value;
    } else if (raw.addedAt) {
      createTime = raw.addedAt;
    }

    const name = (firstname ? firstname.value : '') + ' ' + (lastname ? lastname.value : '');
    const email = raw.properties.email ? raw.properties.email.value : '';

    const item = {
      id: raw.vid.toString(),
      title: name,
      description: company ? company.value : '',
      date: new Date(parseInt(createTime)).toISOString(),
      link: raw['profile-url'],
      thumbnail: $.avatarLink(name, email),
      imageIsAvatar: true,
      raw: raw
    };

    items.push(item);
  }

  return items;
};

//**filters leads based on provided dateRange */
api.filterLeadsByDateRange = function (leads, dateRange) {
  let filteredLeads = [];
  const timeMin = Date.parse(dateRange.startDate);
  const timeMax = Date.parse(dateRange.endDate);

  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];
    if (lead.addedAt > timeMin && lead.addedAt < timeMax) {
      filteredLeads.push(lead);
    }
  }

  return filteredLeads;
};

//** filters open tickets from response */
api.filterOpenTickets = function (tickets) {
  let openTickets = [];
  for (let i = 0; i < tickets.length; i++) {
    if (tickets[i].properties.hs_pipeline_stage.value != "4") {
      openTickets.push(tickets[i]);
    }
  }
  return openTickets;
};

//** filters tickets assigned to current user */
api.filterMyTickets = function (ownerId, tickets) {
  let myTickets = [];

  for (let i = 0; i < tickets.length; i++) {
    if (tickets[i].properties.hubspot_owner_id) {
      if (tickets[i].properties.hubspot_owner_id.versions[0].value == ownerId) {
        myTickets.push(tickets[i]);
      }
    }
  }
  return myTickets;
};
//** filters leads assigned to current user */
api.filterMyLeads = function (ownerId, leads) {
  let myLeads = [];

  for (let i = 0; i < leads.length; i++) {
    if (leads[i].properties.hubspot_owner_id) {
      if (leads[i].properties.hubspot_owner_id.value == ownerId) {
        myLeads.push(leads[i]);
      }
    }
  }
  return myLeads;
};
//** filters unassigned tickets and leads from response */
api.filterForUnassigned = function (arrToCheck) {
  let unassignedItems = [];

  for (let i = 0; i < arrToCheck.length; i++) {
    if (!arrToCheck[i].properties.hubspot_owner_id || !arrToCheck[i].properties.hubspot_owner_id.value) {
      unassignedItems.push(arrToCheck[i]);
    }
  }

  return unassignedItems;
}
//** filters tickets by provided daterange */
api.filterTicketsByDateRange = function (tickets, dateRange) {
  let recentTickets = [];
  const timeMin = new Date(dateRange.startDate).valueOf();
  const timeMax = new Date(dateRange.endDate).valueOf();

  for (let i = 0; i < tickets.length; i++) {
    const createTime = tickets[i].properties.createdate.value;
    if (createTime > timeMin && createTime < timeMax) {
      recentTickets.push(tickets[i]);
    }
  }

  return recentTickets;
};

//**maps ticket[] to items */
api.mapTicketsToItems = function (tickets) {
  let items = [];
  for (let i = 0; i < tickets.length; i++) {
    const raw = tickets[i];
    const ticketProps = raw.properties;
    const ticketSubj = ticketProps.subject;
    const ticketContent = ticketProps.content;

    let item = {
      id: raw.objectId.toString(),
      title: ticketSubj == null ? null : ticketSubj.value,
      description: ticketContent == null ? null : ticketContent.value,
      date: new Date(parseInt(ticketProps.createdate.value)).toISOString(),
      link: `https://app.hubspot.com/contacts/${raw.portalId}/ticket/${raw.objectId}`,
      raw: raw
    };
    items.push(item);
  }

  return items;
};

//** paginate items[] based on provided pagination */
api.paginateItems = function (items, pagination) {
  let pagiantedItems = [];
  const pageSize = parseInt(pagination.pageSize);
  const offset = (parseInt(pagination.page) - 1) * pageSize;

  if (offset > items.length) return pagiantedItems;

  for (let i = offset; i < offset + pageSize; i++) {
    if (i >= items.length) {
      break;
    }
    pagiantedItems.push(items[i]);
  }
  return pagiantedItems;
};
module.exports = api;