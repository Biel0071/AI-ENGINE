const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');

router.get('/api/analytics', analyticsController.getSummary);

module.exports = router;
