const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const analysis = require(path.join('..', 'data', 'repository-analysis-2026-07-22.json'));

test('portfolio analysis inventories every Biel0071 repository', () => {
  assert.equal(analysis.owner, 'Biel0071');
  assert.equal(analysis.repositories.length, 10);
  assert.equal(new Set(analysis.repositories.map((repo) => repo.name)).size, 10);
});

test('every repository analysis is pinned to a git revision and evidence', () => {
  for (const repository of analysis.repositories) {
    assert.match(repository.revision, /^[a-f0-9]{40}$/);
    assert.equal(repository.branch, 'main');
    assert.ok(repository.purpose.length > 20);
    assert.ok(repository.evidence.length > 0);
  }
});

test('known product families have measured similarity evidence', () => {
  const commerce = analysis.relationships.find(
    (edge) => edge.from === 'formalize-magic' && edge.to === 'fortlev-quote-master'
  );
  const whatsapp = analysis.relationships.find(
    (edge) => edge.from === 'zapai-final' && edge.to === 'swift-wa-assist'
  );

  assert.ok(commerce.evidence.contentJaccard >= 0.7);
  assert.ok(whatsapp.evidence.contentJaccard >= 0.8);
});
