'use strict';
const api = require('./common/api');

module.exports = async function (activity) {

  try {
    let dateRange = $.dateRange(activity, "today");
    let start = new Date(dateRange.startDate).valueOf();
    let end = new Date(dateRange.endDate).valueOf();

    api.initialize(activity);
    let url = `/contacts/search/v1/external/lifecyclestages?` +
      `fromTimestamp=${start}&toTimestamp=${end}`;
    const response = await api(url);
    if ($.isErrorResponse(activity, response)) return;

    activity.Response.Data = mapResponseToChartData(activity,response);
  } catch (error) {
    $.handleError(activity, error);
  }
};

//** maps response data to data format usable by chart */
function mapResponseToChartData(activity,response) {
  let labels = [];
  let datasets = [];
  let rawData = response.body;
  let data = [];
  for (let i = 0; i < rawData.length; i++) {
    labels.push(rawData[i].lifecycleStage.replace('hs_lifecyclestage_', '').replace('_date', ''));
    data.push(rawData[i].count);
  }
  datasets.push({ label: T(activity,'Number Of Leads'), data });

  let chartData = {
    chart: {
      configuration: {
        data: {},
        options: {
          title: {
            display: true,
            text: T(activity,'Lifecycle Stage Metrics')
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