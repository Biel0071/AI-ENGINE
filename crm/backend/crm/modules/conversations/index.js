const routes = require('../../routes/conversations');
const conversationsController = require('../../controllers/conversationsController');
const conversationRepository = require('../../repositories/conversationRepository');
const conversationSummarizer = require('../../services/conversationSummarizer');

module.exports = {
  name: 'conversations',
  routes,
  controller: conversationsController,
  services: {
    conversationSummarizer,
  },
  repositories: {
    conversationRepository,
  },
};
