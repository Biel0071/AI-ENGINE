module.exports = {
  controller: require('../../../controllers/sessionsController'),
  services: {
    sessionManager: require('../../../services/sessionManager'),
    systemManager: require('../../../services/systemManager'),
    runtimeManager: require('../../../services/runtimeManager'),
  },
  repositories: {
    session: require('../../../repositories/sessionRepository'),
  },
};
