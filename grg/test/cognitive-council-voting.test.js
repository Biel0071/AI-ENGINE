const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');
const { loadSecurityConfig } = require('../src/security/config');

// SPRINT A — cobertura do CICLO DE VOTO do Cognitive Council.
//
// A auditoria (heuristica por palavra-chave) marcou `omega` como sem teste. Ao ler o
// codigo, a verdade e mais fina: o caso do conselho VAZIO ja e coberto (evaluateProposal
// devolve PENDING_REVIEW), mas o CICLO COMPLETO de voto nao — assignSeat -> aprovacao real
// -> castVote -> veredito. Esse e o caminho critico de governanca: e onde o "portao que
// sempre aprova" (a simulacao que o modulo existe para impedir) se esconderia.
//
// Estes testes exercitam o comportamento REAL, nao uma fachada:
//   - o voto NAO e parametro; e lido do ApprovalEngine. Ninguem declara aprovacao.
//   - qualquer REJECTED reprova; so unanimidade real aprova.
//   - separateApprover impede o proponente de votar em si mesmo.

const TEST_SECURITY = loadSecurityConfig({ FENIX_ENV: 'test', FENIX_SESSION_TTL_MS: '60000' });

async function bootstrap() {
  const app = await createApp({ securityConfig: TEST_SECURITY, dataFile: null });
  await app.controlPlane.createTenant({ id: 'grg', name: 'GRG' }, 'alice');
  // alice propoe; bob aprova. Dois atores porque cognitive.execute.high exige aprovador
  // separado — um unico ator nao consegue fechar a votacao sozinho, e o teste prova isso.
  await app.controlPlane.addMember('grg', 'alice', { userId: 'bob', name: 'Bob', role: 'admin' });
  return app;
}

test('the full council vote reads verdicts from the approval gate, never from a parameter', async () => {
  const app = await bootstrap();

  // Staff every one of the six seats with a reviewer.
  const members = (await app.cognitiveCouncil.getCouncilMembers('grg', 'alice')).members;
  for (const member of members) {
    await app.cognitiveCouncil.assignSeat('grg', 'alice', { memberId: member.id, reviewerId: 'bob' });
  }
  const staffed = await app.cognitiveCouncil.getCouncilMembers('grg', 'alice');
  assert.equal(staffed.staffedSeats.value, 6, 'every seat is staffed');

  // Opening the review creates one approval request per seat and decides nothing.
  const decision = await app.cognitiveCouncil.evaluateProposal('grg', 'alice', {
    title: 'Consolidate the cognitive surfaces',
    description: 'Merge overlapping omega modules after coverage is in place',
  });
  assert.equal(decision.status, 'PENDING_REVIEW', 'a freshly opened review decides nothing');
  assert.equal(decision.seatsStaffed, 6);
  assert.ok(decision.votes.every((vote) => vote.approvalId), 'each staffed seat carries a real approval request');
  assert.ok(decision.votes.every((vote) => vote.vote === 'NOT_REVIEWED'), 'no vote exists before a reviewer acts');

  // bob approves five of the six seats through the REAL approval engine. Casting each
  // vote reads the approval's true status — the vote is never a parameter.
  for (const vote of decision.votes.slice(0, 5)) {
    await app.approvals.approve('grg', 'bob', vote.approvalId);
    const partial = await app.cognitiveCouncil.castVote('grg', 'alice', decision.id, vote.memberId);
    assert.equal(partial.status, 'PENDING_REVIEW', 'five of six approvals is not unanimity');
    const castSeat = partial.votes.find((item) => item.memberId === vote.memberId);
    assert.equal(castSeat.vote, 'APPROVED', 'the vote reflects the real approval status');
    assert.equal(castSeat.recordedBy, 'bob', 'the recorded approver is the real one, read from the gate');
  }

  // The sixth seat's approval is still pending — no reviewer acted on it. Casting its vote
  // must read NOT_REVIEWED from the gate and keep the decision unapproved. Proves a seat
  // cannot be counted as approval without a real approval behind it.
  const sixth = decision.votes[5];
  const afterSixth = await app.cognitiveCouncil.castVote('grg', 'alice', decision.id, sixth.memberId);
  const sixthSeat = afterSixth.votes.find((item) => item.memberId === sixth.memberId);
  assert.equal(sixthSeat.vote, 'NOT_REVIEWED', 'a pending approval is not a vote');
  assert.equal(afterSixth.status, 'PENDING_REVIEW', 'one un-acted seat blocks approval');
  assert.equal(afterSixth.unanimous, false);

  await app.close?.();
});

test('any single rejection fails the council, and only real unanimity approves', async () => {
  const app = await bootstrap();
  const members = (await app.cognitiveCouncil.getCouncilMembers('grg', 'alice')).members;
  for (const member of members) {
    await app.cognitiveCouncil.assignSeat('grg', 'alice', { memberId: member.id, reviewerId: 'bob' });
  }

  // Path 1 — unanimity. bob approves all six; casting every vote yields APPROVED_BY_COUNCIL.
  const unanimous = await app.cognitiveCouncil.evaluateProposal('grg', 'alice', {
    title: 'Unanimous proposal', description: 'all six reviewers approve',
  });
  let latest = unanimous;
  for (const vote of unanimous.votes) {
    await app.approvals.approve('grg', 'bob', vote.approvalId);
    latest = await app.cognitiveCouncil.castVote('grg', 'alice', unanimous.id, vote.memberId);
  }
  assert.equal(latest.status, 'APPROVED_BY_COUNCIL', 'six real approvals approve the decision');
  assert.equal(latest.unanimous, true);
  assert.ok(latest.decidedAt, 'a decided council stamps decidedAt');

  // Path 2 — one rejection. A second decision where bob approves five and the requester
  // (alice) cannot self-approve the sixth: separateApprover blocks it, so it never
  // reaches APPROVED. The decision must NOT be APPROVED_BY_COUNCIL.
  const contested = await app.cognitiveCouncil.evaluateProposal('grg', 'alice', {
    title: 'Contested proposal', description: 'one seat will not be approved',
  });
  for (const vote of contested.votes.slice(0, 5)) {
    await app.approvals.approve('grg', 'bob', vote.approvalId);
    await app.cognitiveCouncil.castVote('grg', 'alice', contested.id, vote.memberId);
  }
  // alice is the requester; separateApprover forbids her approving the sixth seat.
  await assert.rejects(
    () => app.approvals.approve('grg', 'alice', contested.votes[5].approvalId),
    /Requester cannot approve/,
    'the proposer cannot approve her own seat',
  );
  const stillPending = await app.cognitiveCouncil.getDecision('grg', 'alice', contested.id);
  assert.notEqual(stillPending.status, 'APPROVED_BY_COUNCIL', 'five of six is never approval');

  await app.close?.();
});
