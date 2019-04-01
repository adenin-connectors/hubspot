'use strict';

const logger = require('@adenin/cf-logger');
const cfActivity = require('@adenin/cf-activity');

module.exports = async (activity) => {
  try {
    const message = 'This is an empty activity';

    logger.info(message);

    activity.Response.Data = {
      message: message
    };
  } catch (error) {
    cfActivity.handleError(error, activity);
  }
};
