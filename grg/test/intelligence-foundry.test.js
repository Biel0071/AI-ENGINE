'use strict';
/**
 * FÊNIX OS — Intelligence Foundry Test Suite
 */
(async () => {

let passed = 0; let failed = 0;
function assert(desc, cond) {
  if (cond) { console.log(`  ✅ ${desc}`); passed++; }
  else { console.error(`  ❌ FAIL: ${desc}`); failed++; }
}
function section(name) { console.log(`\n── ${name} ──`); }

// ─── WORLD MODEL ──────────────────────────────────────────────────────────────
section('WorldModel');
const { WorldModel, NODE_TYPES, EDGE_TYPES } = require('../src/world-model/world-model');
const wm = new WorldModel();
wm.upsertNode('proj-1', 'PROJECT', { label: 'FÊNIX OS' });
wm.upsertNode('mod-1', 'MODULE', { label: 'evolution' });
wm.upsertEdge('proj-1', 'mod-1', 'CONTAINS');
assert('upsertNode creates node', wm.getNode('proj-1') !== null);
assert('upsertNode updates props idempotently', (() => { wm.upsertNode('proj-1', 'PROJECT', { label: 'FÊNIX v2' }); return wm.getNode('proj-1').props.label === 'FÊNIX v2'; })());
assert('upsertEdge creates edge', wm.getEdges('proj-1', 'out').length === 1);
assert('neighbors returns connected nodes', wm.neighbors('proj-1', 'CONTAINS').length === 1);
assert('snapshot has stats', wm.snapshot().stats.nodeCount === 2);
assert('changelog is recorded', wm.changelog().length >= 3);
try { wm.upsertNode('x', 'INVALID_TYPE'); assert('rejects invalid type', false); } catch (e) { assert('rejects invalid node type', true); }
try { wm.upsertEdge('a', 'b', 'INVALID'); assert('rejects invalid edge type', false); } catch (e) { assert('rejects invalid edge type', true); }
const snap = wm.snapshot(); wm.removeNode('mod-1'); wm.restore(snap);
assert('restore from snapshot works', wm.getNode('mod-1') !== null);

// ─── AGENT GENOME ─────────────────────────────────────────────────────────────
section('AgentGenome');
const { AgentGenome, AgentGenomeRegistry, mutate, crossover } = require('../src/evolution/agent-genome');
const g1 = new AgentGenome({ identity: { name: 'DevAgent', role: 'developer' }, model: 'qwen2.5:3b', planner: 'sequential', memoryStrategy: 'episodic' });
assert('creates genome with id', !!g1.id);
assert('has correct generation 0', g1.generation === 0);
assert('lineage contains own id', g1.lineage.includes(g1.id));
assert('computeFitness returns null without benchmarks', g1.computeFitness() === null);
g1.recordBenchmark({ domain: 'CODE_GENERATION', score: 0.82, evidence: ['test-01'] });
const fit = g1.computeFitness('CODE_GENERATION');
assert('fitness computed from real benchmark', fit !== null && fit.mean === 0.82);
assert('fitness source is benchmark_history', fit.source === 'benchmark_history');

const g2 = new AgentGenome({ identity: { name: 'QAAgent', role: 'qa' }, model: 'deepseek-r1:1.5b', verificationStrategy: 'adversarial' });
const mutated = mutate(g1, { model: 'deepseek-r1:1.5b', planner: 'parallel' });
assert('mutation creates new genome', mutated.id !== g1.id);
assert('mutation increments generation', mutated.generation === 1);
assert('mutation preserves lineage', mutated.parentGenomes.includes(g1.id));
assert('mutation resets benchmark history', mutated.benchmarkHistory.length === 0);
assert('mutated model changed', mutated.model === 'deepseek-r1:1.5b');

const child = crossover(g1, g2, 'planner_verifier');
assert('crossover creates child', child.id !== g1.id && child.id !== g2.id);
assert('crossover has both parents', child.parentGenomes.includes(g1.id) && child.parentGenomes.includes(g2.id));
assert('crossover inherits verificationStrategy from B', child.verificationStrategy === g2.verificationStrategy);

const reg = new AgentGenomeRegistry();
reg.register(g1); reg.promote(g1.id, 'initial champion');
assert('registry promotes champion', reg.getChampion('developer')?.id === g1.id);
const g1v2 = mutate(g1, { planner: 'dag' }); g1v2.id = g1.id; // simulate version
// lineage preserved after register
reg.register(g1); assert('registry lineage preserved', reg.getLineage(g1.id).length >= 1);

// ─── FITNESS ENGINE ───────────────────────────────────────────────────────────
section('FitnessEngine');
const { FitnessEngine, DOMAINS } = require('../src/evolution/fitness-engine');
const fe = new FitnessEngine();

// Hard gate: security violation → REJECTED immediately
const secViolation = fe.evaluate(DOMAINS.CODE_GENERATION, { securityViolation: true, testPassRate: 1.0 }, {});
assert('hard gate: security violation → REJECTED', secViolation.verdict === 'REJECTED');
assert('hard gate lists violation', secViolation.hardGateViolations.includes('SECURITY_VIOLATION'));

// Valid evaluation
const goodResult = fe.evaluate(DOMAINS.CODE_GENERATION, { testPassRate: 0.95, correctness: 0.90, evidence: ['test-run-1'] }, { agentId: g1.id, agentLineage: g1.lineage });
assert('valid eval → PASS', goodResult.verdict === 'PASS');
assert('score computed', goodResult.scoreData?.score > 0.8);

// UNAVAILABLE for unknown domain
const unavail = fe.evaluate('UNKNOWN_DOMAIN', {}, {});
assert('unknown domain → UNAVAILABLE', unavail.verdict === 'UNAVAILABLE');

// compare before/after
const before = fe.evaluate(DOMAINS.CODE_GENERATION, { testPassRate: 0.60, correctness: 0.65 }, {});
const after = fe.evaluate(DOMAINS.CODE_GENERATION, { testPassRate: 0.85, correctness: 0.90 }, {});
const cmp = fe.compare(before, after);
assert('compare detects improvement', cmp.verdict === 'IMPROVED');
assert('compare calculates positive delta', cmp.delta > 0);

const noDataCmp = fe.compare({ scoreData: null }, { scoreData: null });
assert('compare returns UNDECIDED without data', noDataCmp.verdict === 'UNDECIDED');

// ─── SCIENTIST AGENT ─────────────────────────────────────────────────────────
section('ScientistAgent');
const { ScientistAgent } = require('../src/agents/scientist-agent');
const sci = new ScientistAgent();

// Anti-false-pass: PASS sem score → erro
try { sci.recordExperiment({ strategy: 'A', verdict: 'PASS', score: null }); assert('rejects PASS without score', false); }
catch (e) { assert('rejects PASS without score (anti-false-pass)', true); }

// Valid experiments
for (let i = 0; i < 12; i++) {
  sci.recordExperiment({ strategy: i < 7 ? 'StrategyC' : 'StrategyA', domain: 'CODE_GENERATION', verdict: i < 10 ? 'PASS' : 'FAIL', score: i < 10 ? 0.85 + Math.random() * 0.1 : 0.4, conditions: { complexity: 'HIGH' }, evidence: [`exp-${i}`] });
}
const analysis = sci.analyze('CODE_GENERATION', 5);
assert('analysis completes with enough data', analysis.status === 'COMPLETE');
assert('analysis has insights', analysis.insights.length > 0);
assert('analysis recommends best strategy', analysis.recommendations.length > 0);

const insufficient = sci.analyze('CODE_GENERATION', 100);
assert('insufficient data returns INSUFFICIENT_DATA', insufficient.status === 'INSUFFICIENT_DATA');

const proposal = sci.proposeNextExperiment('CODE_GENERATION');
assert('proposes next experiment', !!proposal.id);

const hyp = sci.recordHypothesis({ statement: 'StrategyC works better in high complexity', conditions: { complexity: 'HIGH' } });
sci.resolveHypothesis(hyp.id, 'CONFIRMED', ['exp-1', 'exp-2']);
assert('hypothesis resolved as CONFIRMED', sci.getHypotheses('CONFIRMED').length === 1);

// ─── ADVERSARIAL ENGINE ───────────────────────────────────────────────────────
section('AdversarialEngine');
const { AdversarialEngine } = require('../src/evolution/adversarial-engine');
const adv = new AdversarialEngine();

// Fitness gaming detection
const gaming = adv.detectFitnessGaming('agent-1', 0.95, 0.55);
assert('detects fitness gaming when gap > 25%', gaming.verdict === 'GAMING_DETECTED');
assert('gaming is CRITICAL severity', gaming.severity === 'CRITICAL');
const clean = adv.detectFitnessGaming('agent-2', 0.85, 0.80);
assert('clean agent not flagged as gaming', clean.verdict === 'CLEAN');

// Consistency check
const consistentExecutor = async () => ({ score: 0.85, durationMs: 5000 });
const consistency = await adv.checkConsistency(consistentExecutor, {}, 3);
assert('consistent executor passes consistency check', consistency.verdict === 'CONSISTENT');

// ─── AUTONOMOUS EVOLUTION KERNEL (AEK) ────────────────────────────────────────
section('AutonomousEvolutionKernel (Anti-Mock)');
const { AutonomousEvolutionKernel } = require('../src/evolution/autonomous-evolution-kernel');
const aek = new AutonomousEvolutionKernel();

// Without context → UNAVAILABLE (not fabricated)
const noCtx = await aek.runLivingModeScan({});
assert('no context → UNAVAILABLE (not fabricated)', noCtx.status === 'UNAVAILABLE');

// With real metrics → real findings
const realCtx = { metrics: { testCoverage: 0.25, avgJobDurationMs: 200_000 }, missionHistory: [{ status: 'FAILED' }, { status: 'FAILED' }, { status: 'SUCCEEDED' }] };
const realScan = await aek.runLivingModeScan(realCtx);
assert('real scan returns COMPLETE', realScan.status === 'COMPLETE');
assert('detects low test coverage', realScan.findings.some(f => f.category === 'QUALITY'));
assert('detects high latency', realScan.findings.some(f => f.category === 'PERFORMANCE'));
assert('detects mission failures', realScan.findings.some(f => f.category === 'RELIABILITY'));
assert('findings have evidence', realScan.findings.every(f => !!f.evidence));
assert('scan count increments', aek.getLastScanInfo().scanCount === 1);

// ─── FÊNIX AIR ────────────────────────────────────────────────────────────────
section('FenixAIR');
const { FenixAIR, AgentCompiler } = require('../src/air/fenix-air');
const air = new FenixAIR();
const missionSrc = `MISSION build_auth {
  REQUIREMENT authentication
  AGENT architect { READ project; ANALYZE architecture; EMIT design }
  AGENT developer { INPUT design; WRITE code; RUN tests }
  AGENT verifier { READ changes; RUN validation; EMIT evidence }
  PROMOTE only_if { tests == PASS; security == PASS; regression == NONE }
}`;
const compiled = air.compile(missionSrc);
assert('compiles mission name', compiled.name === 'build_auth');
assert('compiles 3 agents', compiled.agents.length === 3);
assert('compiles requirements', compiled.requirements.includes('authentication'));
assert('promote conditions parsed', compiled.promoteCondition.conditions.length === 3);
assert('architect emits design', compiled.agents[0].outputs.includes('design'));
assert('developer inputs design', compiled.agents[1].inputs.includes('design'));

const missionSpec = air.toMissionSpec(compiled);
assert('toMissionSpec generates steps', missionSpec.steps.length === 3);
assert('toMissionSpec has title', missionSpec.title.includes('build_auth'));
assert('toMissionSpec source is FENIX_AIR', missionSpec.source === 'FENIX_AIR');

try { air.compile('MISSION {} {}'); assert('rejects malformed AIR', false); }
catch (e) { assert('rejects malformed AIR', true); }

const compiler = new AgentCompiler();
const result = compiler.compile('Build a simple CRUD endpoint');
assert('compiler produces AIR mission', !!result.airMission);
assert('compiler produces mission spec', !!result.missionSpec);
assert('simple goal → SIMPLE complexity', result.complexity === 'SIMPLE');

const complexResult = compiler.compile('Perform a full security audit of the multi-service authentication database migration with regression testing', { domain: 'CODE_GENERATION' });
assert('complex goal uses CODE_PIPELINE', complexResult.topology.pattern === 'CODE_PIPELINE');

// ─── SUMMARY ─────────────────────────────────────────────────────────────────
console.log(`\n${'═'.repeat(50)}`);
console.log(`INTELLIGENCE FOUNDRY TEST SUITE`);
console.log(`Passed: ${passed} | Failed: ${failed} | Total: ${passed + failed}`);
if (failed > 0) { console.error(`\n❌ ${failed} test(s) FAILED`); process.exit(1); }
else { console.log(`\n✅ ALL ${passed} TESTS PASSED`); }
})();
