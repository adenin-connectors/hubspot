'use strict';
const api = require('./common/api');

module.exports = async (activity) => {
  try {
    api.initialize(activity);
    const response = await api('/crm-objects/v1/objects/tickets/paged?properties=hs_ticket_priority');

    if ($.isErrorResponse(activity, response)) return;

    activity.Response.Data = mapResponseToChartData(response);
  } catch (error) {
    $.handleError(activity, error);
  }
};
//** maps response data to data format usable by chart */
function mapResponseToChartData(response) {
  let tickets = response.body.objects;
  let priorities = [];
  let datasets = [];
  let data = [];

  for (let i = 0; i < tickets.length; i++) {
    let priority = tickets[i].properties.hs_ticket_priority ?
      tickets[i].properties.hs_ticket_priority.value : "No Priority";
    if (!priorities.includes(priority)) {
      priorities.push(priority);
    }
  }

  for (let x = 0; x < priorities.length; x++) {
    let counter = 0;
    for (let y = 0; y < tickets.length; y++) {
      let status = tickets[y].properties.hs_ticket_priority ?
        tickets[y].properties.hs_ticket_priority.value : "No Priority";
      if (priorities[x] == status) {
        counter++;
      }
    }
    data.push(counter);
  }
  datasets.push({ label: 'Number Of Tickets', data });

  let chartData = {
    chart: {
      configuration: {
        data: {},
        options: {
          title: {
            display: true,
            text: 'Ticket Metrics By Priority'
          }
        }
      },
      template: 'bar',
      palette: 'office.Office6'
    },
    _settings: {}
  };
  chartData.chart.configuration.data.labels = priorities;
  chartData.chart.configuration.data.datasets = datasets;

  return chartData;
}