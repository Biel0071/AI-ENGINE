'use strict';

// MISSION-1008 — CONTRATOS DO EXECUTIVE BRAIN.
//
// Este arquivo NÃO executa nada. Define a FORMA das três interfaces da camada de
// orquestração e valida essa forma — como `connectors/connector-contract.js` faz para
// conectores. Zero lógica de decomposição, zero execução de IA. É o esqueleto que a
// implementação (missão futura) vai preencher, entregue agora só para travar o contrato.
//
// A regra que estes contratos codificam: o Executive Brain ORQUESTRA, nunca EXECUTA. Ele
// decompõe um objetivo em missões e DELEGA ao mission-planner existente (que já materializa
// missão → AI Router → Gateway → providers). Nenhum método aqui chama IA. Se um dia um
// contrato ganhar um `invoke`/`complete`, é sinal de que a camada furou seu proprio limite.

// -------- PROGRAM CONTRACT --------
// Um Programa é o agrupamento de missões que servem a UM objetivo estratégico. É estado
// (vive no store), não execução. Estados possíveis, todos derivados do estado das missões
// que ele agrupa — nunca um status escrito à mão.
const PROGRAM_STATES = Object.freeze({
  DRAFT: 'DRAFT',               // decomposto, aguardando aprovação humana
  APPROVED: 'APPROVED',         // humano aprovou; missões podem ser materializadas
  RUNNING: 'RUNNING',           // ao menos uma missão em execução
  BLOCKED: 'BLOCKED',           // uma missão travou; precisa de replanejamento/decisão
  COMPLETED: 'COMPLETED',       // todas as missões concluídas
  CANCELLED: 'CANCELLED',
});

// Campos obrigatórios de um Programa registrado. O `missions` guarda referências (ids), não
// as missões inteiras — o Mission Runtime é a fonte da verdade delas.
const PROGRAM_FIELDS = Object.freeze(['id', 'tenantId', 'objective', 'state', 'missions', 'createdBy', 'createdAt']);

// -------- EXECUTIVE CONTRACT --------
// O que o Executive Brain sabe fazer. Cada método é ORQUESTRAÇÃO; nenhum executa IA.
const EXECUTIVE_METHODS = Object.freeze([
  'decompose',      // objetivo -> lista de missões propostas (via análise, NÃO via execução)
  'createProgram',  // registra o Programa em DRAFT com as missões propostas
  'approve',        // humano aprova; delega materialização ao mission-planner
  'prioritize',     // ordena missões dentro do programa
  'replan',         // uma missão travou -> repropõe (não executa)
  'detectBlocks',   // lê o estado das missões e marca bloqueios
  'progress',       // agrega progresso das missões (derivado, medido)
  'costs',          // agrega custo real das missões (de aiCalls, não estimado)
  'quality',        // agrega qualidade (quando o sinal existir; hoje unknown honesto)
  'requestApproval',// abre pedido de aprovação humana (nunca decide sozinho)
]);

// -------- PLANNER CONTRACT --------
// O que o Executive Brain EXIGE do mission-planner existente. Documenta a dependência: o
// Brain compõe ISTO, não reimplementa. Se o planner mudar de forma, este contrato quebra
// de propósito, avisando.
const PLANNER_REQUIRED = Object.freeze(['plan']); // plan(tenantId, actorId, {objective, ...}) -> {plan, mission}

function assertExecutiveContract(impl) {
  if (!impl || typeof impl !== 'object') throw new Error('executive brain must be an object implementing the contract');
  const missing = EXECUTIVE_METHODS.filter((m) => typeof impl[m] !== 'function');
  if (missing.length) throw new Error(`executive brain is missing methods: ${missing.join(', ')}`);
  // A trava que importa: o Brain NÃO pode expor execução de IA. Se expuser, furou o limite.
  for (const forbidden of ['invoke', 'complete', 'chat']) {
    if (typeof impl[forbidden] === 'function') {
      throw new Error(`executive brain must not execute AI directly (found '${forbidden}'): it orchestrates, the gateway executes`);
    }
  }
  return true;
}

function assertPlannerContract(planner) {
  if (!planner || typeof planner.plan !== 'function') {
    throw new Error('executive brain requires a mission planner exposing plan(tenantId, actorId, input)');
  }
  return true;
}

function assertProgram(program) {
  if (!program || typeof program !== 'object') throw new Error('program must be an object');
  const missing = PROGRAM_FIELDS.filter((f) => program[f] === undefined);
  if (missing.length) throw new Error(`program is missing fields: ${missing.join(', ')}`);
  if (!Object.values(PROGRAM_STATES).includes(program.state)) throw new Error(`invalid program state: ${program.state}`);
  if (!Array.isArray(program.missions)) throw new Error('program.missions must be an array of mission references');
  return true;
}

module.exports = {
  PROGRAM_STATES,
  PROGRAM_FIELDS,
  EXECUTIVE_METHODS,
  PLANNER_REQUIRED,
  assertExecutiveContract,
  assertPlannerContract,
  assertProgram,
};
