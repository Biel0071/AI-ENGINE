const { embed } = require('./embedding-service');
const { search } = require('./qdrant-service');

async function retrieveContext(query) {
  const queryVector = await embed(query);
  return search(queryVector, 5);
}

module.exports = {
  retrieveContext,
};
