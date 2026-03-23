const leadsService = require('../services/leadsService');

function list(req, res) {
  return res.status(200).json(leadsService.listLeads());
}

function getById(req, res) {
  const item = leadsService.getLeadsById(req.params.id);
  if (!item) return res.status(404).json({ error: 'Leads not found.' });
  return res.status(200).json(item);
}

function create(req, res) {
  const created = leadsService.createLeads(req.body || {});
  return res.status(201).json(created);
}

function update(req, res) {
  const updated = leadsService.updateLeads(req.params.id, req.body || {});
  if (!updated) return res.status(404).json({ error: 'Leads not found.' });
  return res.status(200).json(updated);
}

function remove(req, res) {
  const removed = leadsService.removeLeads(req.params.id);
  if (!removed) return res.status(404).json({ error: 'Leads not found.' });
  return res.status(200).json({ success: true });
}

module.exports = {
  create,
  getById,
  list,
  remove,
  update,
};
