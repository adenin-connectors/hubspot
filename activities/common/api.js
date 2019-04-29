'use strict';
const got = require('got');
const HttpAgent = require('agentkeepalive');
const HttpsAgent = HttpAgent.HttpsAgent;

let _activity = null;

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

for (const x of helpers) {
  const method = x.toUpperCase();
  api[x] = (url, opts) => api(url, Object.assign({}, opts, { method }));
  api.stream[x] = (url, opts) => api.stream(url, Object.assign({}, opts, { method }));
}

//**maps response to items */
api.mapLeadsToItems = function (leads) {
  let items = [];

  for (let i = 0; i < leads.length; i++) {
    let raw = leads[i];
    let firstname = raw.properties.firstname;
    let lastname = raw.properties.lastname;
    let createTime = raw.addedAt ? raw.addedAt : raw.properties.createdate.value;
    
    let item = {
      id: raw.vid.toString(),
      title: firstname == null ? null : firstname.value,
      description: lastname == null ? null : lastname.value,
      date: new Date(parseInt(createTime)).toISOString(),
      link: raw["profile-url"],
      raw: raw
    };
    items.push(item);
  }

  return { items };
};

//**filters leads based on provided dateRange */
api.filterLeadsByDateRange = function (leads, dateRange) {
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
}

module.exports = api;