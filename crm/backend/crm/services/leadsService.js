const records = [];
let nextId = 1;

function listLeads() {
  return records;
}

function getLeadsById(id) {
  return records.find((item) => item.id === Number(id)) || null;
}

function createLeads(payload = {}) {
  const entity = {
    id: nextId++,
    name: String(payload.name || '').trim() || 'Leads #' + nextId,
    createdAt: new Date().toISOString(),
  };

  records.push(entity);
  return entity;
}

function updateLeads(id, payload = {}) {
  const target = getLeadsById(id);
  if (!target) return null;

  target.name = String(payload.name || target.name).trim() || target.name;
  return target;
}

function removeLeads(id) {
  const index = records.findIndex((item) => item.id === Number(id));
  if (index < 0) return false;

  records.splice(index, 1);
  return true;
}

module.exports = {
  createLeads,
  getLeadsById,
  listLeads,
  removeLeads,
  updateLeads,
};
