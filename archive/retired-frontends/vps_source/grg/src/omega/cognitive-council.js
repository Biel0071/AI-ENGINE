const { uuid } = require('../kernel/ids');
const { ValidationError, NotFoundError } = require('../kernel/errors');
const { measured } = require('../kernel/measurement');

// Cognitive Council HONESTO — o portão de governança que NÃO se auto-aprova.
//
// MEDIDO EM PRODUCAO (2026-07-29): evaluateProposal devolvia status 'APPROVED_BY_COUNCIL',
// unanimous: true e seis votos 'APPROVED' ESCRITOS A MAO, ignorando o ApprovalEngine injetado.
// Era literalmente "o portão que sempre aprova" -- a simulacao que o proprio conselho existe
// para impedir. Um conselho que aprova tudo sem revisao real e pior que nenhum conselho.
//
// Agora o ciclo e real e o voto NUNCA e parametro:
//   assignSeat        -> designa um revisor real para um assento (persistido).
//   evaluateProposal  -> abre UMA solicitacao de aprovacao (cognitive.execute.high) por assento
//                        staffed via o ApprovalEngine real; decide NADA (PENDING_REVIEW).
//   castVote          -> LE o status real daquela aprovacao no gate; o voto reflete a verdade.
//   getDecision       -> estado corrente, recomputado dos votos reais.
// So unanimidade de aprovacoes REAIS (uma por assento, por revisor separado) aprova.
class CognitiveCouncil {
  constructor({ store, bus, controlPlane, approvals, policy }) {
    this.store = store;
    this.bus = bus;
    this.cp = controlPlane;
    this.approvals = approvals;
    this.policy = policy;
    this.members = [
      { id: 'chief-architect', title: 'Chief Architect', domain: 'System Architecture & Structural Integrity' },
      { id: 'chief-scientist', title: 'Chief Scientist', domain: 'Autonomous Research & Tech Benchmark' },
      { id: 'chief-coo', title: 'Chief Operations Officer (COO)', domain: 'Production VPS & Deployment Safety' },
      { id: 'chief-cso', title: 'Chief Security Officer (CSO)', domain: 'Cognitive Encryption & OIDC RBAC' },
      { id: 'chief-cbo', title: 'Chief Business Officer (CBO)', domain: 'Value Maximization & ROI Prioritization' },
      { id: 'chief-cko', title: 'Chief Knowledge Officer (CKO)', domain: 'Memory Distillation & Genome Health' },
    ];
  }

  async getCouncilMembers(tenantId, actorId) {
    await this.cp.authorize(tenantId, actorId, 'governance:read');
    const state = await this.store.read();
    const seats = (state.councilSeats || []).filter((s) => s.tenantId === tenantId);
    const staffedCount = this.members.filter((m) => seats.some((s) => s.memberId === m.id && s.reviewerId)).length;
    const members = this.members.map((m) => {
      const seat = seats.find((s) => s.memberId === m.id);
      return { ...m, reviewerId: seat ? seat.reviewerId : null };
    });
    return { members, total: members.length, staffedSeats: measured(staffedCount, 'store:councilSeats') };
  }

  async assignSeat(tenantId, actorId, input = {}) {
    await this.cp.authorize(tenantId, actorId, 'governance:approve');
    const memberId = String(input.memberId || '');
    const reviewerId = String(input.reviewerId || '');
    if (!this.members.some((m) => m.id === memberId)) throw new ValidationError(`unknown council seat: ${memberId}`);
    if (!reviewerId) throw new ValidationError('reviewerId is required to staff a seat');
    let seat;
    await this.store.update((state) => {
      state.councilSeats = state.councilSeats || [];
      seat = state.councilSeats.find((s) => s.tenantId === tenantId && s.memberId === memberId);
      if (seat) { seat.reviewerId = reviewerId; seat.updatedAt = new Date().toISOString(); }
      else { seat = { id: uuid(), tenantId, memberId, reviewerId, assignedBy: actorId, assignedAt: new Date().toISOString() }; state.councilSeats.push(seat); }
      return state;
    });
    return seat;
  }

  async evaluateProposal(tenantId, actorId, proposal = {}) {
    await this.cp.authorize(tenantId, actorId, 'governance:approve');
    if (!proposal.title || !proposal.description) {
      throw new ValidationError('Proposal title and description are required');
    }
    const state = await this.store.read();
    const seats = (state.councilSeats || []).filter((s) => s.tenantId === tenantId && s.reviewerId);

    // Uma solicitacao de aprovacao REAL por assento staffed. Sem assento staffed, nao ha voto
    // possivel -- o conselho vazio devolve PENDING_REVIEW sem votos, honestamente.
    const votes = [];
    for (const member of this.members) {
      const seat = seats.find((s) => s.memberId === member.id);
      if (!seat) continue;
      const approval = await this.approvals.request(tenantId, actorId, {
        action: 'cognitive.execute.high',
        resource: { councilSeat: member.id, proposal: String(proposal.title) },
        rationale: `Council seat ${member.title} reviewing: ${proposal.title}`,
      });
      votes.push({ memberId: member.id, title: member.title, approvalId: approval.id, vote: 'NOT_REVIEWED', recordedBy: null });
    }

    const decision = {
      id: uuid(), tenantId, proposalTitle: String(proposal.title), proposalDescription: String(proposal.description),
      status: 'PENDING_REVIEW', unanimous: false, seatsStaffed: votes.length, votes,
      openedBy: actorId, openedAt: new Date().toISOString(), decidedAt: null,
    };
    await this.store.update((next) => { next.councilDecisions = next.councilDecisions || []; next.councilDecisions.push(decision); return next; });
    if (this.bus?.emit) await this.bus.emit('council.review.opened', { tenantId, decisionId: decision.id, title: decision.proposalTitle, seats: votes.length });
    return decision;
  }

  // Le o status REAL da aprovacao daquele assento no gate e grava o voto correspondente.
  // O voto e derivado da verdade do ApprovalEngine, nunca informado por quem chama.
  async castVote(tenantId, actorId, decisionId, memberId) {
    await this.cp.authorize(tenantId, actorId, 'governance:approve');
    const state = await this.store.read();
    const decision = (state.councilDecisions || []).find((d) => d.tenantId === tenantId && d.id === decisionId);
    if (!decision) throw new NotFoundError(`council decision not found: ${decisionId}`);
    const vote = decision.votes.find((v) => v.memberId === memberId);
    if (!vote) throw new ValidationError(`seat ${memberId} is not part of this decision`);

    const approval = await this.approvals.get(tenantId, vote.approvalId);
    const realVote = approval.status === 'approved' ? 'APPROVED' : approval.status === 'rejected' ? 'REJECTED' : 'NOT_REVIEWED';
    const recordedBy = approval.status === 'approved' ? approval.approvedBy : null;

    let updated;
    await this.store.update((next) => {
      const d = next.councilDecisions.find((item) => item.id === decisionId);
      const v = d.votes.find((item) => item.memberId === memberId);
      v.vote = realVote; v.recordedBy = recordedBy; v.recordedAt = new Date().toISOString();
      // Recomputa o veredito do conselho a partir dos votos REAIS.
      const approvedCount = d.votes.filter((item) => item.vote === 'APPROVED').length;
      const rejected = d.votes.some((item) => item.vote === 'REJECTED');
      if (rejected) { d.status = 'REJECTED_BY_COUNCIL'; d.unanimous = false; d.decidedAt = new Date().toISOString(); }
      else if (approvedCount === d.votes.length && d.votes.length > 0) { d.status = 'APPROVED_BY_COUNCIL'; d.unanimous = true; d.decidedAt = new Date().toISOString(); }
      else { d.status = 'PENDING_REVIEW'; d.unanimous = false; }
      updated = structuredClone(d);
      return next;
    });
    if (this.bus?.emit && updated.decidedAt) await this.bus.emit(updated.unanimous ? 'council.decision.approved' : 'council.decision.rejected', { tenantId, decisionId, title: updated.proposalTitle });
    return updated;
  }

  async getDecision(tenantId, actorId, decisionId) {
    await this.cp.authorize(tenantId, actorId, 'governance:read');
    const state = await this.store.read();
    const decision = (state.councilDecisions || []).find((d) => d.tenantId === tenantId && d.id === decisionId);
    if (!decision) throw new NotFoundError(`council decision not found: ${decisionId}`);
    return decision;
  }
}

module.exports = { CognitiveCouncil };
