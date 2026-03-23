const { createEngine: createOrchestrationEngine } = require('../../interface/interfaces/engineAPI');
const runtime = require('./index');

function createEngine(options = {}) {
  const orchestration = createOrchestrationEngine(options);

  return {
    ...orchestration,
    runCommand: (command, runOptions = {}) => runtime.runCommand(command, runOptions),
    scanProject: (commandOrEntityName, scanOptions = {}) => runtime.scan(commandOrEntityName, scanOptions),
    generateFromPrompt: (command, runOptions = {}) => runtime.generateFromPrompt(command, runOptions),
  };
}

module.exports = {
  createEngine,
};
