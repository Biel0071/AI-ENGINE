const analyticsService = require('../services/analyticsService');

function getStore(req) {
  return req.app.locals.store;
}

function getSummary(req, res) {
  try {
    const summary = analyticsService.buildAnalyticsSummary(getStore(req));
    return res.status(200).json(summary);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to load analytics summary.' });
  }
}

module.exports = {
  getSummary,
};
