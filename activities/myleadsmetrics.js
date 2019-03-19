'use strict';
const cfActivity = require('@adenin/cf-activity');
const api = require('./common/api');

module.exports = async function (activity) {

  try {
    api.initialize(activity);

    let dateRange = cfActivity.dateRange(activity, "today");
    let start = new Date(dateRange.startDate).valueOf();
    let end = new Date(dateRange.endDate).valueOf();

    let url = `https://api.hubapi.com/contacts/search/v1/external/lifecyclestages?` +
      `fromTimestamp=${start}&toTimestamp=${end}`;

    const response = await api(url);

    if (!cfActivity.isResponseOk(activity, response)) {
      return;
    }

    activity.Response.Data = mapResponseToChartData(response);
  } catch (error) {
    cfActivity.handleError(activity, error);
  }
};

//** maps response data to data format usable by chart */
function mapResponseToChartData(response) {
  let labels = [];
  let datasets = [];
  let rawData = response.body;

  for (let i = 0; i < rawData.length; i++) {
    labels.push(rawData[i].lifecycleStage);
    datasets.push({ label: rawData[i].lifecycleStage, data: rawData[i].count });
  }

  let chartData = {
    configuration: {
      data: {},
      options: {
        title: {
          display: true,
          text: 'Lifecycle Stage Metrics'
        }
      }
    },
    template: 'bar',
    palette: 'office.Office6'
  };

  chartData.configuration.data.labels = labels;
  chartData.configuration.data.datasets = datasets;

  return chartData;
}