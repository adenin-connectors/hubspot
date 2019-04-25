'use strict';
const api = require('./common/api');

module.exports = async (activity) => {
  try {
    api.initialize(activity)
    const response = await api('/contacts/v1/lists/all/contacts/recent?&property=hs_lead_status');

    if ($.isErrorResponse(activity, response)) return;

    var dateRange = $.dateRange(activity, "today");
    let filteredLeads = api.filterLeadsByDateRange(response.body.contacts, dateRange);

    activity.Response.Data = mapResponseToChartData(filteredLeads);
  } catch (error) {
    $.handleError(activity, error);
  }
};
//** maps response data to data format usable by chart */
function mapResponseToChartData(leads) {
  let labels = [];
  let datasets = [];
  let data = [];

  for (let i = 0; i < leads.length; i++) {
    let status = leads[i].properties.hs_lead_status ? leads[i].properties.hs_lead_status.value : "No Status";
    if (!labels.includes(status)) {
      labels.push(status);
    }
  }

  for (let x = 0; x < labels.length; x++) {
    let counter = 0;
    for (let y = 0; y < leads.length; y++) {
      let status = leads[y].properties.hs_lead_status ? leads[y].properties.hs_lead_status.value : "No Status";
      if (labels[x] == status) {
        counter++;
      }
    }
    data.push(counter);
  }
  datasets.push({ label: 'Number Of Leads', data });

  let chartData = {
    chart: {
      configuration: {
        data: {},
        options: {
          title: {
            display: true,
            text: 'Lead Metrics By Status'
          }
        }
      },
      template: 'bar',
      palette: 'office.Office6'
    },
    _settings: {}
  };
  chartData.chart.configuration.data.labels = labels;
  chartData.chart.configuration.data.datasets = datasets;

  return chartData;
}